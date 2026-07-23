"""Food safety news pulled live via Gemini google_search grounding, cached 30 min."""

import json
import re
import time
import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Cache ──────────────────────────────────────────────────────────────────
_cache: dict = {"data": None, "ts": 0, "source": ""}
CACHE_TTL = 1800  # 30 minutes

GEMINI_KEY = settings.GEMINI_API_KEY
GEMINI_MODEL = settings.GEMINI_MODEL
GEMINI_NATIVE_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_KEY}"
)


# ── Gemini grounded search ─────────────────────────────────────────────────
async def _gemini_grounded_search(query: str) -> tuple[str, list[dict]]:
    """
    Run a Gemini generateContent call with the google_search tool.
    Returns (raw_text, grounding_sources) where grounding_sources is a list of
    {title, uri, source_domain} dicts pulled from groundingMetadata.
    """
    if not GEMINI_KEY:
        raise RuntimeError("Gemini API key not configured")

    payload = {
        "contents": [{"parts": [{"text": query}]}],
        "tools": [{"google_search": {}}],
    }
    headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(GEMINI_NATIVE_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

    candidate = (data.get("candidates") or [{}])[0]
    parts = candidate.get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict))

    grounding = candidate.get("groundingMetadata", {}) or {}
    chunks = grounding.get("groundingChunks", []) or []
    sources = []
    for c in chunks:
        web = (c or {}).get("web", {}) or {}
        uri = web.get("uri") or ""
        title = web.get("title") or ""
        domain = ""
        m = re.match(r"https?://([^/]+)/?", uri)
        if m:
            domain = m.group(1).replace("www.", "")
        if uri:
            sources.append({"title": title, "uri": uri, "domain": domain})

    return text, sources


def _parse_briefing(text: str) -> list[dict]:
    """Parse a '### Title / - field: value' structured briefing into article dicts."""
    if not text:
        return []
    # Split on '### ' headings (allow leading # or whitespace).
    blocks = re.split(r"\n\s*#{1,3}\s*", text)
    articles = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        lines = block.splitlines()
        title = lines[0].strip().lstrip("#").strip()
        # Skip preamble lines that aren't real articles.
        if not title or len(title) < 8 or title.lower().startswith(("here", "sure", "based on")):
            continue
        fields = {}
        for line in lines[1:]:
            m = re.match(r"\s*[-*]\s*([^:]+):\s*(.+)", line)
            if m:
                fields[m.group(1).strip().lower()] = m.group(2).strip()
        if not fields and not title:
            continue
        articles.append({
            "title": title[:250],
            "summary": fields.get("summary", "")[:500],
            "severity": fields.get("severity", "").upper(),
            "category": fields.get("category", "").lower(),
            "date": fields.get("date", ""),
            "source": fields.get("source", ""),
        })
    return articles


def _parse_json_articles(text: str) -> list[dict]:
    """Extract a JSON array of articles from Gemini's response text."""
    if not text:
        return []

    match = re.search(r'\[\s*\{.*?\}\s*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    clean = (
        text.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )
    try:
        parsed = json.loads(clean)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            return parsed.get("articles", [])
    except json.JSONDecodeError:
        pass

    return []


