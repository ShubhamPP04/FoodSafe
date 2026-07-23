"""
backend/routers/cron.py

Replaces Celery Beat scheduling for platforms with no long-running worker
(e.g. Vercel serverless). These endpoints run the exact same task bodies
that Celery would have run — just triggered by an HTTP GET instead of a
broker — via `<task>.run()`, which executes the task function synchronously
in-process without needing Redis or a Celery worker.

Wire these up with Vercel Cron Jobs in vercel.json, e.g.:

    { "path": "/api/cron/scraper", "schedule": "30 0 * * 1" }

Protect them by setting a CRON_SECRET env var — Vercel Cron requests send
`Authorization: Bearer <CRON_SECRET>` automatically when that env var is
configured on the project. If CRON_SECRET is unset (local/dev), the check
is skipped.
"""

import logging

from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _verify_cron(request: Request) -> None:
    secret = settings.CRON_SECRET
    if not secret:
        return
    auth = request.headers.get("authorization", "")
    if auth != f"Bearer {secret}":
        raise HTTPException(401, "Unauthorized")


@router.get("/scraper")
async def cron_scraper(request: Request):
    """Weekly FSSAI + news scraper → LLM parse → dedupe → save → re-index RAG."""
    _verify_cron(request)
    from tasks.scraper_tasks import run_fssai_scraper

    try:
        result = run_fssai_scraper.run()
    except Exception as e:
        logger.exception("Cron scraper failed")
        raise HTTPException(500, str(e))
    return {"ok": True, "result": result}


@router.get("/retrain")
async def cron_retrain(request: Request):
    """Weekly community risk weight retraining from accumulated scan data."""
    _verify_cron(request)
    from tasks.ml_tasks import retrain_risk_model

    try:
        result = retrain_risk_model.run()
    except Exception as e:
        logger.exception("Cron retrain failed")
        raise HTTPException(500, str(e))
    return {"ok": True, "result": result}


@router.get("/digest")
async def cron_digest(request: Request):
    """Weekly overconsumption digest to active users."""
    _verify_cron(request)
    from tasks.digest_tasks import send_weekly_digest

    try:
        result = send_weekly_digest.run()
    except Exception as e:
        logger.exception("Cron digest failed")
        raise HTTPException(500, str(e))
    return {"ok": True, "result": result}
