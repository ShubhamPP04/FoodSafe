import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.ai_service import analyze_symptoms

router = APIRouter()
logger = logging.getLogger(__name__)

class SymptomRequest(BaseModel):
    symptoms: str
    recent_foods: Optional[List[str]] = []
    lang: str = "en"

@router.post("/analyze")
async def analyze(req: SymptomRequest):
    if not req.symptoms.strip():
        raise HTTPException(400, "symptoms are required")
    try:
        return await analyze_symptoms(req.symptoms, req.recent_foods or [], req.lang)
    except Exception as exc:
        logger.exception("Symptom analysis failed")
        raise HTTPException(503, "Symptom analysis service is temporarily unavailable") from exc