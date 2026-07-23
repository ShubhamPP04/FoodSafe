"""
FoodSafe — collection name constants + minimal user wrapper for auth deps.

With MongoDB we have no SQLAlchemy ORM models. Routers use the collection
names below via `MongoSession` / the `db` object. The User class here is a
lightweight attribute bag returned by the auth dependency so existing
`user.id`, `user.email`, etc. accesses in routers keep working.
"""
from typing import Optional
from datetime import datetime


# Collection names — keep in sync with app/db/database.py `_Collections`.
USERS = "users"
REFRESH_TOKENS = "refresh_tokens"
FAMILY_MEMBERS = "family_members"
SCAN_RECORDS = "scan_records"
COMMUNITY_REPORTS = "community_reports"
FSSAI_VIOLATIONS = "fssai_violations"
SAFE_BRANDS = "safe_brands"
PUSH_SUBSCRIPTIONS = "push_subscriptions"


class User:
    """Attribute-bag wrapper around a user document for auth deps."""
    def __init__(self, doc: dict):
        self.id         = doc.get("id") or str(doc.get("_id"))
        self.name       = doc.get("name", "")
        self.email      = doc.get("email", "")
        self.hashed_pw  = doc.get("hashed_pw", "")
        self.city       = doc.get("city", "")
        self.state      = doc.get("state", "Delhi")
        self.lang       = doc.get("lang", "en")
        self.created_at = doc.get("created_at") or datetime.utcnow()


def user_from_doc(doc: Optional[dict]) -> Optional[User]:
    return User(doc) if doc else None
