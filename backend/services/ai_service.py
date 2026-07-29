"""Shared Gemini text and vision helpers for FoodSafe's AI features.

Gemini is the primary provider. If Gemini is unreachable or returns 429
(rate limit) and a SYNTHETIC_API_KEY is configured, requests fall back
automatically to synthetic.new (OpenAI-compatible).
"""

import asyncio
import json
import logging
import random
import time

import httpx

from app.core.config import settings
from services.rag_service import rag

logger = logging.getLogger(__name__)

# Gemini's OpenAI-compatible endpoint keeps the existing message/payload shape.
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
GEMINI_KEY = settings.GEMINI_API_KEY
GEMINI_MODEL = settings.GEMINI_MODEL

# Synthetic fallback (OpenAI-compatible): https://api.synthetic.new/v1/chat/completions
SYNTHETIC_URL = "https://api.synthetic.new/v1/chat/completions"
SYNTHETIC_KEY = settings.SYNTHETIC_API_KEY
SYNTHETIC_MODEL = settings.SYNTHETIC_MODEL
SYNTHETIC_VISION_MODEL = settings.SYNTHETIC_VISION_MODEL

# Retry config — tuned for the Gemini→Synthetic fallback chain.
# Because a working fallback exists, we keep retries low: 2 attempts with
# short waits means worst-case ~3s of Gemini probing before Synthetic kicks in.
MAX_RETRIES = 2
BASE_WAIT = 0.6
MAX_WAIT = 4.0

# ── Lazy semaphore ────────────────────────────────────────────────────────────
# DO NOT create asyncio.Semaphore at module level — it binds to the event loop
# that exists at import time, which is None before uvicorn starts.
# _get_semaphore() creates it once inside the running loop on first async call.

_AI_SEMAPHORE: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _AI_SEMAPHORE
    if _AI_SEMAPHORE is None:
        _AI_SEMAPHORE = asyncio.Semaphore(2)
    return _AI_SEMAPHORE


# ── Provider helpers ──────────────────────────────────────────────────────────


def _jitter(base: float) -> float:
    return random.uniform(0, base)


class _ProviderExhausted(Exception):
    """Raised when a provider has run out of retries within a single call."""


