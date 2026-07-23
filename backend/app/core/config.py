import json
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
DEFAULT_DB = Path(__file__).resolve().parents[3] / "foodsafe.db"


class Settings(BaseSettings):
    APP_ENV: str = "development"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # Synthetic (synthetic.new) — OpenAI-compatible fallback used automatically
    # when Gemini returns 429 or is unavailable. Empty = fallback disabled.
    #
    #   TEXT   → gpt-oss-120b  (fast, non-reasoning, ~2s per call)
    #   VISION → Kimi-K2.7-Code (reasoning model with strong vision capability)
    SYNTHETIC_API_KEY: str = ""
    SYNTHETIC_MODEL: str = "hf:openai/gpt-oss-120b"
    SYNTHETIC_VISION_MODEL: str = "hf:moonshotai/Kimi-K2.7-Code"

    # MongoDB Atlas (primary). Falls back to local SQLite file only if both
    # MONGO_URI is empty and a DATABASE_URL is explicitly provided.
    MONGO_URI: str = ""
    MONGO_DB_NAME: str = "foodsafe"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB}"

    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Shared secret checked against the `Authorization: Bearer <secret>` header
    # on Vercel Cron Job requests (see routers/cron.py). Leave empty locally.
    CRON_SECRET: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "https://foodsafe-api.onrender.com/api",
    ]

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"

    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_EMAIL: str = "mailto:admin@foodsafe.app"

    class Config:
        env_file = ENV_FILE
        extra = "ignore"

    def model_post_init(self, __context):
        if (
            self.APP_ENV != "development"
            and self.SECRET_KEY == "dev-secret-key-change-in-production"
        ):
            raise RuntimeError(
                "FATAL: SECRET_KEY must be changed in production! "
                "Set SECRET_KEY in your .env file."
            )
        if isinstance(self.CORS_ORIGINS, str):
            try:
                object.__setattr__(self, "CORS_ORIGINS", json.loads(self.CORS_ORIGINS))
            except Exception:
                object.__setattr__(self, "CORS_ORIGINS", [self.CORS_ORIGINS])


settings = Settings()
