"""
scripts/build_fssai_index.py

Indexes all fssai_violations documents from MongoDB into the flat JSON store
used by rag_service.py.

Run from the backend/ directory:
    python scripts/build_fssai_index.py

Safe to re-run — it upserts, so existing records are refreshed.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import _get_database, init_db
from models.models import FSSAI_VIOLATIONS
from services.rag_service import rag


def _build_document(v: dict) -> str:
    parts = [v.get("product") or "", v.get("brand") or "", v.get("violation") or "",
             v.get("raw_text") or "", v.get("state") or ""]
    return " ".join(p.strip() for p in parts if p.strip())


def _build_metadata(v: dict) -> dict:
    return {
        "brand":      v.get("brand") or "",
        "product":    v.get("product") or "",
        "violation":  (v.get("violation") or "")[:500],
        "state":      v.get("state") or "",
        "date":       str(v["date"].date()) if v.get("date") else "",
        "source_url": v.get("source_url") or "",
    }


async def build_index() -> None:
    print("🔍 Connecting to MongoDB...")
    await init_db()
    database = _get_database()
    violations = await database[FSSAI_VIOLATIONS].find({}).to_list(length=None)

    if not violations:
        print(
            "⚠  No fssai_violations documents found.\n"
            "   Run the FSSAI scraper first:\n"
            "   python backend/scraper.py"
        )
        return

    print(f"📦 Indexing {len(violations)} FSSAI violation records into JSON store...")
    indexed = skipped = 0

    for v in violations:
        doc = _build_document(v)
        if not doc.strip():
            skipped += 1
            continue
        rag.index_violation(str(v.get("id") or v.get("_id")), doc, _build_metadata(v))
        indexed += 1
        if indexed % 50 == 0:
            print(f"   ... {indexed}/{len(violations)}")

    print(
        f"\n✅ Done.\n"
        f"   Indexed : {indexed}\n"
        f"   Skipped : {skipped} (empty records)\n"
        f"   Total in store: {rag.record_count}\n"
        f"   Location: backend/data/fssai_violations.json"
    )


if __name__ == "__main__":
    asyncio.run(build_index())
