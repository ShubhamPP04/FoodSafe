from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import hashlib, hmac, secrets, logging
from jose import JWTError, jwt

from app.core.config import settings
from app.db.database import get_db, MongoSession
from models.models import User, user_from_doc, USERS, REFRESH_TOKENS, SCAN_RECORDS

logger = logging.getLogger(__name__)

router = APIRouter()

_PW_ITERATIONS = 260_000

def _hash_pw(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), _PW_ITERATIONS)
    return f"{salt}${h.hex()}"

def _verify_pw(password: str, hashed: str) -> bool:
    if not hashed or '$' not in hashed:
        return False
    salt, h = hashed.split('$', 1)
    computed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), _PW_ITERATIONS)
    return hmac.compare_digest(computed.hex(), h)

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

bearer = HTTPBearer(auto_error=False)

# ── Schemas ───────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:     str
    email:    str
    password: str
    city:     Optional[str] = ""
    lang:     str = "en"

class LoginRequest(BaseModel):
    email:    str
    password: str

class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user_id:       str
    name:          str

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class SyncScanRequest(BaseModel):
    food_name:    str
    risk_level:   Optional[str] = None
    safety_score: Optional[int] = None
    scanned_at:   Optional[str] = None

# ── JWT / refresh token helpers ───────────────────────────
def _create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

def _decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        return payload["sub"]
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


# Public helper used by scan, community, and diary auth dependencies.
decode_token = _decode_access_token

async def _create_refresh_token(user_id: str, db: MongoSession) -> str:
    # Rotate: clean up expired tokens for this user to keep the collection lean
    await db.delete_many(REFRESH_TOKENS, {
        "user_id": user_id,
        "expires_at": {"$lt": datetime.utcnow()},
    })
    raw = secrets.token_urlsafe(64)
    await db.insert(REFRESH_TOKENS, {
        "user_id":    user_id,
        "token_hash": _hash_token(raw),
        "expires_at": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "is_revoked": False,
    })
    return raw

# ── Auth dependency ───────────────────────────────────────
async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    MongoSession = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    user_id = _decode_access_token(creds.credentials)
    user_doc = await db.find_one(USERS, {"id": user_id})
    user = user_from_doc(user_doc)
    if not user:
        raise HTTPException(401, "User not found")
    return user

# ── Register ──────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: MongoSession = Depends(get_db)):
    if not req.email or not req.email.strip():
        raise HTTPException(400, "Email is required")
    if not req.password or len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if not req.name or not req.name.strip():
        raise HTTPException(400, "Name is required")

    email_lc = req.email.strip().lower()
    if await db.find_one(USERS, {"email": email_lc}):
        raise HTTPException(400, "Email already registered")

    user_doc = await db.insert(USERS, {
        "name":      req.name.strip(),
        "email":     email_lc,
        "hashed_pw": _hash_pw(req.password),
        "city":      req.city,
        "state":     "Delhi",
        "lang":      req.lang,
    })
    refresh_raw = await _create_refresh_token(user_doc["id"], db)
    logger.info("User registered: %s (%s)", user_doc["email"], user_doc["id"])
    return TokenResponse(
        access_token  = _create_access_token(user_doc["id"]),
        refresh_token = refresh_raw,
        user_id       = user_doc["id"],
        name          = user_doc["name"],
    )

# ── Login ─────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: MongoSession = Depends(get_db)):
    user_doc = await db.find_one(USERS, {"email": req.email.strip().lower()})
    if not user_doc or not _verify_pw(req.password, user_doc.get("hashed_pw") or ""):
        logger.warning("Failed login attempt for: %s", req.email)
        raise HTTPException(401, "Invalid email or password")

    refresh_raw = await _create_refresh_token(user_doc["id"], db)
    logger.info("User logged in: %s (%s)", user_doc["email"], user_doc["id"])
    return TokenResponse(
        access_token  = _create_access_token(user_doc["id"]),
        refresh_token = refresh_raw,
        user_id       = user_doc["id"],
        name          = user_doc["name"],
    )