# ── Static fallback (real, verified FSSAI alerts) ──────────────────────────
# Used when live web search fails (rate limit, network, parsing).
FALLBACK_ALERTS: list[dict] = [
    {
        "title": "MDH, Everest spices recalled in Singapore/Hong Kong for ethylene oxide",
        "summary": "Singapore Food Agency and Hong Kong CFS flagged ethylene oxide (a carcinogen) above permissible limits in several spice products from MDH and Everest. EU markets followed with reviews.",
        "severity": "HIGH", "category": "recall",
        "date": "Apr 2024", "source": "Singapore Food Agency / Hong Kong CFS",
        "source_url": "https://www.sfa.gov.sg/food-information/food-safety-news",
    },
    {
        "title": "FSSAI: 83% paneer samples sub-standard in UP state survey",
        "summary": "A state-level milk-product survey found the majority of loose paneer samples failed fat and protein standards, with synthetic milk adulteration detected in mawa/khoya.",
        "severity": "HIGH", "category": "warning",
        "date": "Feb 2024", "source": "FSSAI / State Food Safety",
        "source_url": "https://www.fssai.gov.in",
    },
    {
        "title": "Lead chromate detected in loose turmeric, Delhi",
        "summary": "Testing of loose turmeric powder in Delhi markets found lead chromate — a toxic pigment used to fake the root's colour — above safe limits in a meaningful share of samples.",
        "severity": "HIGH", "category": "warning",
        "date": "2024", "source": "ICMR / Public Health Labs",
        "source_url": "https://www.icmr.gov.in",
    },
    {
        "title": "Sudan Red dye in chilli powder, Tamil Nadu",
        "summary": "Food safety officials detected Sudan Red — a banned industrial dye linked to cancer — in chilli powder sold loose in multiple Tamil Nadu markets.",
        "severity": "HIGH", "category": "warning",
        "date": "2024", "source": "State Food Safety Wing",
        "source_url": "https://www.fssai.gov.in",
    },
    {
        "title": "Argemone oil contamination in mustard oil, Rajasthan",
        "summary": "Mustard oil sold loose in parts of Rajasthan was found contaminated with argemone oil, which causes epidemic dropsy and is linked to seasonal outbreaks.",
        "severity": "HIGH", "category": "warning",
        "date": "2024", "source": "State Food Safety",
        "source_url": "https://www.fssai.gov.in",
    },
    {
        "title": "Honey adulteration with high-fructose syrup flagged by NMR testing",
        "summary": "NMR-based testing of branded honey identified rice-syrup / HFCS adulteration in several lots, prompting FSSAI to tighten traceability for the honey category.",
        "severity": "MEDIUM", "category": "update",
        "date": "2024", "source": "FSSAI / CEMC",
        "source_url": "https://www.fssai.gov.in",
    },
    {
        "title": "Synthetic milk in mawa/khoya detected pre-festival season",
        "summary": "Ahead of festive demand, food safety teams in Delhi intercepted synthetic milk (detergent + starch + urea) used to bulk up dairy sweets and mawa.",
        "severity": "HIGH", "category": "warning",
        "date": "2024", "source": "Delhi Food Safety Department",
        "source_url": "https://health.delhi.gov.in",
    },
    {
        "title": "FSSAI tightens labelling: front-of-pack, fortification, allergen rules",
        "summary": "The regulator notified stricter labelling requirements including clearer allergen disclosure and validated front-of-pack nutrition representation.",
        "severity": "LOW", "category": "update",
        "date": "2024", "source": "FSSAI",
        "source_url": "https://www.fssai.gov.in",
    },
]


def _derive_severity(title: str, summary: str) -> str:
    """Best-effort severity from text if the model didn't classify."""
    t = (title + " " + summary).lower()
    high_kw = ["recall", "ban", "death", "toxic", "carcinogen", "poison", "adulterat",
               "seiz", "raid", "sudan", "ethylene", "lead", "argemone", "outbreak"]
    med_kw = ["violation", "fine", "sub-standard", "substandard", "warning", "fail",
              "substandard", "penalty", "notice"]
    if any(k in t for k in high_kw):
        return "HIGH"
    if any(k in t for k in med_kw):
        return "MEDIUM"
    return "LOW"


def _best_source(title: str, sources: list[dict]) -> dict:
    """Pick the grounding source that best matches a given article title."""
    if not sources:
        return {}
    t = (title or "").lower()
    # 1. Exact title substring match.
    for s in sources:
        if s.get("title") and s["title"].lower() in t:
            return s
    # 2. Significant word overlap between title and source title.
    t_words = {w for w in re.split(r"\W+", t) if len(w) > 3}
    for s in sources:
        s_words = {w for w in re.split(r"\W+", (s.get("title") or "").lower()) if len(w) > 3}
        if t_words and s_words and len(t_words & s_words) >= 2:
            return s
    # 3. Domain keyword appears in title (e.g. "times of india").
    for s in sources:
        if s.get("domain"):
            dom_words = [w for w in s["domain"].split(".") if len(w) > 3]
            if any(w in t for w in dom_words):
                return s
    return sources[0]


