"""
scripts/run_scraper.py

Run the full scraper pipeline manually (no Celery needed).

What it does:
  1. Scrapes FSSAI alerts + food safety news sources
  2. Parses each article with LLM → structured violation record
  3. Deduplicates against existing DB
  4. Saves new records to MongoDB
  5. Re-indexes everything into the RAG store

Run from inside backend/:
    python scripts/run_scraper.py
"""

import asyncio
import logging
import sys
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


async def main():
    from app.db.database import _get_database, init_db
    from models.models import FSSAI_VIOLATIONS
    from scrapers.fssai_scraper import scrape_all_sources
    from services.ai_service import extract_fssai_violation
    from services.rag_service import rag

    print("\n🌿 FoodSafe FSSAI Scraper")
    print("=" * 50)

    await init_db()
    database = _get_database()

    # ── Step 1: Scrape ────────────────────────────────────────────────────────
    print("\n📡 Scraping sources...")
    raw_items = await scrape_all_sources()
    print(f"\n   Found {len(raw_items)} raw items across all sources")

    if not raw_items:
        print("\n⚠  No items scraped.")
        return

    # ── Step 2: Load existing records for dedup ───────────────────────────────
    existing = (
        await database[FSSAI_VIOLATIONS].find({}, {"raw_text": 1}).to_list(length=None)
    )
    existing_texts = {d.get("raw_text") for d in existing if d.get("raw_text")}
    print(f"\n📦 Existing DB records: {len(existing)}")

    # ── Step 3: Parse each item with LLM ─────────────────────────────────────
    print(f"\n🤖 Parsing {len(raw_items)} items with LLM...")
    print("   (Each item costs one Gemini API call)\n")

    added = 0
    skipped_dupe = 0
    skipped_parse = 0
    skipped_short = 0
    to_insert = []

    for i, item in enumerate(raw_items, 1):
        raw = item.get("raw_text", "").strip()
        source = item.get("source", "unknown")

        if len(raw) < 40:
            skipped_short += 1
            continue

        if raw in existing_texts:
            skipped_dupe += 1
            continue

        await asyncio.sleep(1.5)

        try:
            parsed = extract_fssai_violation(raw)
        except Exception as e:
            logger.debug("LLM parse error: %s", e)
            skipped_parse += 1
            continue

        if not isinstance(parsed, dict):
            skipped_parse += 1
            continue

        if parsed.get("error") or not parsed.get("product"):
            skipped_parse += 1
            continue

        date_str = parsed.get("date")
        record_date = None
        if date_str:
            try:
                record_date = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                pass
        if not record_date:
            record_date = datetime.utcnow()

        to_insert.append(
            {
                "id": str(uuid.uuid4()),
                "brand": parsed.get("brand") or "Unknown",
                "product": parsed.get("product"),
                "violation": parsed.get("adulterant")
                or parsed.get("violation_type")
                or raw[:300],
                "state": parsed.get("state") or "Unknown",
                "date": record_date,
                "source_url": item.get("source_url", ""),
                "raw_text": raw,
                "created_at": datetime.utcnow(),
            }
        )
        existing_texts.add(raw)
        added += 1

        product_name = (parsed.get("product") or "?")[:30]
        state_name = (parsed.get("state") or "?")[:15]
        print(f"   [{i:03d}] ✅ {product_name:<32} {state_name:<18} [{source}]")

    if to_insert:
        await database[FSSAI_VIOLATIONS].insert_many(to_insert)

    # ── Step 4: Re-index into RAG ─────────────────────────────────────────────
    print(f"\n🔍 Re-indexing RAG store...")
    all_violations = await database[FSSAI_VIOLATIONS].find({}).to_list(length=None)

    indexed = 0
    for v in all_violations:
        doc = f"{v.get('product', '')} {v.get('brand') or ''} {v.get('violation') or ''} {v.get('state') or ''} {v.get('raw_text') or ''}"
        meta = {
            "brand": v.get("brand") or "",
            "product": v.get("product") or "",
            "violation": (v.get("violation") or "")[:500],
            "state": v.get("state") or "",
            "date": str(v["date"].date()) if v.get("date") else "",
            "source_url": v.get("source_url") or "",
        }
        try:
            await rag.index_violation(
                str(v.get("id") or v.get("_id")), doc.strip(), meta
            )
            indexed += 1
        except Exception as e:
            logger.warning("RAG index failed: %s", e)

    print(f"\n{'=' * 50}")
    print(f"✅ Scraper run complete\n")
    print(f"   Raw items scraped   : {len(raw_items)}")
    print(f"   New records added   : {added}")
    print(f"   Skipped (duplicate) : {skipped_dupe}")
    print(f"   Skipped (too short) : {skipped_short}")
    print(f"   Skipped (parse fail): {skipped_parse}")
    print(f"   Total in DB         : {len(all_violations)}")
    print(f"   Total in RAG index  : {indexed}")


if __name__ == "__main__":
    asyncio.run(main())
