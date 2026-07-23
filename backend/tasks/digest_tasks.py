"""
tasks/digest_tasks.py

Weekly overconsumption digest task.
Runs every Sunday at 9am IST (scheduled in tasks/__init__.py).
"""

import logging
from datetime import datetime, timedelta

from tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.digest_tasks.send_weekly_digest", bind=True, max_retries=1)
def send_weekly_digest(self):
    """Fetch active users, build 7-day overconsumption digests, send to those with warnings."""
    import asyncio

    async def _run() -> str:
        from app.db.database import _get_database
        from models.models import USERS, SCAN_RECORDS
        from services.overconsumption_service import build_weekly_digest

        cutoff = datetime.utcnow() - timedelta(days=7)
        database = _get_database()
        sent = 0
        skipped = 0

        # Find users who have scanned in the last 7 days
        active_rows = await database[SCAN_RECORDS].aggregate([
            {"$match": {"created_at": {"$gte": cutoff}, "user_id": {"$ne": None}}},
            {"$group": {"_id": "$user_id"}},
        ])
        user_ids = [r["_id"] for r in active_rows if r.get("_id")]
        logger.info("Digest: found %d active users", len(user_ids))

        for user_id in user_ids:
            try:
                user_doc = await database[USERS].find_one({"id": user_id})
                if not user_doc:
                    skipped += 1
                    continue
                user_name = user_doc.get("name", "there")

                scan_docs = await database[SCAN_RECORDS].find({
                    "user_id": user_id,
                    "created_at": {"$gte": cutoff},
                }).sort("created_at", -1).limit(500).to_list(length=500)
                scan_records = [
                    {"food_name": s.get("food_name"), "created_at": s.get("created_at")}
                    for s in scan_docs
                ]

                digest = build_weekly_digest(scan_records)
                if digest["safe"]:
                    skipped += 1
                    continue

                message = _format_whatsapp_message(user_name, digest)
                phone = user_doc.get("phone")
                if phone:
                    _send_whatsapp(phone, message)
                    sent += 1
                else:
                    logger.info("Digest for %s (no phone): %d warnings",
                                user_name, len(digest["topWarnings"]))
                    sent += 1

            except Exception as e:
                logger.warning("Digest failed for user %s: %s", user_id, e)
                skipped += 1

        summary = f"Weekly digest: {sent} sent, {skipped} skipped"
        logger.info(summary)
        return summary

    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error("Digest task failed: %s", exc)
        raise self.retry(exc=exc, countdown=600)


def _format_whatsapp_message(name: str, digest: dict) -> str:
    lines = [
        f"👋 Hi {name}! Here's your FoodSafe weekly health digest ({digest['period']}).",
        f"You scanned {digest['totalScans']} food items this week.\n",
    ]

    if digest["topWarnings"]:
        lines.append("⚠️ *Overconsumption warnings:*")
        for w in digest["topWarnings"]:
            lines.append(f"  {w['icon']} {w['label']}: {w['count']} servings (limit: {w['limit']}/week)")
        lines.append("")

    approaching = [v for v in digest["categories"].values() if v["status"] == "approaching"]
    if approaching:
        lines.append("📊 *Approaching limits:*")
        for v in approaching:
            lines.append(f"  {v['icon']} {v['label']}: {v['pct']}% of weekly limit")
        lines.append("")

    lines.append("💡 Tip: Variety in your diet reduces overexposure to any single risk category.")
    lines.append("\nStay safe 🛡️ — Team FoodSafe")
    return "\n".join(lines)


def _send_whatsapp(phone: str, message: str) -> None:
    try:
        from twilio.rest import Client
        from app.core.config import settings

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            from_=settings.TWILIO_WHATSAPP_FROM,
            to=f"whatsapp:{phone}",
            body=message,
        )
        logger.info("WhatsApp digest sent to %s", phone)
    except Exception as e:
        logger.warning("WhatsApp send failed for %s: %s", phone, e)