# ── Refresh ───────────────────────────────────────────────
@router.post("/refresh")
async def refresh_token(req: RefreshRequest, db: MongoSession = Depends(get_db)):
    token_hash = _hash_token(req.refresh_token)
    record = await db.find_one(REFRESH_TOKENS, {"token_hash": token_hash})

    if not record or record.get("is_revoked") or record.get("expires_at", datetime.utcnow()) < datetime.utcnow():
        raise HTTPException(401, "Invalid or expired refresh token")

    # Rotate: revoke used token, issue new one
    await db.update_one(REFRESH_TOKENS, {"token_hash": token_hash}, {"$set": {"is_revoked": True}})
    new_refresh_raw = await _create_refresh_token(record["user_id"], db)

    return {
        "access_token":  _create_access_token(record["user_id"]),
        "refresh_token": new_refresh_raw,
    }

# ── Logout (revoke refresh token) ─────────────────────────
@router.post("/logout")
async def logout(req: LogoutRequest, db: MongoSession = Depends(get_db)):
    token_hash = _hash_token(req.refresh_token)
    record = await db.find_one(REFRESH_TOKENS, {"token_hash": token_hash})
    if record:
        await db.update_one(REFRESH_TOKENS, {"token_hash": token_hash}, {"$set": {"is_revoked": True}})
    return {"success": True}

# ── Me ────────────────────────────────────────────────────
@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id":         user.id,
        "name":       user.name,
        "email":      user.email,
        "city":       user.city,
        "lang":       user.lang,
        "created_at": user.created_at,
    }

# ── Sync scan to DB ───────────────────────────────────────
@router.post("/sync-scan")
async def sync_scan(
    req:  SyncScanRequest,
    user: User = Depends(get_current_user),
    db:   MongoSession = Depends(get_db),
):
    if not req.food_name.strip():
        raise HTTPException(400, "food_name is required")

    record_date = datetime.utcnow()
    if req.scanned_at:
        try:
            dt = datetime.fromisoformat(req.scanned_at.replace("Z", "+00:00"))
            record_date = dt.replace(tzinfo=None)
        except (ValueError, TypeError):
            record_date = datetime.utcnow()

    scanned_date_str = record_date.date().isoformat()

    # Avoid duplicate: same user + same food + same day
    existing = await db.find(SCAN_RECORDS, {
        "user_id":   user.id,
        "food_name": req.food_name.strip(),
    })
    for r in existing:
        created = r.get("created_at")
        if created and hasattr(created, "date") and created.date().isoformat() == scanned_date_str:
            return {"success": True, "skipped": True, "reason": "duplicate"}

    await db.insert(SCAN_RECORDS, {
        "user_id":      user.id,
        "food_name":    req.food_name.strip(),
        "risk_level":   req.risk_level,
        "safety_score": req.safety_score,
        "scan_type":    "text",
        "created_at":   record_date,
    })
    return {"success": True, "skipped": False}

# ── Get scan history from DB ──────────────────────────────
@router.get("/scan-history")
async def get_scan_history(
    user: User = Depends(get_current_user),
    db:   MongoSession = Depends(get_db),
):
    scans = await db.find(
        SCAN_RECORDS,
        {"user_id": user.id},
        sort=[("created_at", -1)],
        limit=100,
    )
    return {
        "scans": [
            {
                "id":           s.get("id"),
                "food_name":    s.get("food_name"),
                "risk_level":   s.get("risk_level"),
                "safety_score": s.get("safety_score"),
                "date":         s["created_at"].isoformat() if s.get("created_at") else None,
            }
            for s in scans
        ],
        "total": len(scans),
    }

# ── Stats (requires auth — only own stats) ───────────────
@router.get("/{user_id}/stats")
async def get_stats(
    user_id: str,
    db:   MongoSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    if user.id != user_id:
        raise HTTPException(403, "Cannot access another user's stats")
    scans = await db.find(SCAN_RECORDS, {"user_id": user_id})
    total = len(scans)
    high  = sum(1 for s in scans if s.get("risk_level") in ["HIGH", "CRITICAL"])
    avg   = round(sum(s.get("safety_score") or 0 for s in scans) / total) if total else 0
    return {
        "user_id":          user_id,
        "total_scans":      total,
        "high_risk_scans":  high,
        "avg_safety_score": avg,
    }

# ── Update profile ────────────────────────────────────────
@router.patch("/me")
async def update_profile(
    data: dict,
    user: User = Depends(get_current_user),
    db:   MongoSession = Depends(get_db),
):
    allowed = {"name", "city", "lang"}
    update = {k: v for k, v in data.items() if k in allowed}
    if update:
        await db.update_one(USERS, {"id": user.id}, {"$set": update})
    return {"success": True}
