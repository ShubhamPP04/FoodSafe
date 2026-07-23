from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import re

from services.ai_service import analyze_symptoms
from app.db.database import get_db, MongoSession
from models.models import COMMUNITY_REPORTS, FSSAI_VIOLATIONS, SAFE_BRANDS, SCAN_RECORDS


def _ilike_regex(value: str) -> dict:
    return {"$regex": re.escape(value), "$options": "i"}


# ────────────────────────────────────── symptoms
symptoms_router = APIRouter()

class SymptomRequest(BaseModel):
    symptoms: str
    recent_foods: Optional[list[str]] = []
    lang: str = "en"

@symptoms_router.post("/analyze")
async def symptom_analyze(req: SymptomRequest):
    if not req.symptoms.strip():
        raise HTTPException(400, "symptoms required")
    return await analyze_symptoms(req.symptoms, req.recent_foods or [])


# ────────────────────────────────────── community
community_router = APIRouter()

class ReportRequest(BaseModel):
    food_name: str
    brand: Optional[str] = None
    city: str
    state: Optional[str] = "Delhi"
    description: str
    lat: Optional[float] = None
    lng: Optional[float] = None

@community_router.get("/reports")
async def get_reports(city: str = "", db: MongoSession = Depends(get_db)):
    query: dict = {}
    if city:
        query["city"] = _ilike_regex(city)
    reports = await db.find(
        COMMUNITY_REPORTS,
        query,
        sort=[("created_at", -1)],
        limit=50,
    )
    return [{
        "id":          r.get("id"),
        "food_name":   r.get("food_name"),
        "brand":       r.get("brand"),
        "city":        r.get("city"),
        "description": r.get("description"),
        "upvotes":     r.get("upvotes", 0),
        "verified":    r.get("verified", False),
        "lat":         r.get("lat"),
        "lng":         r.get("lng"),
        "created_at":  str(r.get("created_at")) if r.get("created_at") else None,
    } for r in reports]

@community_router.post("/report")
async def submit_report(req: ReportRequest, db: MongoSession = Depends(get_db)):
    await db.insert(COMMUNITY_REPORTS, {
        **req.model_dump(),
        "verified": False,
        "upvotes":  0,
    })
    return {"message": "Report submitted successfully"}

@community_router.post("/report/{report_id}/upvote")
async def upvote_report(report_id: str, db: MongoSession = Depends(get_db)):
    report = await db.find_one(COMMUNITY_REPORTS, {"id": report_id})
    if not report:
        raise HTTPException(404, "Report not found")
    new_upvotes = (report.get("upvotes") or 0) + 1
    await db.update_one(COMMUNITY_REPORTS, {"id": report_id}, {"$set": {"upvotes": new_upvotes}})
    return {"upvotes": new_upvotes}


# ────────────────────────────────────── brands
brands_router = APIRouter()

@brands_router.get("/safe")
async def get_safe_brands(food: str, db: MongoSession = Depends(get_db)):
    brands = await db.find(
        SAFE_BRANDS,
        {"food_category": _ilike_regex(food)},
        sort=[("safety_score", -1)],
        limit=5,
    )
    return [{
        "id":            b.get("id"),
        "brand_name":    b.get("brand_name"),
        "food_category": b.get("food_category"),
        "safety_score":  b.get("safety_score"),
        "fssai_license": b.get("fssai_license"),
        "verified":      b.get("verified", False),
        "price_range":   b.get("price_range"),
    } for b in brands]


# ────────────────────────────────────── fssai
fssai_router = APIRouter()

@fssai_router.get("/alerts")
async def get_fssai_alerts(db: MongoSession = Depends(get_db)):
    violations = await db.find(
        FSSAI_VIOLATIONS, {},
        sort=[("date", -1)],
        limit=10,
    )
    return [{
        "id":        v.get("id"),
        "brand":     v.get("brand"),
        "product":   v.get("product"),
        "violation": v.get("violation"),
        "state":     v.get("state"),
        "date":      str(v.get("date")) if v.get("date") else None,
    } for v in violations]


# ────────────────────────────────────── users
users_router = APIRouter()

@users_router.get("/{user_id}/stats")
async def get_user_stats(user_id: str, db: MongoSession = Depends(get_db)):
    total = await db.count(SCAN_RECORDS, {"user_id": user_id})
    high_risk = await db.count(SCAN_RECORDS, {
        "user_id": user_id,
        "risk_level": {"$in": ["HIGH", "CRITICAL"]},
    })
    avg_rows = await db.aggregate(SCAN_RECORDS, [
        {"$match": {"user_id": user_id, "safety_score": {"$ne": None}}},
        {"$group": {"_id": None, "avg": {"$avg": "$safety_score"}}},
    ])
    avg_score = round(avg_rows[0]["avg"], 1) if avg_rows and "avg" in avg_rows[0] else 0
    return {
        "total_scans":      total,
        "high_risk_count":  high_risk,
        "avg_safety_score": avg_score,
    }
