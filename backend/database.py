"""MongoDB connection setup using Motor (async).

Spec compliance:
- Connection string: mongodb://localhost:27017/?replicaSet=rs0&directConnection=true
- Database: architectx
- Collection: users
- On success: print "Mongo Connected ✅"
- On failure: crash (no fallback)
- Unique index on users.email
"""

import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import WriteConcern
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from config import settings

logger = logging.getLogger(__name__)

_db_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


async def connect_to_db() -> AsyncIOMotorDatabase:
    """Connect to MongoDB, create indexes, and confirm connection.

    Raises:
        ConnectionFailure / ServerSelectionTimeoutError: propagated so the
        lifespan handler can crash the application — no fallback.
    """
    global _db_client, _database

    if _database is not None:
        return _database

    logger.info("Connecting to MongoDB: %s", settings.MONGO_URL)
    try:
        _db_client = AsyncIOMotorClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=settings.MONGO_TIMEOUT_MS,
            retryWrites=True,
        )
        # Ping verifies an actual round-trip to the server
        await _db_client.admin.command("ping")

        _database = _db_client.get_database(
            settings.MONGO_DB_NAME,
            write_concern=WriteConcern("majority"),
        )
        await _setup_indexes(_database)

        # Mandatory startup print per spec §10 / §2
        # NOTE: Avoid non-ASCII chars to prevent Windows console UnicodeEncodeError.
        print("Mongo Connected")
        logger.info("MongoDB connection successful — db=%s", settings.MONGO_DB_NAME)
        return _database

    except (ConnectionFailure, ServerSelectionTimeoutError):
        logger.exception("MongoDB connection failed — crashing application per spec §11")
        raise


async def disconnect_from_db() -> None:
    """Close MongoDB connection gracefully."""
    global _db_client, _database

    if _db_client is not None:
        _db_client.close()
    _db_client = None
    _database = None
    logger.info("MongoDB connection closed")


async def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency: return the active database handle.

    Raises:
        RuntimeError: if called before connect_to_db() succeeds.
    """
    if _database is None:
        raise RuntimeError("Database not initialized. Call connect_to_db() first.")
    return _database


# ---------------------------------------------------------------------------
# Index setup
# ---------------------------------------------------------------------------

async def _setup_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create / ensure all required collection indexes."""

    # ── users ──────────────────────────────────────────────────────────────
    users_col = db["users"]
    # Spec §3: unique index on email
    await users_col.create_index("email", unique=True)
    # Sparse unique index for Aadhaar lookup (sparse = ignores docs without field)
    await users_col.create_index("aadhaar.lookup_hash", unique=True, sparse=True)

    # ── jobs ───────────────────────────────────────────────────────────────
    jobs_col = db["jobs"]
    await jobs_col.create_index("company_id")
    await jobs_col.create_index("status")

    # ── job_matches ────────────────────────────────────────────────────────
    matches_col = db["job_matches"]
    await matches_col.create_index([("user_id", 1), ("job_id", 1)], unique=True)
    await matches_col.create_index("match_score")

    logger.info("MongoDB indexes verified / created")
