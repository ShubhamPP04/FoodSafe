"""
FoodSafe database layer — MongoDB Atlas via Motor.

Exposes a thin session wrapper (`MongoSession`) that mimics the most common
SQLAlchemy ORM patterns used in this app (insert_one returning a doc, find_one,
find list, count, update, delete, aggregate), so routers stay readable.

A `db` object with named collections is also exported for direct use where the
session wrapper isn't ergonomic (aggregations, bulk writes).
"""
from typing import Optional, Any, AsyncIterator
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from app.core.config import settings
import uuid


# ── Motor client / database ─────────────────────────────────────────────────
_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


def _get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        if not settings.MONGO_URI:
            raise RuntimeError(
                "MONGO_URI is not configured. Set it in backend/.env "
                "(mongodb+srv://...) to use MongoDB Atlas."
            )
        _client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=10000,
            retryWrites=True,
        )
    return _client


def _get_database() -> AsyncIOMotorDatabase:
    global _database
    if _database is None:
        _database = _get_client()[settings.MONGO_DB_NAME]
    return _database


class _Collections:
    """Lazy accessor for typed collection references."""
    @property
    def users(self) -> AsyncIOMotorCollection: return _get_database()["users"]
    @property
    def refresh_tokens(self) -> AsyncIOMotorCollection: return _get_database()["refresh_tokens"]
    @property
    def family_members(self) -> AsyncIOMotorCollection: return _get_database()["family_members"]
    @property
    def scan_records(self) -> AsyncIOMotorCollection: return _get_database()["scan_records"]
    @property
    def community_reports(self) -> AsyncIOMotorCollection: return _get_database()["community_reports"]
    @property
    def fssai_violations(self) -> AsyncIOMotorCollection: return _get_database()["fssai_violations"]
    @property
    def safe_brands(self) -> AsyncIOMotorCollection: return _get_database()["safe_brands"]
    @property
    def push_subscriptions(self) -> AsyncIOMotorCollection: return _get_database()["push_subscriptions"]


db = _Collections()


# ── Session wrapper ─────────────────────────────────────────────────────────
def gen_id() -> str:
    return str(uuid.uuid4())


def _normalize_doc(doc: Optional[dict]) -> Optional[dict]:
    """Convert ObjectId/_id to string id, ensure datetime fields are datetimes."""
    if doc is None:
        return None
    if "_id" in doc and "id" not in doc:
        doc["id"] = str(doc["_id"])
    return doc


class MongoSession:
    """
    Thin async wrapper around a Motor database that mimics the SQLAlchemy
    session patterns used throughout this app.

    Insert helpers inject a UUID `id` and `created_at` automatically when the
    caller didn't supply them, mirroring the old ORM column defaults.
    """

    def __init__(self, database: AsyncIOMotorDatabase):
        self._db = database

    def __getitem__(self, name: str) -> AsyncIOMotorCollection:
        return self._db[name]

    # ── Inserts ────────────────────────────────────────────────────────────
    async def insert(self, collection: str, doc: dict) -> dict:
        """Insert one document; returns the doc with id + created_at populated."""
        col = self._db[collection]
        doc.setdefault("id", gen_id())
        if "created_at" not in doc:
            doc["created_at"] = datetime.utcnow()
        await col.insert_one(doc)
        return doc

    async def insert_many(self, collection: str, docs: list[dict]) -> list[dict]:
        col = self._db[collection]
        now = datetime.utcnow()
        for d in docs:
            d.setdefault("id", gen_id())
            d.setdefault("created_at", now)
        if docs:
            await col.insert_many(docs)
        return docs

    # ── Reads ──────────────────────────────────────────────────────────────
    async def find_one(self, collection: str, filter: dict) -> Optional[dict]:
        return _normalize_doc(await self._db[collection].find_one(filter))

    async def find(
        self,
        collection: str,
        filter: Optional[dict] = None,
        *,
        sort: Optional[list] = None,
        limit: int = 0,
        skip: int = 0,
        projection: Optional[dict] = None,
    ) -> list[dict]:
        cursor = self._db[collection].find(filter or {}, projection=projection)
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
        return [_normalize_doc(d) for d in await cursor.to_list(length=limit if limit else None)]

    async def count(self, collection: str, filter: Optional[dict] = None) -> int:
        return await self._db[collection].count_documents(filter or {})

    async def aggregate(self, collection: str, pipeline: list[dict]) -> list[dict]:
        return [d async for d in self._db[collection].aggregate(pipeline)]

    # ── Updates ────────────────────────────────────────────────────────────
    async def update_one(self, collection: str, filter: dict, update: dict, *, upsert: bool = False) -> int:
        """Returns matched_count."""
        if "$set" not in update and "$inc" not in update and "$unset" not in update:
            update = {"$set": update}
        result = await self._db[collection].update_one(filter, update, upsert=upsert)
        return result.matched_count

    async def update_many(self, collection: str, filter: dict, update: dict) -> int:
        if "$set" not in update and "$inc" not in update and "$unset" not in update:
            update = {"$set": update}
        result = await self._db[collection].update_many(filter, update)
        return result.modified_count

    # ── Deletes ────────────────────────────────────────────────────────────
    async def delete_many(self, collection: str, filter: dict) -> int:
        result = await self._db[collection].delete_many(filter)
        return result.deleted_count

    async def delete_one(self, collection: str, filter: dict) -> int:
        result = await self._db[collection].delete_one(filter)
        return result.deleted_count

    # ── Compatibility shims (no-ops matching old SQLAlchemy session API) ───
    async def flush(self):
        pass  # Motor writes are immediate; nothing to flush.

    async def commit(self):
        pass  # Motor writes are auto-committed; nothing to commit.

    async def rollback(self):
        pass  # No multi-statement transactions in this app.


async def get_db() -> AsyncIterator[MongoSession]:
    """FastAPI dependency yielding a MongoSession."""
    session = MongoSession(_get_database())
    try:
        yield session
    except Exception:
        await session.rollback()
        raise


# ── Startup hook — indexes ──────────────────────────────────────────────────
async def init_db():
    """
    Ping the cluster and create the indexes that enforce uniqueness and speed
    up the queries this app runs. Idempotent — safe to call on every boot.
    """
    client = _get_client()
    database = _get_database()

    # Fail fast if Atlas isn't reachable.
    await client.admin.command("ping")

    await database["users"].create_index("email", unique=True)
    await database["users"].create_index("id")
    await database["refresh_tokens"].create_index("token_hash", unique=True)
    await database["refresh_tokens"].create_index("user_id")
    await database["scan_records"].create_index("id")
    await database["scan_records"].create_index("user_id")
    await database["scan_records"].create_index([("user_id", 1), ("food_name", 1)])
    await database["community_reports"].create_index("id")
    await database["community_reports"].create_index("city")
    await database["fssai_violations"].create_index("id")
    await database["fssai_violations"].create_index("state")
    await database["safe_brands"].create_index("food_category")
    await database["push_subscriptions"].create_index("endpoint", unique=True)
    await database["push_subscriptions"].create_index("user_id")
