"""
routers/brands.py  — v2

Key changes from v1:
  - Gemini enrichment and category generation run asynchronously.
    wrapped in asyncio.to_thread().
  - TTL cache on GET /brands/all:
      • categories list cached for 1 hour (rarely changes)
      • per-food brand lists cached for 30 minutes
    This prevents repeated frontend polling from hammering Gemini on
    every page load.
  - asyncio.gather is used for parallel OFF fetch + Gemini brand generation
    on search queries, but now both coroutines are truly async.
"""

import asyncio
import logging

import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Literal

from services.ai_service import _call_gemini, _cache_get, _cache_set

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (Devanagari)",
}
router = APIRouter()

# Cache TTLs (seconds)
_TTL_CATEGORIES = 3600   # 1 hour
_TTL_BRANDS     = 1800   # 30 minutes


# ── Open Food Facts lookup ────────────────────────────────────────────────────

async def fetch_off_brands(food_query: str) -> list:
    """Fetch real brand data from Open Food Facts API for Indian market."""
    try:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            "search_terms": food_query,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 30,
            "countries_tags": "india",
            "fields": "product_name,brands,nutriscore_grade,labels_tags,categories_tags,quantity,stores",
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, params=params)
            data = r.json()

        brands_seen = set()
        results = []
        for p in data.get("products", []):
            brand = (p.get("brands") or "").split(",")[0].strip()
            name  = p.get("product_name", "").strip()
            if not brand or brand in brands_seen or len(brand) > 60:
                continue
            brands_seen.add(brand)
            nutri  = p.get("nutriscore_grade", "")
            labels = p.get("labels_tags", [])
            fssai  = any("fssai" in l.lower() for l in labels)
            results.append({
                "food":   food_query.title(),
                "brand":  brand,
                "name":   name,
                "nutri":  nutri.upper() if nutri else "N/A",
                "fssai":  fssai,
                "source": "openfoodfacts",
            })
            if len(results) >= 10:
                break
        return results
    except Exception:
        return []


# ── Gemini: enrich brand list with safety scores ──────────────────────────────

async def enrich_brands_with_gemini(food: str, brand_names: list, lang: str = "en") -> list:
    """Ask Gemini to score and explain brands for Indian food safety context."""
    if not brand_names:
        return []

    cache_key = f"enrich:{lang}:{food.lower()}:{','.join(sorted(brand_names)).lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    brands_str = ", ".join(brand_names)
    language = LANGUAGE_NAMES.get(lang, LANGUAGE_NAMES["en"])
    system = (
        "You are an Indian food safety expert with deep knowledge of FSSAI regulations, "
        "CSE lab studies, adulteration patterns, and documented brand quality issues in India. "
        "Respond ONLY with valid JSON. No markdown, no extra text."
    )
    user = f"""For the food category "{food}", evaluate these brands available in India: {brands_str}

For EACH brand return real, documented safety data. Use actual FSSAI reports, CSE studies, lab findings.
If a brand has known issues (e.g. CSE 2020 honey study, EU export recalls, Delhi FSSAI surveys), mention them.
For unbranded/local options, reflect the actual adulteration risk documented in government surveys.

Return ONLY this JSON:
{{
  "brands": [
    {{
      "food": "{food}",
      "brand": "exact brand name",
      "score": <integer 20-95 based on actual safety record>,
      "price": "<realistic Indian market price range e.g. ₹80-120/100g>",
      "fssai": <true if FSSAI licensed, false otherwise>,
      "why": "<2 sentences: cite specific lab findings, FSSAI history, or adulteration reports for this exact brand>"
    }}
  ]
}}

Rules:
- Scores must differ realistically — a brand with documented issues scores lower
- Price must be current Indian retail price in ₹
- If you have no specific data for a brand, give a conservative score (60-70) and say so
- Do not invent data — only use documented facts
- Local/unbranded always scores lower due to documented adulteration risk
- Write the "why" value in {language}; keep brand names, food names, JSON keys, numbers, and certification terms unchanged"""

    try:
        result = await _call_gemini(system, user, max_tokens=2000)
        if result.get("error"):
            logger.warning("enrich_brands_with_gemini parse_failed: %s",
                           str(result.get("raw", ""))[:200])
            return []
        brands = result.get("brands", [])
        if brands:
            _cache_set(cache_key, brands, _TTL_BRANDS)
        return brands
    except Exception as e:
        logger.warning("enrich_brands_with_gemini failed: %s", e)
        return []


