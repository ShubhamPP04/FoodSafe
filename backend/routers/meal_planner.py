from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.ai_service import _call_gemini

router = APIRouter()

class MealPlanRequest(BaseModel):
    plan_type: str = "single"
    member_profile: Optional[dict] = None
    high_risk_foods: list[str] = []
    lang: str = "en"

@router.post("/generate")
async def generate_meal_plan(req: MealPlanRequest):
    avoid = ", ".join(req.high_risk_foods[:8]) if req.high_risk_foods else "none"
    profile_ctx = f"Health profile: {req.member_profile}" if req.member_profile else "General healthy adult"

    lang_note = (
        "Respond with all text values in Hindi."
        if req.lang == "hi"
        else "Respond with all text values in Marathi."
        if req.lang == "mr"
        else ""
    )
    system = f"You are a Delhi-based nutritionist and food safety expert. Respond ONLY with valid JSON, no markdown. {lang_note}"

    if req.plan_type == "weekly":
        user = f"""Create a safe 7-day Delhi meal plan.
{profile_ctx}
Foods to AVOID (high adulteration risk): {avoid}

Return ONLY this JSON:
{{
  "plan_type": "weekly",
  "member": "{req.member_profile.get("name", "You") if req.member_profile else "You"}",
  "days": [
    {{
      "day": "Monday",
      "breakfast": {{"name": "meal name", "items": ["item1", "item2"], "safety_note": "why safe"}},
      "lunch": {{"name": "meal name", "items": ["item1", "item2"], "safety_note": "why safe"}},
      "dinner": {{"name": "meal name", "items": ["item1", "item2"], "safety_note": "why safe"}},
      "snack": "healthy snack suggestion"
    }}
  ],
  "safety_tips": ["tip1", "tip2", "tip3"],
  "avoided_foods": "{avoid}"
}}
Include all 7 days. Use Delhi/North Indian dishes: chole bhature, rajma chawal, butter chicken, chaat, paratha, kadhi chawal, etc."""
    else:
        user = f"""Create a safe single-day Delhi meal plan.
{profile_ctx}
Foods to AVOID (high adulteration risk): {avoid}

Return ONLY this JSON:
{{
  "plan_type": "single",
  "member": "{req.member_profile.get("name", "You") if req.member_profile else "You"}",
  "date": "Today",
  "breakfast": {{"name": "meal name", "items": ["item1", "item2", "item3"], "safety_note": "why safe", "prep_time": "X mins"}},
  "morning_snack": {{"name": "snack", "items": ["item1"], "safety_note": "why safe"}},
  "lunch": {{"name": "meal name", "items": ["item1", "item2", "item3"], "safety_note": "why safe", "prep_time": "X mins"}},
  "evening_snack": {{"name": "snack", "items": ["item1"], "safety_note": "why safe"}},
  "dinner": {{"name": "meal name", "items": ["item1", "item2", "item3"], "safety_note": "why safe", "prep_time": "X mins"}},
  "nutrition_summary": "brief nutritional balance note",
  "safety_tips": ["tip1", "tip2"],
  "avoided_foods": "{avoid}"
}}
Use Delhi/North Indian dishes: chole bhature, rajma chawal, butter chicken, chaat, paratha, kadhi chawal, etc."""

    try:
        result = await _call_gemini(system, user, max_tokens=2000)
        return result
    except Exception as e:
        return {"error": str(e), "plan_type": req.plan_type}
