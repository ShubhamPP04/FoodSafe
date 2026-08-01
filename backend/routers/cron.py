"""
backend/routers/cron.py

Cron job endpoints for Vercel serverless. Each runs the task body synchronously.
Protect with CRON_SECRET env var — Vercel Cron sends Authorization: Bearer <secret>.
"""

import logging
import uuid
import random
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.db.database import _get_database, init_db
from models.models import COMMUNITY_REPORTS

router = APIRouter()
logger = logging.getLogger(__name__)


def _verify_cron(request: Request) -> None:
    secret = settings.CRON_SECRET
    if not secret:
        return
    auth = request.headers.get("authorization", "")
    if auth != f"Bearer {secret}":
        raise HTTPException(401, "Unauthorized")


# Delhi NCR areas with real coordinates
DELHI_AREAS = [
    {"city": "Rohini", "lat": 28.7325, "lng": 77.0875},
    {"city": "Karol Bagh", "lat": 28.6519, "lng": 77.1909},
    {"city": "Lajpat Nagar", "lat": 28.5677, "lng": 77.2447},
    {"city": "Chandni Chowk", "lat": 28.6500, "lng": 77.2333},
    {"city": "Saket", "lat": 28.5245, "lng": 77.2068},
    {"city": "Dwarka", "lat": 28.5921, "lng": 77.0460},
    {"city": "Pitampura", "lat": 28.6969, "lng": 77.1324},
    {"city": "Mayur Vihar", "lat": 28.6094, "lng": 77.2920},
    {"city": "Vasant Kunj", "lat": 28.5197, "lng": 77.1570},
    {"city": "Noida", "lat": 28.5355, "lng": 77.3910},
    {"city": "Connaught Place", "lat": 28.6315, "lng": 77.2167},
    {"city": "Janakpuri", "lat": 28.6219, "lng": 77.0878},
]

FOODS = [
    "Milk", "Turmeric", "Honey", "Mustard Oil", "Paneer",
    "Spices", "Ghee", "Sweets", "Dal", "Atta",
]

ADULTERATION_TYPES = {
    "Milk": "synthetic milk / detergent adulteration",
    "Turmeric": "lead chromate or metanil yellow coloring",
    "Honey": "HFCS / sugar syrup adulteration",
    "Mustard Oil": "argemone oil mixing",
    "Paneer": "starch adulteration in paneer",
    "Spices": "pesticide residue or synthetic dyes",
    "Ghee": "vegetable fat / vanaspati mixing",
    "Sweets": "lead chromate in colored sweets",
    "Dal": "metanil yellow coloring",
    "Atta": "refined flour mixing or stones",
}


async def _gemini_json(client, prompt, label):
    """Call Gemini to generate JSON data."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    try:
        resp = await client.post(url, json={
            "contents": [{"parts": [{"text": prompt}]}],
        }, timeout=30)
        resp.raise_for_status()
        raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return __import__("json").loads(raw.strip())
    except Exception as e:
        logger.warning(f"Gemini JSON failed [{label}]: {e}")
        return None


@router.get("/scraper")
async def cron_scraper(request: Request):
    """Weekly FSSAI + news scraper."""
    _verify_cron(request)
    from tasks.scraper_tasks import run_fssai_scraper
    try:
        result = run_fssai_scraper.run()
    except Exception as e:
        logger.exception("Cron scraper failed")
        raise HTTPException(500, str(e))
    return {"ok": True, "result": result}


@router.get("/retrain")
async def cron_retrain(request: Request):
    """Weekly community risk weight retraining."""
    _verify_cron(request)
    from tasks.ml_tasks import retrain_risk_model
    try:
        result = retrain_risk_model.run()
    except Exception as e:
        logger.exception("Cron retrain failed")
        raise HTTPException(500, str(e))
    return {"ok": True, "result": result}


@router.get("/digest")
async def cron_digest(request: Request):
    """Weekly overconsumption digest."""
    _verify_cron(request)
    from tasks.digest_tasks import send_weekly_digest
    try:
        result = send_weekly_digest.run()
    except Exception as e:
        logger.exception("Cron digest failed")
        raise HTTPException(500, str(e))
    return {"ok": True, "result": result}


@router.get("/seed-daily")
async def cron_seed_daily(request: Request):
    """Daily Delhi NCR community report generation via Gemini.

    Generates fresh, realistic adulteration reports for Delhi areas and
    inserts them into MongoDB so the risk map always has current data.
    Runs daily via Vercel Cron.
    """
    _verify_cron(request)

    if not settings.GEMINI_API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY not configured")

    await init_db()
    database = _get_database()

    # Pick 6-8 random Delhi areas to generate reports for today
    today_areas = random.sample(DELHI_AREAS, k=min(8, len(DELHI_AREAS)))
    now = datetime.utcnow()

    # Generate report data via Gemini
    async with httpx.AsyncClient(timeout=60) as client:
        area_summaries = ", ".join([a["city"] for a in today_areas])
        prompt = f"""You are a food safety expert for Delhi NCR India. Generate realistic community food adulteration reports for today ({now.strftime('%Y-%m-%d')}). You MUST use ONLY these exact city/area names as the "city" field: {area_summaries}. Do NOT use "Delhi NCR" or "Delhi" as the city — always use the specific area name from the list. For each area, pick the most commonly adulterated food and generate 3-8 realistic citizen reports. Respond ONLY with a valid JSON array. No markdown, no backticks. Each object must have exactly: "city": string (must be one of: {area_summaries}), "food_name": string, "description": string (1-2 sentence realistic citizen report), "brand": string (realistic Indian brand or "Unbranded" or "Local vendor"). Return between 20 and 40 objects total."""

        reports = await _gemini_json(client, prompt, "daily-seed")

    # Post-process: map any unknown city names to known Delhi areas
    valid_cities = {a["city"] for a in DELHI_AREAS}
    area_list = [a["city"] for a in DELHI_AREAS]
    for r in reports or []:
        if r.get("city") not in valid_cities:
            r["city"] = random.choice(area_list)

    if not reports:
        # Fallback: generate synthetic reports without Gemini
        reports = []
        for area in today_areas:
            food = random.choice(FOODS)
            count = random.randint(3, 8)
            adtype = ADULTERATION_TYPES.get(food, "adulteration suspected")
            for _ in range(count):
                reports.append({
                    "city": area["city"],
                    "food_name": food,
                    "brand": random.choice(["Unbranded", "Local vendor", "Local brand"]),
                    "description": f"Suspected {adtype} in {food.lower()} purchased from local market.",
                })

    # Insert into DB with coordinates
    coords_map = {a["city"]: (a["lat"], a["lng"]) for a in DELHI_AREAS}
    docs = []
    for item in reports:
        city = item.get("city", "Delhi")
        lat, lng = coords_map.get(city, (28.6139, 77.2090))
        docs.append({
            "id": str(uuid.uuid4()),
            "food_name": item.get("food_name", "Unknown"),
            "brand": item.get("brand", "Unbranded"),
            "city": city,
            "state": "Delhi",
            "description": item.get("description", "Adulteration suspected."),
            "lat": lat + random.uniform(-0.03, 0.03),
            "lng": lng + random.uniform(-0.03, 0.03),
            "upvotes": random.randint(0, 8),
            "verified": False,
            "created_at": now - timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59)),
        })

    if docs:
        await database[COMMUNITY_REPORTS].insert_many(docs)

    return {"ok": True, "inserted": len(docs), "areas": list(set(d["city"] for d in docs))}