# ── Gemini: generate full brand list for a food category ─────────────────────

async def generate_brands_for_food(food: str, lang: str = "en") -> list:
    """Ask Gemini to list real Indian brands for a food category with safety data."""
    cache_key = f"brands:{lang}:{food.lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    language = LANGUAGE_NAMES.get(lang, LANGUAGE_NAMES["en"])
    system = (
        "You are an Indian food safety expert. "
        "Respond ONLY with valid JSON. No markdown, no preamble."
    )
    user = f"""List all major Indian brands and products for "{food}" sold in India.
Include: top national brands, cooperative brands, regional brands, and a local/unbranded option.

Use REAL documented safety data from FSSAI reports, CSE lab studies, and government surveys.

Return ONLY this JSON:
{{
  "brands": [
    {{
      "food": "{food}",
      "brand": "<real brand name sold in India>",
      "score": <integer 20-95 based on actual documented safety record>,
      "price": "<current Indian retail price e.g. ₹80-120/100g>",
      "fssai": <true or false>,
      "why": "<2 sentences citing specific real lab findings, FSSAI history, or adulteration data for this brand>"
    }}
  ]
}}

Include 5-8 brands. Be honest — if a brand has documented issues (pesticide residues, adulteration, recalls), reflect that in the score and why.
Local/unbranded options should reflect actual documented adulteration risk from government surveys.
Write every "why" value in {language}. Keep brand names, food names, JSON keys, numbers, prices, and certification terms unchanged."""

    try:
        result = await _call_gemini(system, user, max_tokens=2000)
        if result.get("error"):
            logger.warning("generate_brands_for_food parse_failed: %s",
                           str(result.get("raw", ""))[:200])
            return []
        brands = result.get("brands", [])
        if brands:
            _cache_set(cache_key, brands, _TTL_BRANDS)
        return brands
    except Exception as e:
        logger.warning("generate_brands_for_food failed: %s", e)
        return []


# ── Static fallback categories (FSSAI + CSE based) ──────────────────────────
FALLBACK_CATEGORIES = [
    "Turmeric", "Milk", "Honey", "Ghee", "Mustard Oil",
    "Chilli Powder", "Wheat Flour (Atta)", "Rice", "Sugar", "Salt",
    "Tea", "Cooking Oil", "Paneer", "Khoya/Mawa", " pulses (Dal)",
    "Spice Mix (Garam Masala)", "Pickles", "Jaggery", "Biscuits", "Chocolate",
]

# ── Gemini: get food categories popular in India ──────────────────────────────

async def get_indian_food_categories() -> list:
    """Ask Gemini for commonly adulterated/consumed food categories in India."""
    cache_key = "categories:india"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    system = "You are an Indian food safety expert. Respond ONLY with valid JSON."
    user = """List the 20 most commonly purchased and frequently adulterated food categories
in Indian households, based on FSSAI annual reports and CSE studies.

Return ONLY:
{
  "categories": ["category1", "category2", ...]
}

Use simple, common names (e.g. "Turmeric", "Milk", "Honey", "Ghee", "Mustard Oil",
"Chilli Powder", "Wheat Flour", "Rice", "Sugar", "Tea", "Cooking Oil", "Paneer",
"Pulses", "Spice Mix", "Pickles", "Jaggery", "Biscuits", "Chocolate", "Salt", "Khoya").
Order by frequency of adulteration reports in India."""

    try:
        result = await _call_gemini(system, user, max_tokens=500)
        if result.get("error"):
            logger.warning("get_indian_food_categories parse_failed: %s",
                           str(result.get("raw", ""))[:200])
            return FALLBACK_CATEGORIES
        cats = result.get("categories", [])
        if cats:
            _cache_set(cache_key, cats, _TTL_CATEGORIES)
            return cats
        return FALLBACK_CATEGORIES
    except Exception as e:
        logger.warning("get_indian_food_categories failed: %s", e)
        return FALLBACK_CATEGORIES


# ── GET /brands/all ───────────────────────────────────────────────────────────

