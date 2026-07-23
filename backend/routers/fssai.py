from fastapi import APIRouter, Depends
from datetime import datetime
import logging

from app.db.database import get_db, MongoSession
from models.models import FSSAI_VIOLATIONS, SCAN_RECORDS
from services.ai_service import _call_gemini

router = APIRouter()
logger = logging.getLogger(__name__)


async def _ai_fssai_alerts() -> list:
    """Generate current FSSAI-style alerts via Gemini asynchronously."""
    system = "You are an Indian food safety expert. Respond ONLY with valid JSON, no markdown."
    user = """List the 6 most recent and significant food adulteration alerts in India.
Base on real FSSAI violation patterns for the current season.

Return ONLY this JSON:
{
  "alerts": [
    {
      "title": "concise alert title",
      "date": "Month Year",
      "severity": "HIGH|MEDIUM|LOW",
      "state": "state name",
      "brand": "brand name or null",
      "product": "product name"
    }
  ]
}"""
    try:
        result = await _call_gemini(system, user, max_tokens=800)
        return result.get("alerts", [])
    except Exception:
        return []


@router.get("/alerts")
async def get_alerts(db: MongoSession = Depends(get_db)):
    """Fetch alerts from database or generate them via AI if the DB is empty."""
    violations = await db.find(
        FSSAI_VIOLATIONS, {},
        sort=[("created_at", -1)],
        limit=50,
    )

    if violations:
        alerts = [
            {
                "title":    (v.get("violation") or v.get("product") or "")[:100],
                "date":     v["date"].strftime("%b %Y") if v.get("date") else "Recent",
                "severity": "HIGH" if any(
                    w in (v.get("violation") or "").lower()
                    for w in ["lead", "pesticide", "carcinogen", "unsafe", "sudan", "argemone"]
                ) else "MEDIUM",
                "state":   v.get("state"),
                "brand":   v.get("brand"),
                "product": v.get("product"),
            }
            for v in violations
        ]
    else:
        alerts = await _ai_fssai_alerts()

    return {"alerts": alerts}


# ── Violations (with Mongo-side filtering + pagination) ───────────────────────
@router.get("/violations")
async def get_violations(
    state:   str = "",
    product: str = "",
    limit:   int = 50,
    offset:  int = 0,
    db: MongoSession = Depends(get_db),
):
    query: dict = {}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if product:
        query["product"] = {"$regex": product, "$options": "i"}

    violations = await db.find(
        FSSAI_VIOLATIONS,
        query,
        sort=[("date", -1)],
        limit=min(limit, 200),
        skip=offset,
    )
    data = [
        {
            "id":         v.get("id"),
            "brand":      v.get("brand"),
            "product":    v.get("product"),
            "violation":  v.get("violation"),
            "state":      v.get("state"),
            "date":       v["date"].isoformat() if v.get("date") else None,
            "source_url": v.get("source_url"),
        }
        for v in violations
    ]
    return {"violations": data, "count": len(data), "offset": offset}
