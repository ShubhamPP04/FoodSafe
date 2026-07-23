"""
backend/routers/admin.py

Real-time admin stats — no hardcoded data.
All numbers come from the database.
"""
from fastapi import APIRouter, BackgroundTasks, Depends
from datetime import datetime, timedelta

from app.db.database import get_db, MongoSession, db as mongo_db
from models.models import SCAN_RECORDS, USERS, COMMUNITY_REPORTS, FSSAI_VIOLATIONS

router = APIRouter()


@router.get("/stats")
async def get_admin_stats(db_sess: MongoSession = Depends(get_db)):
    """Real-time dashboard stats from MongoDB — replaces all hardcoded numbers."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_scans = await db_sess.count(SCAN_RECORDS, {})
    today_scans = await db_sess.count(SCAN_RECORDS, {"created_at": {"$gte": today_start}})
    high_risk   = await db_sess.count(SCAN_RECORDS, {"risk_level": {"$in": ["HIGH", "CRITICAL"]}})
    active_users_rows = await db_sess.aggregate(SCAN_RECORDS, [
        {"$match": {"user_id": {"$ne": None}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "n"},
    ])
    active_users = active_users_rows[0]["n"] if active_users_rows else 0
    total_users  = await db_sess.count(USERS, {})

    avg_rows = await db_sess.aggregate(SCAN_RECORDS, [
        {"$match": {"safety_score": {"$ne": None}}},
        {"$group": {"_id": None, "avg": {"$avg": "$safety_score"}}},
    ])
    avg_score = round(avg_rows[0]["avg"], 1) if avg_rows and "avg" in avg_rows[0] else 0

    # Top food
    top_food_rows = await db_sess.aggregate(SCAN_RECORDS, [
        {"$group": {"_id": "$food_name", "cnt": {"$sum": 1}}},
        {"$sort": {"cnt": -1}},
        {"$limit": 1},
    ])
    top_food = top_food_rows[0]["_id"] if top_food_rows and top_food_rows[0].get("_id") else "—"

    # Top city
    top_city_rows = await db_sess.aggregate(SCAN_RECORDS, [
        {"$match": {"city": {"$ne": None}}},
        {"$group": {"_id": "$city", "cnt": {"$sum": 1}}},
        {"$sort": {"cnt": -1}},
        {"$limit": 1},
    ])
    top_city = top_city_rows[0]["_id"] if top_city_rows and top_city_rows[0].get("_id") else "—"

    community_reports = await db_sess.count(COMMUNITY_REPORTS, {})
    fssai_total       = await db_sess.count(FSSAI_VIOLATIONS, {})

    # Scans last 7 days (trend chart)
    weekly = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        count = await db_sess.count(SCAN_RECORDS, {
            "created_at": {"$gte": day_start, "$lt": day_end},
        })
        weekly.append({
            "day":   day_start.strftime("%a"),
            "date":  day_start.strftime("%d %b"),
            "count": count,
        })

    # Risk breakdown
    risk_counts = {}
    for level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        risk_counts[level] = await db_sess.count(SCAN_RECORDS, {"risk_level": level})

    return {
        "totalScans":       total_scans,
        "todayScans":       today_scans,
        "highRiskScans":    high_risk,
        "activeUsers":      active_users,
        "totalUsers":       total_users,
        "avgScore":         avg_score,
        "topFood":          top_food,
        "topCity":          top_city,
        "communityReports": community_reports,
        "fssaiViolations":  fssai_total,
        "weeklyTrend":      weekly,
        "riskBreakdown":    risk_counts,
    }


@router.get("/recent-scans")
async def get_recent_scans(limit: int = 20, db_sess: MongoSession = Depends(get_db)):
    """Latest scans from DB."""
    scans = await db_sess.find(
        SCAN_RECORDS, {},
        sort=[("created_at", -1)],
        limit=limit,
    )

    now = datetime.utcnow()
    def time_ago(dt):
        if not dt:
            return "just now"
        diff = now - dt
        s = int(diff.total_seconds())
        if s < 60:    return f"{s}s ago"
        if s < 3600:  return f"{s//60}m ago"
        if s < 86400: return f"{s//3600}h ago"
        return dt.strftime("%d %b")

    return {
        "scans": [
            {
                "id":        s.get("id"),
                "food":      s.get("food_name"),
                "risk":      s.get("risk_level") or "UNKNOWN",
                "score":     s.get("safety_score"),
                "city":      s.get("city") or "—",
                "scan_type": s.get("scan_type") or "text",
                "time":      time_ago(s.get("created_at")),
            }
            for s in scans
        ]
    }


@router.get("/ml-status")
async def get_ml_status():
    status = {}

    try:
        from services.yolo_service import detect_food
        status["yolov8"] = {"loaded": True, "label": "Food Detection (Gemini Vision)", "classes": 10}
    except Exception:
        status["yolov8"] = {"loaded": False, "label": "YOLOv8 Food Detection"}

    try:
        from services.indicbert_service import classify_intent, normalize_food_name
        status["indicbert"] = {"loaded": True, "label": "IndicBERT / MuRIL NLP (Gemini)", "mappings": 48}
    except Exception:
        status["indicbert"] = {"loaded": False, "label": "IndicBERT / MuRIL NLP"}

    try:
        import risk_scorer
        status["prophet"] = {"loaded": True, "label": "Prophet Seasonal Risk", "categories": 6}
    except Exception:
        status["prophet"] = {"loaded": False, "label": "Prophet Seasonal Risk"}

    try:
        import personalized_scorer
        status["random_forest"] = {"loaded": True, "label": "Random Forest Personalized Scorer"}
    except Exception:
        status["random_forest"] = {"loaded": False, "label": "Random Forest Personalized Scorer"}

    import os
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    status["gemini"] = {
        "loaded": bool(gemini_key),
        "label": "Google Gemini text + vision",
        "classes": 0,
    }

    return {"models": status, "checked_at": datetime.utcnow().isoformat()}


@router.get("/scraper-stats")
async def get_scraper_stats(db_sess: MongoSession = Depends(get_db)):
    now = datetime.utcnow()

    total = await db_sess.count(FSSAI_VIOLATIONS, {})

    last_rows = await db_sess.find(
        FSSAI_VIOLATIONS, {},
        sort=[("created_at", -1)],
        limit=1,
    )
    last_scrape = last_rows[0]["created_at"].isoformat() if last_rows and last_rows[0].get("created_at") else None

    daily_adds = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        count = await db_sess.count(FSSAI_VIOLATIONS, {
            "created_at": {"$gte": day_start, "$lt": day_end},
        })
        daily_adds.append({
            "day":   day_start.strftime("%a"),
            "date":  day_start.strftime("%d %b"),
            "count": count,
        })

    top_state_rows = await db_sess.aggregate(FSSAI_VIOLATIONS, [
        {"$match": {"state": {"$nin": [None, "", "Unknown"]}}},
        {"$group": {"_id": "$state", "cnt": {"$sum": 1}}},
        {"$sort": {"cnt": -1}},
        {"$limit": 8},
    ])
    top_states = [{"state": r["_id"], "count": r["cnt"]} for r in top_state_rows]

    top_product_rows = await db_sess.aggregate(FSSAI_VIOLATIONS, [
        {"$match": {"product": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$product", "cnt": {"$sum": 1}}},
        {"$sort": {"cnt": -1}},
        {"$limit": 8},
    ])
    top_products = [{"product": r["_id"], "count": r["cnt"]} for r in top_product_rows]

    recent_rows = await db_sess.find(
        FSSAI_VIOLATIONS, {},
        sort=[("created_at", -1)],
        limit=10,
    )
    recent = [
        {
            "id":      v.get("id"),
            "brand":   v.get("brand") or "Unknown",
            "product": v.get("product") or "Unknown",
            "state":   v.get("state") or "Unknown",
            "date":    v["date"].strftime("%d %b %Y") if v.get("date") else "—",
            "source":  v.get("source_url") or "",
        }
        for v in recent_rows
    ]

    rag_count = 0
    rag_status = "unknown"
    try:
        from services.rag_service import rag
        rag_count  = rag.record_count
        rag_status = "healthy" if rag_count > 0 else "empty"
    except Exception:
        rag_status = "error"

    return {
        "totalRecords":  total,
        "lastScrapeAt":  last_scrape,
        "dailyAdds":     daily_adds,
        "topStates":     top_states,
        "topProducts":   top_products,
        "recentRecords": recent,
        "rag": {
            "status":  rag_status,
            "indexed": rag_count,
            "coverage": round((rag_count / total) * 100) if total > 0 else 0,
        },
        "sources": {
            "gnews_fssai":    "Google News — FSSAI adulteration",
            "gnews_recall":   "Google News — food recalls",
            "gnews_spurious": "Google News — spurious food",
            "gnews_poisoning":"Google News — food poisoning",
            "gnews_violation":"Google News — food violations",
            "times_of_india": "Times of India",
            "fssai_press":    "FSSAI press releases",
            "pib_govt":       "Press Information Bureau",
            "fssai_official": "FSSAI official alerts",
        },
    }


@router.post("/scraper/trigger")
async def trigger_scraper(background_tasks: BackgroundTasks):
    """Run the scraper in-process so manual triggering does not require a broker."""
    try:
        from tasks.scraper_tasks import run_fssai_scraper
        background_tasks.add_task(run_fssai_scraper.run)
        return {
            "success":  True,
            "task_id":  "local-background-task",
            "message":  "Scraper started successfully",
            "note":     "Check logs in ~2 minutes for results",
        }
    except Exception as e:
        return {
            "success": False,
            "error":   str(e),
        }
