from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
import re

from app.db.database import get_db, MongoSession
from models.models import SCAN_RECORDS

router = APIRouter()


def _ilike_regex(value: str) -> dict:
    """MongoDB case-insensitive substring match (equivalent to SQLAlchemy ilike)."""
    return {"$regex": re.escape(value), "$options": "i"}


@router.get("/similar-users/{food_name}")
async def similar_user_flags(
    food_name: str,
    city: str = None,
    db: MongoSession = Depends(get_db)
):
    """
    Collaborative filtering:
    'Users like you in Rohini flagged this brand X% of the time'
    """
    base_q: dict = {"food_name": _ilike_regex(food_name)}
    if city:
        base_q["city"] = city

    total = await db.count(SCAN_RECORDS, base_q)

    risk_q = {**base_q, "risk_level": {"$in": ["HIGH", "CRITICAL"]}}
    risky  = await db.count(SCAN_RECORDS, risk_q)

    flag_rate = round((risky / total) * 100) if total > 0 else 0

    # Top cities flagging this food
    city_rows = await db.aggregate(SCAN_RECORDS, [
        {"$match": {**risk_q, "city": {"$ne": None}}},
        {"$group": {"_id": "$city", "cnt": {"$sum": 1}}},
        {"$sort": {"cnt": -1}},
        {"$limit": 3},
    ])
    top_cities = [{"city": r["_id"], "count": r["cnt"]} for r in city_rows]

    # What else do users who flagged this food also flag?
    # Step 1: find user_ids who flagged this food as high risk.
    flagger_docs = await db.find(SCAN_RECORDS, risk_q, projection={"user_id": 1})
    flagger_ids = [d.get("user_id") for d in flagger_docs if d.get("user_id")]
    if flagger_ids:
        also_rows = await db.aggregate(SCAN_RECORDS, [
            {"$match": {
                "user_id": {"$in": flagger_ids},
                "food_name": {"$not": _ilike_regex(food_name)},
                "risk_level": {"$in": ["HIGH", "CRITICAL"]},
            }},
            {"$group": {"_id": "$food_name", "cnt": {"$sum": 1}}},
            {"$sort": {"cnt": -1}},
            {"$limit": 5},
        ])
        also_flagged = [r["_id"] for r in also_rows]
    else:
        also_flagged = []

    return {
        "food_name": food_name,
        "city": city,
        "total_scans": total,
        "flagged_count": risky,
        "flag_rate_percent": flag_rate,
        "message": f"{flag_rate}% of users" + (f" in {city}" if city else "") + f" flagged {food_name} as high risk",
        "top_cities": top_cities,
        "also_flagged": also_flagged
    }


@router.get("/trending-risks")
async def trending_risks(city: str = None, db: MongoSession = Depends(get_db)):
    """Top 5 most flagged foods in the last 30 days"""
    cutoff = datetime.utcnow() - timedelta(days=30)
    match_q: dict = {
        "risk_level": {"$in": ["HIGH", "CRITICAL"]},
        "created_at": {"$gte": cutoff},
    }
    if city:
        match_q["city"] = city

    rows = await db.aggregate(SCAN_RECORDS, [
        {"$match": match_q},
        {"$group": {"_id": "$food_name", "cnt": {"$sum": 1}}},
        {"$sort": {"cnt": -1}},
        {"$limit": 5},
    ])

    return {
        "city": city or "all",
        "trending": [{"food": r["_id"], "flag_count": r["cnt"]} for r in rows]
    }