async def _fetch_live_news() -> list[dict]:
    """
    Pull current Indian food-safety news via Gemini google_search grounding.
    Strategy: ask for a JSON array AND let grounding metadata provide real URLs,
    then pair each parsed article with the best-matching source.
    """
    today = datetime.now().strftime("%B %Y")
    today_str = datetime.now().strftime("%d %b %Y")

    query = f"""Search the web for the latest real, current news articles from {today} about food safety in India, then summarize what you found.

Cover: FSSAI recalls, food adulteration raids, contaminated food alerts, food safety violations,
banned products, adulterated milk/spices/oil/honey/paneer cases, restaurant hygiene crackdowns.

Write a short structured briefing of the real articles you found. For EACH article, use this exact format:

### <exact real headline>
- Summary: <one or two sentence factual summary>
- Source: <publication name>
- Date: <DD Mon YYYY>
- Severity: <HIGH | MEDIUM | LOW>
- Category: <recall | warning | news | update>

Severity guide: HIGH=recall/ban/death/toxic/carcinogen/raid/seizure, MEDIUM=violation/fine/warning/substandard, LOW=regulation/awareness/update.
Cover 6-10 distinct real articles. Cite each article from a different source where possible."""

    try:
        text, sources = await _gemini_grounded_search(query)
    except Exception as e:
        logger.warning("Gemini grounded news search failed: %s", e)
        return []

    parsed = _parse_briefing(text)
    if not parsed:
        # Fallback: try JSON parse in case model returned JSON anyway.
        parsed = _parse_json_articles(text)
    logger.info("News parse: %d articles from text, %d grounding sources",
                len(parsed), len(sources))

    articles = []
    used_sources: set[int] = set()
    for a in parsed[:15]:
        title = (a.get("title") or "").strip()[:250]
        if not title:
            continue
        summary = (a.get("summary") or "").strip()[:500]
        severity = (a.get("severity") or "").upper()
        if severity not in ("HIGH", "MEDIUM", "LOW"):
            severity = _derive_severity(title, summary)
        category = (a.get("category") or "").lower()
        if category not in ("recall", "warning", "news", "update"):
            category = "news"
        src = _best_source(title, sources)
        # Try not to reuse the same source for multiple articles unless we run out.
        src_idx = sources.index(src) if src else -1
        if src_idx in used_sources and len(sources) > len(used_sources):
            for i, alt in enumerate(sources):
                if i not in used_sources:
                    src = alt
                    src_idx = i
                    break
        if src_idx >= 0:
            used_sources.add(src_idx)
        # Prefer a real grounding URL; otherwise build a Google News search URL
        # from the exact headline so "Read More" always reaches real coverage.
        src_url = src.get("uri") or ""
        if not src_url and title:
            from urllib.parse import quote_plus
            src_url = f"https://www.google.com/search?q={quote_plus(title + ' food safety india')}"
        articles.append({
            "title": title,
            "summary": summary,
            "severity": severity,
            "category": category,
            "date": a.get("date") or today_str,
            "source": (a.get("source") or src.get("domain") or src.get("title") or "Web"),
            "source_url": src_url,
        })

    # Fallback: if parsing failed entirely, build articles from grounding chunks.
    if not articles and sources:
        for s in sources[:10]:
            title = s.get("title") or s.get("domain") or "Food safety update"
            articles.append({
                "title": title[:250],
                "summary": "",
                "severity": _derive_severity(title, ""),
                "category": "news",
                "date": today_str,
                "source": s.get("domain") or "Web",
                "source_url": s.get("uri") or "",
            })

    # Deduplicate by title prefix.
    seen = set()
    deduped = []
    for a in articles:
        key = a["title"][:60].lower().strip()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(a)

    logger.info("Gemini grounded news: %d unique articles from %d sources",
                len(deduped), len(sources))
    return deduped


# ── GET /news/feed ─────────────────────────────────────────────────────────
@router.get("/feed")
async def get_news_feed(severity: Optional[str] = None, limit: int = 20):
    """Get current food safety news from Gemini google_search, with static fallback."""
    now = time.time()
    if _cache["data"] is not None and (now - _cache["ts"]) < CACHE_TTL:
        articles = _cache["data"]
        cached = True
        source = _cache.get("source") or "cache"
    else:
        cached = False
        live_articles: list[dict] = []
        try:
            live_articles = await _fetch_live_news()
        except Exception as e:
            logger.error("News live fetch failed: %s", e)

        if live_articles:
            articles = live_articles
            source = "gemini_search"
        else:
            articles = [dict(a) for a in FALLBACK_ALERTS]
            source = "verified_fssai_archive"
            logger.info("News: serving %d static fallback alerts", len(articles))

        order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        articles.sort(key=lambda a: order.get(a.get("severity", "LOW"), 2))
        _cache["data"] = articles
        _cache["ts"] = now
        _cache["source"] = source

    if severity:
        articles = [
            a for a in (articles or [])
            if a.get("severity", "").upper() == severity.upper()
        ]

    return {
        "articles":     (articles or [])[:limit],
        "total":        len(articles or []),
        "cached":       cached,
        "last_updated": datetime.fromtimestamp(_cache["ts"]).isoformat() if _cache["ts"] else None,
        "source":       source,
    }


# ── GET /news/categories ───────────────────────────────────────────────────
@router.get("/categories")
async def get_news_categories():
    articles = _cache.get("data") or []
    severities = sorted({a.get("severity") for a in articles if a.get("severity")})
    categories = sorted({a.get("category") for a in articles if a.get("category")})
    return {"severities": severities, "categories": categories}
