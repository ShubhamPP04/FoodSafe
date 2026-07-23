"""
seed_delhi.py — generate realistic Delhi community adulteration reports via
Gemini and store them in MongoDB Atlas.
"""
import asyncio, os, sys, json, random, uuid
from datetime import datetime, timedelta
import httpx

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
if not GEMINI_API_KEY:
    print("GEMINI_API_KEY not found"); sys.exit(1)

async def gemini_json(client, prompt, label):
    resp = await client.post(
        GEMINI_URL,
        headers={"Authorization": f"Bearer {GEMINI_API_KEY}"},
        json={
            "model": GEMINI_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.8,
            "max_tokens": 6000,
        },
    )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"].strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"): raw = raw[4:]
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"JSON error [{label}]: {e}")
        print(f"Raw: {raw[:400]}")
        return None

async def seed():
    client = httpx.AsyncClient(timeout=90)
    print("Step 1: Asking Gemini for Delhi adulteration hotspot plan...\n")
    plan = await gemini_json(client, """You are a food safety expert for Delhi NCT India with knowledge of FSSAI reports and documented adulteration cases. Return a JSON array of 8 real Delhi localities/areas with documented food adulteration issues. For each locality pick the most commonly adulterated food item actually reported there. Respond ONLY with a valid JSON array. No markdown no backticks no explanation. Each object must have exactly: "city": string, "food": string, "lat": number (real latitude), "lng": number (real longitude), "count": number (between 5 and 35), "adulteration_type": string. Return exactly 8 localities.""", "plan")
    if not plan:
        print("Failed to generate plan"); sys.exit(1)
    print(f"Got plan for {len(plan)} localities:\n")
    for p in plan:
        print(f"  {p['city']:15} -> {p['food']:20} ({p['count']} reports)")
    print()

    sys.path.insert(0, os.path.dirname(__file__))
    from app.db.database import _get_database, init_db
    from models.models import COMMUNITY_REPORTS
    await init_db()
    database = _get_database()

    existing = await database[COMMUNITY_REPORTS].count_documents({})
    print(f"Existing reports in DB: {existing}\n")

    total_added = 0
    now = datetime.utcnow()
    for target in plan:
        city = target["city"]; food = target["food"]; count = int(target["count"])
        lat = float(target["lat"]); lng = float(target["lng"])
        adtype = target.get("adulteration_type", "adulteration")
        print(f"Generating {count} reports for {food} in {city} ({adtype})")
        reports = await gemini_json(client, f"""You are generating realistic community food adulteration reports for a safety app in India. Locality: {city}, Delhi. Food: {food}. Adulteration method: {adtype}. Generate exactly {count} unique realistic reports real citizens might submit. Respond ONLY with a valid JSON array. No markdown no backticks no explanation. Each object must have exactly: "description": string (1-2 sentences realistic citizen report), "brand": string (realistic Indian brand or Unbranded or Local vendor). Generate exactly {count} objects.""", f"{city}/{food}")
        if not reports:
            print(f"  Skipping {city}/{food}\n"); continue

        docs = []
        for item in reports[:count]:
            docs.append({
                "id":          str(uuid.uuid4()),
                "food_name":   food,
                "brand":       item.get("brand", "Unbranded"),
                "city":        city,
                "state":       "Delhi",
                "description": item.get("description", "Adulteration suspected."),
                "lat":         lat + random.uniform(-0.06, 0.06),
                "lng":         lng + random.uniform(-0.06, 0.06),
                "upvotes":     random.randint(0, 12),
                "verified":    False,
                "created_at":  now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23), minutes=random.randint(0, 59)),
            })
            total_added += 1
        if docs:
            await database[COMMUNITY_REPORTS].insert_many(docs)
        print(f"  Added {len(docs)} reports\n")

    await client.aclose()
    print(f"Done! Inserted {total_added} total reports.")

if __name__ == "__main__":
    asyncio.run(seed())