@router.get("/all")
async def get_all_brands(search: str = "", lang: Literal["en", "hi"] = "en"):
    search = search.strip()

    if search:
        # 1. Fetch OFF data and Gemini-generated brands in parallel
        off_data, gemini_generated = await asyncio.gather(
            fetch_off_brands(search),
            generate_brands_for_food(search, lang),
        )
        off_brand_names = [b["brand"] for b in off_data]

        # 2. Enrich OFF brands (skipped if OFF returned nothing)
        gemini_enriched = (
            await enrich_brands_with_gemini(search, off_brand_names, lang)
            if off_brand_names else []
        )

        # 3. Merge — Gemini-enriched OFF data wins over generated
        merged = {}
        for b in (gemini_generated or []):
            if b.get("brand"):
                merged[b["brand"].lower()] = b
        for b in (gemini_enriched or []):
            if b.get("brand"):
                merged[b["brand"].lower()] = b

        brands = list(merged.values())
        if not brands:
            return {
                "brands": [], "categories": [], "total": 0,
                "source": "error",
                "message": "Could not fetch brand data. Please try again.",
            }

        cats = sorted({b["food"] for b in brands})
        return {
            "brands": brands, "categories": cats,
            "total": len(brands), "source": "gemini+openfoodfacts",
        }

    # No search — load categories (cached), then first category's brands (cached)
    categories = await get_indian_food_categories()
    if not categories:
        return {"brands": [], "categories": [], "total": 0, "source": "error"}

    first_cat_brands = await generate_brands_for_food(categories[0], lang)
    return {
        "brands":     first_cat_brands or [],
        "categories": categories,
        "total":      len(first_cat_brands or []),
        "source":     "gemini",
    }


# ── POST /brands/compare ──────────────────────────────────────────────────────

class CompareRequest(BaseModel):
    brands:        List[str]
    food_category: str = ""
    lang:          Literal["en", "hi"] = "en"


@router.post("/compare")
async def compare_brands(req: CompareRequest):
    brand_list = ", ".join(req.brands)
    category   = req.food_category or "food"
    language   = LANGUAGE_NAMES[req.lang]

    cache_key = f"compare:{req.lang}:{category.lower()}:{','.join(sorted(req.brands)).lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "source": "cache"}

    system = (
        "You are an Indian food safety expert with access to FSSAI lab reports, "
        "CSE studies, government adulteration surveys, and documented brand quality data. "
        "Respond ONLY with valid JSON. No markdown, no extra text."
    )
    user = f"""Compare these {category} brands sold in India for food safety: {brand_list}

Use REAL documented data only:
- FSSAI annual surveillance reports
- CSE (Centre for Science and Environment) lab studies  
- EU/USFDA export rejection data
- State food safety authority surveys
- Published adulteration studies

Return ONLY this JSON:
{{
  "comparison": [
    {{
      "brand": "<exact brand name as given>",
      "score": <integer 20-95 based on actual documented safety record>,
      "price": "<current Indian retail price in ₹>",
      "fssai": <true or false>,
      "why": "<2 sentences: cite specific real lab findings, FSSAI history, or adulteration data>",
      "adulterants": ["<most common real adulterant in {category} 1>", "<adulterant 2>", "<adulterant 3>"],
      "home_test": "<one specific DIY test to detect the most common adulterant in {category}>",
      "pros": ["<specific documented pro 1>", "<specific pro 2>"],
      "cons": ["<specific documented con 1>"]
    }}
  ],
  "winner": "<safest brand name based on evidence>",
  "category_risk": "<LOW or MEDIUM or HIGH based on documented adulteration frequency in India>",
  "tip": "<one actionable, evidence-based buying tip for {category} in India>"
}}

Write all explanatory values ("why", "adulterants", "home_test", "pros", "cons", and "tip") in {language}.
Keep brand names, JSON keys, numbers, prices, FSSAI, and the LOW/MEDIUM/HIGH values unchanged."""

    try:
        result = await _call_gemini(system, user, max_tokens=2500)
        if result.get("comparison"):
            _cache_set(cache_key, result, _TTL_BRANDS)
            return {"data": result, "source": "gemini"}
    except Exception:
        pass

    return {"data": None, "source": "error", "message": "Comparison failed. Please try again."}


# ── GET /brands/safe ──────────────────────────────────────────────────────────

@router.get("/safe")
async def get_safe_brands(food: str = ""):
    return await get_all_brands(search=food)


# ── GET /brands/categories ────────────────────────────────────────────────────

@router.get("/categories")
async def get_categories():
    categories = await get_indian_food_categories()
    return {"categories": categories}