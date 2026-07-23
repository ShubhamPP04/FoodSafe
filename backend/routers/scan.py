from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import base64, re, httpx, logging
from datetime import datetime, timedelta

from services.ai_service import scan_food_text, scan_combination, analyze_label_image
from services.yolo_service import detect_food
from services.overconsumption_service import check_overconsumption
from app.db.database import get_db, MongoSession
from models.models import User, user_from_doc, USERS, SCAN_RECORDS

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def get_optional_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    MongoSession = Depends(get_db),
) -> Optional[User]:
    if not creds:
        return None
    try:
        from routers.users import decode_token
        user_id = decode_token(creds.credentials)
        return user_from_doc(await db.find_one(USERS, {"id": user_id}))
    except Exception:
        return None


async def get_required_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    MongoSession = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(401, "Authentication required")
    try:
        from routers.users import decode_token
        user_id = decode_token(creds.credentials)
        user = user_from_doc(await db.find_one(USERS, {"id": user_id}))
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


# ── Schemas ───────────────────────────────────────────────────────────────────

class TextScanRequest(BaseModel):
    food_name:      str
    lang:           str            = "en"
    member_profile: Optional[dict] = None
    city:           Optional[str]  = None

class CombinationRequest(BaseModel):
    foods:          list[str]
    lang:           str            = "en"
    member_profile: Optional[dict] = None

class FeedbackRequest(BaseModel):
    feedback: str
    note:     Optional[str] = None


# ── ML helpers ────────────────────────────────────────────────────────────────

def _attach_seasonal_risk(result: dict, food_name: str):
    try:
        from risk_scorer import predict_seasonal_risk
        result["seasonalRisk"] = predict_seasonal_risk(food_name)
    except Exception:
        result["seasonalRisk"] = None


def _attach_personalized_score(result: dict, food_name: str, member_profile: dict, city: str):
    try:
        from personalized_scorer import predict_personal_risk, calculate_weekly_exposure
        if member_profile:
            condition = (
                member_profile.get("conditions", ["none"])[0]
                if member_profile.get("conditions") else "none"
            )
            personal = predict_personal_risk(
                age=member_profile.get("age", 30),
                condition=condition,
                city=city or member_profile.get("city", "Dwarka"),
                food=food_name,
                month=datetime.now().month,
                safety_score=result.get("safetyScore", 50),
            )
            weekly = calculate_weekly_exposure(
                scan_history=[{"food_name": food_name, "risk_level": result.get("riskLevel", "LOW")}],
                condition=condition,
            )
            result["personalizedScore"] = {
                "cumulative_score":         weekly["weekly_exposure_score"],
                "exposure_level":           weekly["risk_level"],
                "recommendation":           weekly["recommendation"],
                "top_toxins":               weekly["top_toxins"],
                "adulteration_probability": personal["adulteration_probability"],
                "source":                   personal["source"],
            }
        else:
            result["personalizedScore"] = None
    except Exception:
        result["personalizedScore"] = None


async def _attach_overconsumption(
    result:    dict,
    food_name: str,
    user:      User,
    db:        MongoSession,
) -> None:
    try:
        cutoff = datetime.utcnow() - timedelta(days=7)
        rows = await db.find(
            SCAN_RECORDS,
            {"user_id": user.id, "created_at": {"$gte": cutoff}},
            sort=[("created_at", -1)],
            limit=200,
        )
        recent_scans = [
            {"food_name": r.get("food_name"), "created_at": r.get("created_at")}
            for r in rows
        ]
        result["overconsumptionWarnings"] = check_overconsumption(
            food_name, result, recent_scans
        )
    except Exception as e:
        logger.warning("Overconsumption check failed: %s", e)
        result["overconsumptionWarnings"] = None


# ── Text scan (optional auth) ─────────────────────────────────────────────────