async def _hit_provider(
    client: httpx.AsyncClient,
    url: str,
    key: str,
    model: str,
    messages: list,
    max_tokens: int,
    temperature: float,
    timeout: float,
    label: str,
) -> dict:
    """
    POST to one OpenAI-compatible provider with bounded retries on 429/5xx.
    Raises _ProviderExhausted when retries run out (caller decides whether
    to fall back). Returns parsed 'content' string on success.
    """
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            t0 = time.monotonic()
            resp = await client.post(
                url, headers=headers, json=payload, timeout=timeout
            )

            if resp.status_code == 429 or resp.status_code >= 500:
                wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                logger.warning(
                    "%s %d attempt %d/%d — retry %.1fs",
                    label,
                    resp.status_code,
                    attempt,
                    MAX_RETRIES,
                    wait,
                )
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(wait)
                    continue
                # Out of retries on this provider — bubble up so caller can fall back.
                raise _ProviderExhausted(
                    f"{label} {resp.status_code} after {MAX_RETRIES} attempts"
                )

            resp.raise_for_status()
            elapsed = int((time.monotonic() - t0) * 1000)
            data = resp.json()
            usage = data.get("usage", {})
            logger.info(
                "%s OK: %dms, %d in / %d out tokens",
                label,
                elapsed,
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0),
            )
            return data["choices"][0]["message"]["content"]

        except httpx.TimeoutException:
            wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
            logger.warning(
                "%s timeout attempt %d/%d, retry %.1fs",
                label,
                attempt,
                MAX_RETRIES,
                wait,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(wait)
            else:
                raise _ProviderExhausted(
                    f"{label} timeout after {MAX_RETRIES} attempts"
                )

    raise _ProviderExhausted(f"{label} exhausted retries")


async def _chat_completion(
    messages: list,
    max_tokens: int,
    *,
    temperature: float = 0.3,
    timeout: float = 30,
    vision: bool = False,
) -> str:
    """
    Call Gemini first; on rate-limit / outage, fall back to Synthetic.

    Returns the raw 'content' string from the chosen provider's response.
    Raises RuntimeError if both providers fail (or none are configured).
    """
    gemini_model = (
        GEMINI_MODEL  # Gemini serves both text and vision with the same model name
    )
    synth_model = SYNTHETIC_VISION_MODEL if vision else SYNTHETIC_MODEL

    async with _get_semaphore():
        async with httpx.AsyncClient(timeout=timeout) as client:
            # ── Primary: Gemini ────────────────────────────────────────────────
            if GEMINI_KEY:
                try:
                    return await _hit_provider(
                        client,
                        GEMINI_URL,
                        GEMINI_KEY,
                        gemini_model,
                        messages,
                        max_tokens,
                        temperature,
                        timeout,
                        "Gemini",
                    )
                except _ProviderExhausted as e:
                    if not SYNTHETIC_KEY:
                        raise RuntimeError(str(e))
                    logger.warning("Gemini failed (%s) — falling back to Synthetic", e)

            # ── Fallback: Synthetic ────────────────────────────────────────────
            if SYNTHETIC_KEY:
                try:
                    # Reasoning models (Kimi-K2.7-Code, used for vision) burn tokens
                    # on chain-of-thought before emitting visible content. Reasoning
                    # tokens count against max_tokens, so give the vision path a much
                    # larger budget. Non-reasoning text models (gpt-oss-120b) don't
                    # need the boost and stay fast at the caller's original budget.
                    synth_max_tokens = (
                        max(max_tokens * 4, 3000) if vision else max_tokens
                    )
                    return await _hit_provider(
                        client,
                        SYNTHETIC_URL,
                        SYNTHETIC_KEY,
                        synth_model,
                        messages,
                        synth_max_tokens,
                        temperature,
                        timeout,
                        "Synthetic",
                    )
                except _ProviderExhausted as e:
                    raise RuntimeError(f"All providers exhausted. Last error: {e}")

    raise RuntimeError(
        "No AI provider configured (set GEMINI_API_KEY or SYNTHETIC_API_KEY)"
    )


# ── Public helpers (kept for backwards-compat with existing routers) ─────────


async def _call_gemini(
    system: str,
    user: str,
    max_tokens: int = 2500,
) -> dict:
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    text = await _chat_completion(messages, max_tokens, temperature=0.3)
    return _parse(text)


async def _call_gemini_vision(
    system: str,
    user: str,
    image_b64: str,
    media_type: str,
    max_tokens: int = 1800,
) -> dict:
    img_data_url = (
        image_b64
        if image_b64.startswith("data:")
        else f"data:{media_type};base64,{image_b64}"
    )
    user_content = [
        {"type": "text", "text": user},
        {"type": "image_url", "image_url": {"url": img_data_url, "detail": "auto"}},
    ]
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    text = await _chat_completion(
        messages, max_tokens, temperature=0.2, timeout=60, vision=True
    )
    return _parse(text)


def _parse(text: str) -> dict:
    """
    Parse JSON from an LLM response. Tolerant of code fences and surrounding
    prose (reasoning models like Kimi often add commentary around the JSON).
    Returns {"error": "parse_failed", "raw": text} if no JSON could be extracted.
    """
    if not text:
        return {"error": "parse_failed", "raw": ""}

    clean = (
        text.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )

    # Fast path: whole thing is JSON.
    try:
        return json.loads(clean)
    except Exception:
        pass

    # Slow path: extract the largest {...} or [...] block from the text.
    # Reasoning models often prepend/append prose despite "ONLY JSON" instructions.
    for opener, closer in (("{", "}"), ("[", "]")):
        start = clean.find(opener)
        end = clean.rfind(closer)
        if start != -1 and end != -1 and end > start:
            candidate = clean[start : end + 1]
            try:
                parsed = json.loads(candidate)
                # Always wrap arrays in an envelope so callers can do result.get(...)
                if isinstance(parsed, list):
                    # Heuristic: list of brand-shaped dicts → {"brands": [...]}
                    if parsed and isinstance(parsed[0], dict):
                        if "brand" in parsed[0]:
                            return {"brands": parsed}
                        if "category" in parsed[0] or "categories" in parsed[0]:
                            return {"categories": parsed}
                        if "comparison" in parsed[0] or "score" in parsed[0]:
                            return {"comparison": parsed}
                        if "alerts" in parsed[0] or "severity" in parsed[0]:
                            return {"alerts": parsed}
                    return {"items": parsed}
                return parsed
            except Exception:
                continue

    return {"error": "parse_failed", "raw": text}


# ── Market adulteration rate data (FSSAI + ICMR surveys) ─────────────────────
_MARKET_FAKE_RATES: dict[str, dict] = {
    "turmeric": {
        "rate": 68,
        "source": "FSSAI 2023 survey — 1538 samples",
        "trend": "rising",
    },
    "turmeric powder": {
        "rate": 68,
        "source": "FSSAI 2023 survey — 1538 samples",
        "trend": "rising",
    },
    "chilli powder": {
        "rate": 54,
        "source": "FSSAI random sampling report 2023",
        "trend": "stable",
    },
    "chilli": {
        "rate": 54,
        "source": "FSSAI random sampling report 2023",
        "trend": "stable",
    },
    "milk": {
        "rate": 38,
        "source": "FSSAI national milk survey 2022",
        "trend": "falling",
    },
    "honey": {
        "rate": 77,
        "source": "CSE NMR test study 2021 — 13 brands",
        "trend": "rising",
    },
    "ghee": {"rate": 41, "source": "FSSAI dairy survey 2023", "trend": "stable"},
    "mustard oil": {
        "rate": 62,
        "source": "ICMR cooking oil study 2022",
        "trend": "rising",
    },
    "paneer": {"rate": 48, "source": "FSSAI dairy panel 2023", "trend": "stable"},
    "dal": {"rate": 31, "source": "FSSAI pulse survey 2022", "trend": "stable"},
    "rice": {"rate": 22, "source": "FSSAI grain survey 2022", "trend": "stable"},
    "wheat flour": {"rate": 36, "source": "FSSAI flour survey 2023", "trend": "stable"},
    "spices": {"rate": 55, "source": "FSSAI spice report 2023", "trend": "rising"},
    "edible oil": {"rate": 47, "source": "ICMR oil survey 2022", "trend": "stable"},
}


def _get_market_rate(food_name: str) -> dict:
    key = food_name.lower().strip().replace("-", " ").replace("_", " ")
    if key in _MARKET_FAKE_RATES:
        return _MARKET_FAKE_RATES[key]
    for k, v in _MARKET_FAKE_RATES.items():
        if k in key or key in k:
            return v
    return {
        "rate": 35,
        "source": "FSSAI general food safety survey",
        "trend": "unknown",
    }


# ── Simple TTL cache ──────────────────────────────────────────────────────────
_cache: dict[str, tuple] = {}


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    return None


def _cache_set(key: str, value, ttl_seconds: int):
    _cache[key] = (value, time.monotonic() + ttl_seconds)


# ── Text scan (RAG-enhanced) ──────────────────────────────────────────────────


async def scan_food_text(
    food_name: str,
    member_profile: dict | None,
    lang: str = "en",
) -> dict:
    fssai_records = await rag.retrieve(food_name, n_results=5)
    fssai_context = rag.format_context(fssai_records)
    has_evidence = bool(fssai_records)

    evidence_note = (
        "You have been given verified FSSAI violation records above. "
        "Base your adulterant list and severity ratings on this evidence. "
        "If a specific adulterant appears in the records, include it and "
        "mention its documented frequency or state. "
        "Do NOT invent adulterants not supported by the records or well-established food science."
        if has_evidence
        else "No specific FSSAI records were found for this food. "
        "Use established food science and general FSSAI survey knowledge. "
        "Be conservative with severity ratings when citing general knowledge."
    )

    lang_note = (
        (
            "Write summary, cookingWarning, personalizedWarning, verdict, "
            "adulterants[].name, adulterants[].description, adulterants[].healthRisk, "
            "homeTests[].name, homeTests[].steps, homeTests[].result, homeTests[].difficulty, "
            "and buyingTips values in Hindi (Devanagari)." if lang == "hi" else ""
            + " Keep riskLevel, adulterants[].severity, adulterants[].isPersonalRisk, "
            "adulterants[].evidenceBased, safetyScore, and all JSON keys unchanged."
        )
        if lang in ("hi", "mr")
        else ""
    )
    profile_ctx = (
        f"\nUser health profile: {json.dumps(member_profile)}" if member_profile else ""
    )

    system = (
        f"You are a food safety expert specialising in Indian food adulteration. "
        f"Respond ONLY with valid JSON, no markdown. {lang_note}"
    )
    user = f"""{fssai_context}
{evidence_note}
{profile_ctx}

Analyse adulteration risk for: "{food_name}"

Return ONLY this JSON structure:
{{
  "foodName": "cleaned name",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "safetyScore": 0-100,
  "summary": "2 sentence overview — reference specific FSSAI evidence if available",
  "cookingWarning": null or "heating risk if applicable",
  "personalizedWarning": null or "warning for health profile",
  "adulterants": [
    {{
      "name": "adulterant name",
      "description": "what it is, why added",
      "healthRisk": "specific impact",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "isPersonalRisk": true or false,
      "evidenceBased": true if from FSSAI records above, false if general knowledge
    }}
  ],
  "homeTests": [
    {{
      "name": "test name",
      "steps": "step by step instructions",
      "result": "positive/negative interpretation",
      "difficulty": "Easy|Medium|Hard"
    }}
  ],
  "buyingTips": ["tip1", "tip2", "tip3"],
  "verdict": "one punchy verdict sentence"
}}"""

    result = await _call_gemini(system, user)
    result["fssaiCitations"] = rag.format_citations(fssai_records)
    result["ragGrounded"] = has_evidence
    result["marketFakeRate"] = _get_market_rate(food_name)

    if not isinstance(result.get("adulterants"), list):
        result["adulterants"] = []

    return result


# ── Combination risk ──────────────────────────────────────────────────────────


async def scan_combination(
    foods: list[str],
    member_profile: dict | None,
    lang: str = "en",
) -> dict:
    lang_note = (
        (
            "Write interactions[].interaction, dailyExposureWarning, and recommendation values in "
            + ("Hindi (Devanagari)." if lang == "hi" else "English.")
            + " Keep combinedRiskLevel, interactions[].severity, interactions[].foods, "
            "combinedScore, and all JSON keys unchanged."
        )
        if lang in ("hi", "mr")
        else ""
    )
    system = f"You are a food safety and toxicology expert. Respond ONLY with valid JSON, no markdown. {lang_note}"
    user = f"""Analyse combined adulteration + toxin exposure for: {", ".join(foods)}
{f"Health profile: {json.dumps(member_profile)}" if member_profile else ""}

Return ONLY this JSON:
{{
  "combinedRiskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "combinedScore": 0-100,
  "interactions": [{{"foods": ["f1","f2"], "interaction": "...", "severity": "..."}}],
  "dailyExposureWarning": "cumulative toxin note",
  "recommendation": "actionable advice"
}}"""
    return await _call_gemini(system, user, max_tokens=1000)


# ── Symptom reverse lookup ────────────────────────────────────────────────────


async def analyze_symptoms(
    symptoms: str,
    recent_foods: list[str],
    lang: str = "en",
) -> dict:
    lang_note = (
        (
            "Write possibleCauses[].explanation, recommendation, and disclaimer values in "
            + ("Hindi (Devanagari)." if lang == "hi" else "English.")
            + " Keep possibleCauses[].confidence, urgency, possibleCauses[].adulterant, "
            "possibleCauses[].food, and all JSON keys unchanged."
        )
        if lang in ("hi", "mr")
        else ""
    )
    system = f"You are a food safety and public health expert. Respond ONLY with valid JSON, no markdown. {lang_note}"
    user = f"""Symptoms: "{symptoms}"
Recent foods: {", ".join(recent_foods) if recent_foods else "unknown"}

Could these be food adulteration related? Return ONLY this JSON:
{{
  "possibleCauses": [
    {{"adulterant": "name", "food": "likely source", "confidence": "HIGH|MEDIUM|LOW", "explanation": "why"}}
  ],
  "urgency": "MONITOR|CONSULT_DOCTOR|EMERGENCY",
  "recommendation": "what to do now",
  "disclaimer": "always seek professional medical advice"
}}"""
    return await _call_gemini(system, user, max_tokens=1000)


# ── Label image analysis ──────────────────────────────────────────────────────


async def analyze_label_image(
    image_b64: str,
    media_type: str = "image/jpeg",
    lang: str = "en",
) -> dict:
    lang_note = (
        (
            "Write summary, visual_red_flags[].explanation, authenticity_indicators, "
            "buyingTips, eNumbers[].note, and homeTests text values in "
            + ("Hindi (Devanagari)." if lang == "hi" else "English.")
            + " Keep riskLevel, visual_red_flags[].severity, eNumbers[].risk, "
            "safetyScore, authenticity_score, fake_probability, and all JSON keys unchanged."
        )
        if lang in ("hi", "mr")
        else ""
    )
    system = (
        "You are a forensic food safety expert specialising in Indian food adulteration "
        "and product counterfeiting detection. Respond ONLY with valid JSON, no markdown. "
        f"{lang_note}"
    )
    user = """Analyse this food product image carefully for authenticity and adulteration signs.

Look for:
- Label quality: blurry text, misaligned printing, spelling errors, colour inconsistency
- Packaging: unusual texture, poor seal, inconsistent colour batches
- Visual product cues: unnatural colour intensity, texture anomalies vs genuine product
- Brand verification: correct logo placement, FSSAI number, batch code, MFG/EXP date presence

Return ONLY this JSON:
{
  "foodName": "product name from label",
  "productName": "product name from label",
  "brand": "brand name if visible, else null",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "safetyScore": 0-100,
  "authenticity_score": 0-100,
  "fake_probability": 0-100,
  "visual_red_flags": [
    {"flag": "specific thing observed", "severity": "HIGH|MEDIUM|LOW", "explanation": "why this is suspicious"}
  ],
  "authenticity_indicators": ["positive sign 1 that suggests genuine product"],
  "summary": "2 sentence safety overview",
  "flaggedIngredients": ["ingredient1"],
  "eNumbers": [{"code": "E102", "name": "Tartrazine", "risk": "MEDIUM", "note": "why risky"}],
  "adulterants": [
    {"name": "adulterant name", "description": "what it is", "healthRisk": "specific impact",
     "severity": "LOW|MEDIUM|HIGH|CRITICAL", "isPersonalRisk": false}
  ],
  "homeTests": [
    {"name": "test name", "steps": "clear step by step instructions",
     "result": "how to interpret result", "difficulty": "Easy|Medium|Hard"}
  ],
  "buyingTips": ["tip1", "tip2"],
  "verdict": "one punchy verdict sentence",
  "cookingWarning": null,
  "personalizedWarning": null
}"""

    try:
        result = await _call_gemini_vision(
            system, user, image_b64, media_type, max_tokens=1800
        )

        for key in [
            "homeTests",
            "adulterants",
            "visual_red_flags",
            "authenticity_indicators",
            "buyingTips",
            "flaggedIngredients",
            "eNumbers",
        ]:
            if not isinstance(result.get(key), list):
                result[key] = []

        food_name = (
            result.get("foodName")
            or result.get("productName")
            or result.get("brand")
            or ""
        )
        market_data = (
            _get_market_rate(food_name)
            if food_name
            else {
                "rate": 35,
                "source": "FSSAI general food safety survey",
                "trend": "unknown",
            }
        )
        result["marketFakeRate"] = market_data

        ai_raw = result.get("fake_probability") or (100 - result.get("safetyScore", 50))
        market_boost = round(market_data["rate"] * 0.35)
        boosted_fake = min(95, round(ai_raw * 0.65 + market_boost))

        result["fake_probability"] = boosted_fake
        result["authenticity_score"] = 100 - boosted_fake
        result["scoreBreakdown"] = {
            "ai_visual_score": round(100 - ai_raw),
            "market_rate": market_data["rate"],
            "market_boost": market_boost,
            "final_fake_prob": boosted_fake,
        }
        return result

    except Exception as e:
        logger.exception("Vision analysis failed")
        return {
            "foodName": "Unknown — vision failed",
            "productName": "Unknown",
            "brand": None,
            "riskLevel": "MEDIUM",
            "safetyScore": 50,
            "authenticity_score": 50,
            "fake_probability": 50,
            "visual_red_flags": [],
            "authenticity_indicators": [],
            "marketFakeRate": {
                "rate": 35,
                "source": "General estimate",
                "trend": "unknown",
            },
            "scoreBreakdown": {
                "ai_visual_score": 50,
                "market_rate": 35,
                "market_boost": 12,
                "final_fake_prob": 50,
            },
            "summary": "Could not analyse image. Please type the food name manually.",
            "flaggedIngredients": [],
            "eNumbers": [],
            "adulterants": [],
            "homeTests": [],
            "buyingTips": [],
            "verdict": "Manual check recommended.",
            "cookingWarning": None,
            "personalizedWarning": None,
            "error": str(e),
        }


# ── FSSAI report NLP ──────────────────────────────────────────────────────────


async def extract_fssai_violation(raw_text: str) -> dict:
    system = "Extract structured food safety violation data. Respond ONLY with valid JSON, no markdown."
    user = f"""Extract from this FSSAI report text:
"{raw_text[:2000]}"

Return ONLY this JSON:
{{
  "brand": "brand name or null",
  "product": "product name",
  "violation_type": "adulteration|misbranding|substandard|unsafe",
  "adulterant": "specific substance if mentioned",
  "state": "state name",
  "date": "YYYY-MM-DD or null"
}}"""
    return await _call_gemini(system, user, max_tokens=500)
