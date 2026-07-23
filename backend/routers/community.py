from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from app.db.database import get_db, MongoSession
from app.core.config import settings
from models.models import User, user_from_doc, USERS, COMMUNITY_REPORTS

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def get_required_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    MongoSession = Depends(get_db),
) -> User:
    """Returns the authenticated User or raises 401."""
    if not creds:
        raise HTTPException(401, "Authentication required")
    try:
        from routers.users import decode_token
        user_id = decode_token(creds.credentials)
        user = user_from_doc(await db.find_one(USERS, {"id": user_id}))
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


# ── Schemas ───────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    food_name:   str
    city:        str
    description: str
    brand:       Optional[str]   = None
    state:       Optional[str]   = "Delhi"
    lat:         Optional[float] = None
    lng:         Optional[float] = None

class UpvoteRequest(BaseModel):
    report_id: str


def _risk_from_count(count: int) -> str:
    if count >= 30: return "CRITICAL"
    if count >= 20: return "HIGH"
    if count >= 10: return "MEDIUM"
    return "LOW"


# ── Get reports (public) ──────────────────────────────────────────────────────
@router.get("/reports")
async def get_reports(
    city:  str = "",
    state: str = "",
    food:  str = "",
    limit: int = 50,
    db:    MongoSession = Depends(get_db),
):
    query: dict = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if food:
        query["food_name"] = {"$regex": food, "$options": "i"}

    reports = await db.find(
        COMMUNITY_REPORTS,
        query,
        sort=[("created_at", -1)],
        limit=min(limit, 200),
    )
    data = [
        {
            "id":          r.get("id"),
            "food_name":   r.get("food_name"),
            "brand":       r.get("brand"),
            "city":        r.get("city"),
            "state":       r.get("state"),
            "description": r.get("description"),
            "verified":    r.get("verified", False),
            "upvotes":     r.get("upvotes", 0),
            "lat":         r.get("lat"),
            "lng":         r.get("lng"),
            "created_at":  r["created_at"].isoformat() if r.get("created_at") else None,
        }
        for r in reports
    ]
    return {"reports": data, "total": len(data)}


# ── Submit report (requires auth) ─────────────────────────────────────────────
@router.post("/report")
async def submit_report(
    req:  ReportCreate,
    db:   MongoSession = Depends(get_db),
    user: User         = Depends(get_required_user),
):
    if not req.food_name.strip():
        raise HTTPException(400, "food_name is required")
    if not req.city.strip():
        raise HTTPException(400, "city is required")

    await db.insert(COMMUNITY_REPORTS, {
        "food_name":   req.food_name.strip(),
        "brand":       req.brand,
        "city":        req.city.strip(),
        "state":       req.state or "Delhi",
        "description": req.description.strip(),
        "verified":    False,
        "upvotes":     0,
        "lat":         req.lat,
        "lng":         req.lng,
    })

    # Auto-alert: push notification when food hits 10+ reports in a city
    try:
        count = await db.count(COMMUNITY_REPORTS, {
            "food_name": req.food_name.strip(),
            "city":      req.city.strip(),
        })
        if count >= 10 and count % 5 == 0:
            from routers.push import _subscriptions
            if _subscriptions:
                try:
                    from pywebpush import webpush
                    import json as _json
                    payload = _json.dumps({
                        "title": f"⚠️ {req.food_name} Alert — {req.city}",
                        "body":  f"{count} adulteration reports for {req.food_name} in {req.city}. Be cautious!",
                        "url":   "/map",
                        "icon":  "/pwa-192.png",
                    })
                    private_key = settings.VAPID_PRIVATE_KEY if hasattr(settings, 'VAPID_PRIVATE_KEY') else None
                    vapid_email = getattr(settings, 'VAPID_EMAIL', 'mailto:admin@foodsafe.app')
                    if private_key:
                        for sub in _subscriptions[:]:
                            try:
                                webpush(
                                    subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
                                    data=payload,
                                    vapid_private_key=private_key,
                                    vapid_claims={"sub": vapid_email},
                                )
                            except Exception:
                                pass
                except Exception:
                    pass
    except Exception:
        pass

    return {"success": True, "message": "Report submitted successfully"}