@router.post("/text")
async def scan_text(
    req:  TextScanRequest,
    db:   MongoSession   = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    if not req.food_name.strip():
        raise HTTPException(400, "food_name is required")

    try:
        result = await scan_food_text(req.food_name, req.member_profile, req.lang)
    except Exception as exc:
        logger.exception("Text food analysis failed")
        raise HTTPException(503, "Food analysis service is temporarily unavailable") from exc

    _attach_seasonal_risk(result, req.food_name)
    _attach_personalized_score(result, req.food_name, req.member_profile, req.city)

    if user:
        record = await db.insert(SCAN_RECORDS, {
            "user_id":      user.id,
            "food_name":    req.food_name,
            "risk_level":   result.get("riskLevel"),
            "safety_score": result.get("safetyScore"),
            "result_json":  result,
            "scan_type":    "text",
            "city":         req.city or user.city,
        })
        result["scanId"] = record["id"]

        await _attach_overconsumption(result, req.food_name, user, db)
    else:
        result["overconsumptionWarnings"] = None

    return result


# ── Image scan (public) ───────────────────────────────────────────────────────

@router.post("/image")
async def scan_image(
    file: UploadFile = File(...),
    lang: str        = Form("en"),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "Image must be JPEG, PNG, or WebP")

    MAX_SIZE = 5 * 1024 * 1024
    data = await file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "Image too large (max 5MB)")

    b64  = base64.b64encode(data).decode()

    yolo: dict = {"detected": False, "confidence": 0, "food_name": "", "all_detections": []}
    try:
        yolo = await detect_food(data)
    except Exception as e:
        logger.warning("YOLO detect_food failed, skipping: %s", e)

    if yolo.get("detected") and yolo.get("confidence", 0) >= 0.5:
        food_name = yolo["food_name"]
        try:
            result = await scan_food_text(food_name, None, lang)
        except Exception as exc:
            logger.exception("Detected-food analysis failed")
            raise HTTPException(503, "Food analysis service is temporarily unavailable") from exc
        result["detectionSource"] = "yolov8"
        result["yoloDetection"]   = {
            "food":       yolo["food_name"],
            "confidence": yolo["confidence"],
            "all":        yolo.get("all_detections", []),
        }
    else:
        try:
            result = await analyze_label_image(b64, file.content_type)
        except Exception as exc:
            logger.exception("Image label analysis failed")
            raise HTTPException(503, "Image analysis service is temporarily unavailable") from exc

        if result.get("error") == "parse_failed" or not result.get("foodName"):
            logger.warning("analyze_label_image returned no food name: %s", result.get("error"))

        result["detectionSource"] = "gemini_vision"
        if yolo.get("detected"):
            result["yoloDetection"] = {
                "food":       yolo["food_name"],
                "confidence": yolo["confidence"],
                "note":       "Low confidence — Gemini Vision used instead",
            }

    food_name = (
        result.get("foodName")
        or result.get("food_name")
        or result.get("name")
        or result.get("productName")
        or (yolo.get("food_name") if yolo.get("detected") else "")
    )
    if food_name:
        _attach_seasonal_risk(result, food_name)
    else:
        result["seasonalRisk"] = None

    result["personalizedScore"]       = None
    result["overconsumptionWarnings"] = None
    result["scanType"]                = "image"
    return result


# ── Barcode scan (public) ─────────────────────────────────────────────────────

@router.get("/barcode/{barcode}")
async def scan_barcode(barcode: str, lang: str = "en"):
    if not re.match(r'^\d{8,14}$', barcode):
        raise HTTPException(400, "Invalid barcode format")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            )
        r.raise_for_status()
        data = r.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Open Food Facts lookup failed for %s: %s", barcode, exc)
        raise HTTPException(503, "Barcode lookup service is temporarily unavailable")
    if data.get("status") != 1:
        raise HTTPException(404, "Product not found")

    product   = data["product"]
    food_name = product.get("product_name", "") or product.get("product_name_en", "")
    if not food_name:
        raise HTTPException(404, "Could not identify product name")

    try:
        result = await scan_food_text(food_name, None, lang)
    except Exception as exc:
        logger.exception("Barcode AI analysis failed for %s", barcode)
        raise HTTPException(503, "Food analysis service is temporarily unavailable") from exc
    _attach_seasonal_risk(result, food_name)
    result["personalizedScore"]       = None
    result["overconsumptionWarnings"] = None
    result["barcodeData"] = {
        "name":        food_name,
        "brand":       product.get("brands", ""),
        "ingredients": product.get("ingredients_text", ""),
        "nutriscore":  product.get("nutriscore_grade", ""),
        "image_url":   product.get("image_url", ""),
    }
    result["scanType"] = "barcode"
    return result


# ── Combination scan (public) ─────────────────────────────────────────────────

@router.post("/combination")
async def combination_scan(req: CombinationRequest):
    if len(req.foods) < 2:
        raise HTTPException(400, "At least 2 foods required")
    try:
        return await scan_combination(req.foods, req.member_profile, req.lang)
    except Exception as exc:
        logger.exception("Combination analysis failed")
        raise HTTPException(503, "Food analysis service is temporarily unavailable") from exc


# ── Feedback (requires auth) ──────────────────────────────────────────────────

@router.post("/{scan_id}/feedback")
async def submit_feedback(
    scan_id: str,
    req:     FeedbackRequest,
    db:      MongoSession = Depends(get_db),
    user:    User         = Depends(get_required_user),
):
    if req.feedback not in ("accurate", "inaccurate"):
        raise HTTPException(400, "feedback must be 'accurate' or 'inaccurate'")

    record = await db.find_one(SCAN_RECORDS, {"id": scan_id})
    if not record:
        raise HTTPException(404, "Scan record not found")
    if record.get("user_id") and record["user_id"] != user.id:
        raise HTTPException(403, "Not your scan record")

    await db.update_one(SCAN_RECORDS, {"id": scan_id}, {
        "$set": {"feedback": req.feedback, "feedback_note": req.note}
    })
    return {"success": True, "scan_id": scan_id, "feedback": req.feedback}
