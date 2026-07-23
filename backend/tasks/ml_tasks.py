from tasks import celery_app

@celery_app.task(name="tasks.ml_tasks.retrain_risk_model")
def retrain_risk_model():
    """
    Weekly model retraining using accumulated scan data.
    Exports updated risk weights to ml/models/risk_weights.json
    """
    import asyncio, json, os
    from app.db.database import _get_database
    from models.models import SCAN_RECORDS

    async def _run():
        database = _get_database()
        rows = await database[SCAN_RECORDS].aggregate([
            {"$group": {
                "_id": {"food": "$food_name", "risk": "$risk_level"},
                "count": {"$sum": 1},
                "avg_score": {"$avg": "$safety_score"},
            }},
        ])

        # Aggregate: food → average community risk score
        food_stats = {}
        for row in rows:
            name = (row["_id"] or {}).get("food")
            if not name:
                continue
            name = name.lower().strip()
            if name not in food_stats:
                food_stats[name] = {"count": 0, "total_score": 0}
            count = row.get("count", 0)
            food_stats[name]["count"]       += count
            food_stats[name]["total_score"] += (row.get("avg_score") or 50) * count

        weights = {
            name: round(stats["total_score"] / stats["count"], 1)
            for name, stats in food_stats.items() if stats["count"] > 0
        }

        out_path = os.path.join(os.path.dirname(__file__), "../ml/models/risk_weights.json")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w") as f:
            json.dump(weights, f, indent=2)

        return f"Retrained on {len(weights)} food items"

    return asyncio.run(_run())