# ── Upvote report (requires auth) ─────────────────────────────────────────────
@router.post("/upvote")
async def upvote_report(
    req:  UpvoteRequest,
    db:   MongoSession = Depends(get_db),
    user: User         = Depends(get_required_user),
):
    report = await db.find_one(COMMUNITY_REPORTS, {"id": req.report_id})
    if not report:
        raise HTTPException(404, "Report not found")
    new_upvotes = (report.get("upvotes") or 0) + 1
    await db.update_one(COMMUNITY_REPORTS, {"id": req.report_id}, {"$set": {"upvotes": new_upvotes}})
    return {"success": True, "upvotes": new_upvotes}


# ── City risk summary (public) ────────────────────────────────────────────────
@router.get("/city-risk")
async def city_risk(db: MongoSession = Depends(get_db)):
    rows = await db.aggregate(COMMUNITY_REPORTS, [
        {"$group": {
            "_id": "$city",
            "reports": {"$sum": 1},
            "lat": {"$avg": "$lat"},
            "lng": {"$avg": "$lng"},
        }},
        {"$sort": {"reports": -1}},
    ])

    # Top food per city
    food_rows = await db.aggregate(COMMUNITY_REPORTS, [
        {"$group": {
            "_id": {"city": "$city", "food": "$food_name"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"count": -1}},
    ])
    top_food: dict = {}
    for row in food_rows:
        key = (row["_id"] or {}).get("city")
        if key and key not in top_food:
            top_food[key] = (row["_id"] or {}).get("food", "Various")

    cities = [
        {
            "city":    r["_id"],
            "reports": r.get("reports", 0),
            "lat":     r.get("lat"),
            "lng":     r.get("lng"),
            "risk":    _risk_from_count(r.get("reports", 0)),
            "topFood": top_food.get(r["_id"], "Various"),
        }
        for r in rows
        if r.get("_id")
    ]
    return {"cities": cities, "total": len(cities)}


# ── Seed sample reports (dev only) ────────────────────────────────────────────
@router.post("/seed")
async def seed_reports(
    db:   MongoSession = Depends(get_db),
    user: User         = Depends(get_required_user),
):
    if settings.APP_ENV != "development":
        raise HTTPException(403, "Seed endpoint is disabled in production")

    samples = [
        {"food_name": "Turmeric Powder", "brand": "Local brand", "city": "Karol Bagh",
         "state": "Delhi", "description": "Found yellow synthetic color, tasted bitter.",
         "lat": 28.6519, "lng": 77.1909, "verified": False, "upvotes": 0},
        {"food_name": "Buffalo Milk",    "brand": "Unbranded",   "city": "Dwarka",
         "state": "Delhi", "description": "Milk appeared watery, detergent smell noticed.",
         "lat": 28.5921, "lng": 77.0460, "verified": False, "upvotes": 0},
        {"food_name": "Honey",           "brand": "Local honey", "city": "Connaught Place",
         "state": "Delhi", "description": "Crystallized very quickly, tastes like sugar syrup.",
         "lat": 28.6315, "lng": 77.2167, "verified": False, "upvotes": 0},
        {"food_name": "Paneer",          "brand": "Local dairy", "city": "Rohini",
         "state": "Delhi", "description": "Rubbery texture, did not melt on heating.",
         "lat": 28.7041, "lng": 77.1025, "verified": False, "upvotes": 0},
        {"food_name": "Mustard Oil",     "brand": "Unbranded",   "city": "Saket",
         "state": "Delhi", "description": "Unusual bitter taste, stomach cramps after use.",
         "lat": 28.5245, "lng": 77.2066, "verified": False, "upvotes": 0},
    ]
    await db.insert_many(COMMUNITY_REPORTS, samples)
    return {"success": True, "seeded": len(samples)}
