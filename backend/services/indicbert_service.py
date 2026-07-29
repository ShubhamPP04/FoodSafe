"""
backend/services/indicbert_service.py

Gemini-powered replacement for MuRIL/IndicBERT.
Provides the same public API:
  1. classify_intent(text)     → "food_scan" | "symptom_report" | "brand_query" | "general"
  2. normalize_food_name(text) → English food name (resolves Hindi/English input)
  3. get_food_adulteration_risk(food_name) → "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

No torch, transformers, or sentencepiece required.
"""

import json
import logging
import os
import re

import httpx

logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
_BASE     = os.path.join(os.path.dirname(__file__), "..", "..", "ml")
_MAP_PATH = os.path.join(_BASE, "food_name_mapping.json")
_CAT_PATH = os.path.join(_BASE, "food_categories.json")

# ── Gemini ─────────────────────────────────────────────────────────────────────
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"


def _gemini_settings() -> tuple[str, str]:
    from app.core.config import settings
    return settings.GEMINI_API_KEY, settings.GEMINI_MODEL


def _gemini(system: str, user: str, max_tokens: int = 20) -> str:
    """Call Gemini and return raw text. Returns '' on error."""
    try:
        api_key, model = _gemini_settings()
        resp = httpx.post(
            GEMINI_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
                "temperature": 0.0,
                "max_tokens": max_tokens,
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning("Gemini call failed: %s", e)
        return ""


# ── Food name mapping (tiny JSON, load once) ───────────────────────────────────
_food_map: dict = {}
_map_loaded = False


def _load_map() -> None:
    global _food_map, _map_loaded
    if _map_loaded:
        return
    try:
        with open(_MAP_PATH, encoding="utf-8") as f:
            _food_map = json.load(f)
        logger.info("Loaded %d food name mappings", len(_food_map))
    except FileNotFoundError:
        logger.warning("food_name_mapping.json not found")
    _map_loaded = True


# ── Keyword fallback for intent ────────────────────────────────────────────────
_SYMPTOM_KW = [
    "symptom", "pain", "sick", "diarrhea", "vomit", "nausea", "headache",
    "दर्द", "उल्टी", "दस्त", "बीमार", "लक्षण", "पेट दर्द",
    "दुखणे", "उलटी", "जुलाब", "आजार", "लक्षणे",
]
_BRAND_KW = [
    "brand", "safe", "buy", "recommend", "which", "best", "certified",
    "ब्रांड", "सुरक्षित", "कौन", "कौनसा", "खरीदें",
    "ब्रँड", "कोणता",
]


def _keyword_intent(text: str) -> str | None:
    t = text.lower()
    if any(kw in t for kw in _SYMPTOM_KW):
        return "symptom_report"
    if any(kw in t for kw in _BRAND_KW):
        return "brand_query"
    return None


# ── Public API ─────────────────────────────────────────────────────────────────

def classify_intent(text: str) -> str:
    """
    Classify user intent via keyword rules first, then Gemini for ambiguous cases.
    Returns: "food_scan" | "symptom_report" | "brand_query" | "general"
    """
    kw = _keyword_intent(text)
    if kw:
        return kw

    system = (
        "Classify the user's message intent. "
        "Reply with ONLY one word: food_scan, symptom_report, brand_query, or general."
    )
    raw = _gemini(system, f'Message: "{text[:200]}"', max_tokens=10).lower()

    for label in ("food_scan", "symptom_report", "brand_query", "general"):
        if label in raw:
            return label

    return "food_scan"


def normalize_food_name(text: str) -> str:
    """
    Resolve Hindi/English food names to English.
    Uses food_name_mapping.json first, then Gemini as fallback.
    """
    _load_map()
    text = text.strip()

    if text in _food_map:
        return _food_map[text]

    for k, v in _food_map.items():
        if k.lower() == text.lower():
            return v

    for k, v in _food_map.items():
        if k in text:
            return v

    # Devanagari / Gujarati — ask Gemini
    if re.search(r"[\u0900-\u097F\u0A00-\u0A7F]", text):
        system = (
            "You are a food name translator. "
            "Translate the given Indian language food name to its English equivalent. "
            "Reply with ONLY the English food name, nothing else."
        )
        result = _gemini(system, f'Food name: "{text}"', max_tokens=15)
        if result:
            return result

    return text


def get_food_adulteration_risk(food_name: str) -> str:
    try:
        with open(_CAT_PATH) as f:
            cats = json.load(f)
        risk_map = cats.get("adulteration_risk", {})
        key = food_name.lower().replace(" ", "_")
        return risk_map.get(key, risk_map.get(food_name.lower(), "MEDIUM"))
    except Exception:
        return "MEDIUM"