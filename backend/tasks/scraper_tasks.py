"""
tasks/scraper_tasks.py

Celery task: scrape all food safety sources, parse with LLM,
save to MongoDB, and re-index into the RAG store.

Runs automatically every Monday at 6am IST via Celery beat.
"""
from tasks import celery_app


@celery_app.task(name="tasks.scraper_tasks.run_fssai_scraper", bind=True, max_retries=2)
def run_fssai_scraper(self):
    """
    Full pipeline:
      1. Scrape FSSAI + news sources
      2. LLM-parse each raw article into structured violation
      3. Dedup against existing DB records
      4. Save new records to MongoDB
      5. Re-index entire collection into RAG store
    """
    import asyncio
    import logging
    import uuid
    from datetime import datetime

    from scrapers.fssai_scraper import scrape_all_sources
    from services.ai_service import extract_fssai_violation
    from services.rag_service import rag
    from app.db.database import _get_database
    from models.models import FSSAI_VIOLATIONS

    logger = logging.getLogger(__name__)

    async def _run() -> str:
        logger.info("Starting scraper run...")
        raw_items = await scrape_all_sources()
        logger.info("Scraped %d raw items", len(raw_items))

        if not raw_items:
            return "No items scraped — check source availability"

        database = _get_database()

        # ── 2. Load existing dedup keys from DB ───────────────────────────────
        existing = await database[FSSAI_VIOLATIONS].find({}, {"raw_text": 1}).to_list(length=None)
        existing_texts = {d.get("raw_text") for d in existing if d.get("raw_text")}

        # ── 3. Parse + save new records ───────────────────────────────────────
        added = 0
        skipped_dupe = 0
        skipped_parse = 0
        to_insert = []

        for item in raw_items:
            raw = item.get("raw_text", "").strip()
            if not raw or len(raw) < 30:
                skipped_parse += 1
                continue

            if raw in existing_texts:
                skipped_dupe += 1
                continue

            try:
                parsed = extract_fssai_violation(raw)
            except Exception as e:
                logger.warning("LLM parse failed: %s", e)
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
                    record_date = datetime.utcnow()
            else:
                record_date = datetime.utcnow()

            to_insert.append({
                "id":         str(uuid.uuid4()),
                "brand":      parsed.get("brand") or "Unknown",
                "product":    parsed.get("product"),
                "violation":  parsed.get("adulterant") or parsed.get("violation_type") or raw[:300],
                "state":      parsed.get("state") or "Unknown",
                "date":       record_date,
                "source_url": item.get("source_url", ""),
                "raw_text":   raw,
                "created_at": datetime.utcnow(),
            })
            existing_texts.add(raw)
            added += 1

        if to_insert:
            await database[FSSAI_VIOLATIONS].insert_many(to_insert)
        logger.info("Saved %d new records (skipped: %d dupes, %d parse fails)",
                    added, skipped_dupe, skipped_parse)

        # ── 4. Re-index everything into RAG ──────────────────────────────────
        all_violations = await database[FSSAI_VIOLATIONS].find({}).to_list(length=None)

        indexed = 0
        for v in all_violations:
            try:
                doc = f"{v.get('product', '')} {v.get('brand') or ''} {v.get('violation') or ''} {v.get('state') or ''} {v.get('raw_text') or ''}"
                meta = {
                    "brand":      v.get("brand") or "",
                    "product":    v.get("product") or "",
                    "violation":  (v.get("violation") or "")[:500],
                    "state":      v.get("state") or "",
                    "date":       str(v["date"].date()) if v.get("date") else "",
                    "source_url": v.get("source_url") or "",
                }
                rag.index_violation(str(v.get("id") or v.get("_id")), doc.strip(), meta)
                indexed += 1
            except Exception as e:
                logger.warning("RAG index failed: %s", e)

        summary = (
            f"Scraped {len(raw_items)} items | "
            f"Added {added} new records | "
            f"RAG index: {indexed} total"
        )
        logger.info(summary)
        return summary

    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error("Scraper task failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)
