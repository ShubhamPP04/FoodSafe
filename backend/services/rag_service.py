"""
services/rag_service.py

FSSAI RAG layer — Gemini-powered retrieval, backed by MongoDB Atlas.

Strategy:
  1. Violations are indexed into the `rag_index` MongoDB collection
     (document text + metadata), so the index survives restarts/redeploys
     and works on serverless platforms with an ephemeral/read-only
     filesystem (e.g. Vercel).
  2. retrieve() does a fast keyword pre-filter (Mongo regex query, bounded
     candidate set) then scores candidates in Python.
  3. Gemini reranks the candidates and picks the most relevant ones.
  4. Falls back gracefully to empty list on any error.
"""

from __future__ import annotations

import json
import logging
import re

import httpx

logger = logging.getLogger(__name__)

RAG_COLLECTION = "rag_index"

# ── Gemini settings ───────────────────────────────────────────────────────────
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

MAX_CANDIDATES = 20  # candidates sent to Gemini for reranking
TOP_K = 5  # top results returned after reranking
DB_FETCH_LIMIT = 500  # bound on docs pulled from Mongo before local scoring


def _gemini_settings() -> tuple[str, str]:
    from app.core.config import settings

    return settings.GEMINI_API_KEY, settings.GEMINI_MODEL


# ── Keyword pre-filter ────────────────────────────────────────────────────────


def _keyword_score(query: str, document: str) -> int:
    q_tokens = set(re.sub(r"[^a-z0-9 ]", " ", query.lower()).split())
    d_lower = document.lower()
    return sum(1 for t in q_tokens if t and t in d_lower)


async def _keyword_candidates(
    food_name: str, limit: int = MAX_CANDIDATES
) -> list[dict]:
    from app.db.database import _get_database

    tokens = [t for t in re.sub(r"[^a-z0-9 ]", " ", food_name.lower()).split() if t]
    if not tokens:
        return []

    database = _get_database()
    mongo_query = {
        "$or": [{"document": {"$regex": re.escape(t), "$options": "i"}} for t in tokens]
    }
    cursor = (
        database[RAG_COLLECTION]
        .find(mongo_query, {"document": 1, "metadata": 1})
        .limit(DB_FETCH_LIMIT)
    )
    docs = await cursor.to_list(length=DB_FETCH_LIMIT)

    scored = []
    for d in docs:
        document = d.get("document", "")
        score = _keyword_score(food_name, document)
        if score > 0:
            scored.append((score, str(d["_id"]), document, d.get("metadata", {})))
    scored.sort(key=lambda x: x[0], reverse=True)

    return [
        {"id": vid, "document": document, "metadata": metadata}
        for _, vid, document, metadata in scored[:limit]
    ]


# ── Gemini reranker ───────────────────────────────────────────────────────────


async def _gemini_rerank(
    food_name: str, candidates: list[dict], top_k: int = TOP_K
) -> list[dict]:
    if not candidates:
        return []

    numbered = "\n".join(
        f"[{i}] {c['document'][:300]}" for i, c in enumerate(candidates)
    )
    system = (
        "You are a food safety retrieval assistant. "
        "Given a food query and a numbered list of FSSAI violation records, "
        "return ONLY a JSON array of the indices (0-based integers) of the top "
        f"{top_k} most relevant records, ordered by relevance. "
        "Example: [2, 0, 5]. No other text."
    )
    user = f'Food query: "{food_name}"\n\nViolation records:\n{numbered}'

    indices: list[int] = []
    try:
        api_key, model = _gemini_settings()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                GEMINI_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.0,
                    "max_tokens": 80,
                },
            )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        match = re.search(r"\[.*?\]", raw, re.S)
        parsed = json.loads(match.group()) if match else []
        indices = [i for i in parsed if isinstance(i, int) and 0 <= i < len(candidates)]
    except Exception as e:
        logger.warning("RAG: Gemini rerank failed (%s) — using keyword order", e)
        indices = list(range(min(top_k, len(candidates))))

    results = []
    for rank, idx in enumerate(indices[:top_k]):
        c = candidates[idx]
        meta = c["metadata"]
        results.append(
            {
                "text": c["document"],
                "brand": meta.get("brand") or None,
                "product": meta.get("product") or "Unknown product",
                "state": meta.get("state") or None,
                "date": meta.get("date") or None,
                "source_url": meta.get("source_url") or None,
                "relevance": round(1.0 - rank * (0.5 / max(top_k - 1, 1)), 3),
            }
        )
    return results


# ── Public API ────────────────────────────────────────────────────────────────


class FSSAIRagService:
    async def index_violation(
        self, violation_id: str, document: str, metadata: dict
    ) -> None:
        from app.db.database import _get_database

        clean_meta = {k: (v if v is not None else "") for k, v in metadata.items()}
        database = _get_database()
        await database[RAG_COLLECTION].update_one(
            {"_id": str(violation_id)},
            {"$set": {"document": document, "metadata": clean_meta}},
            upsert=True,
        )

    async def delete_violation(self, violation_id: str) -> None:
        from app.db.database import _get_database

        database = _get_database()
        await database[RAG_COLLECTION].delete_one({"_id": str(violation_id)})

    async def retrieve(
        self,
        food_name: str,
        n_results: int = TOP_K,
        min_relevance: float = 0.30,
    ) -> list[dict]:
        candidates = await _keyword_candidates(food_name)
        if not candidates:
            return []
        ranked = await _gemini_rerank(food_name, candidates, top_k=n_results)
        filtered = [r for r in ranked if r["relevance"] >= min_relevance]
        logger.info(
            "RAG: %d/%d records kept for '%s'",
            len(filtered),
            len(candidates),
            food_name,
        )
        return filtered

    def format_context(self, records: list[dict]) -> str:
        if not records:
            return ""
        lines = [
            "=== VERIFIED FSSAI VIOLATION RECORDS (use to ground your analysis) ==="
        ]
        for i, r in enumerate(records, 1):
            parts = [f"[{i}]", f"Product: {r['product']}"]
            if r["brand"]:
                parts.append(f"Brand: {r['brand']}")
            if r["state"]:
                parts.append(f"State: {r['state']}")
            if r["date"]:
                parts.append(f"Date: {r['date']}")
            lines.append(" | ".join(parts))
            lines.append(f"    Violation: {r['text'][:400]}")
            if r["source_url"]:
                lines.append(f"    Source: {r['source_url']}")
        lines.append("=== END FSSAI RECORDS ===")
        return "\n".join(lines)

    def format_citations(self, records: list[dict]) -> list[dict]:
        return [
            {
                "product": r["product"],
                "brand": r["brand"],
                "state": r["state"],
                "date": r["date"],
                "source": r["source_url"],
                "relevance": r["relevance"],
            }
            for r in records
        ]

    async def count(self) -> int:
        from app.db.database import _get_database

        database = _get_database()
        return await database[RAG_COLLECTION].count_documents({})


rag = FSSAIRagService()
