import asyncio
import os
from datetime import datetime
from typing import Any, Awaitable, Callable

try:
    from bson import ObjectId
    from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
except ImportError:  # Local SQLite-only development remains usable.
    ObjectId = None
    AsyncIOMotorClient = None
    AsyncIOMotorGridFSBucket = None


MONGODB_URI = os.environ.get("MONGODB_URI")
MONGODB_DB = os.environ.get("MONGODB_DB", "freelance_platform")


def serialize_mongo(value: Any) -> Any:
    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize_mongo(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_mongo(item) for key, item in value.items()}
    return value


class MongoRuntime:
    def __init__(self) -> None:
        self.client = None
        self.db = None
        self.fs = None
        self.tasks: list[asyncio.Task] = []

    @property
    def enabled(self) -> bool:
        return self.client is not None and self.db is not None

    async def connect(self) -> None:
        if not MONGODB_URI or AsyncIOMotorClient is None:
            return
        self.client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.client[MONGODB_DB]
        self.fs = AsyncIOMotorGridFSBucket(self.db)
        await self.ensure_integrity()

    async def close(self) -> None:
        for task in self.tasks:
            task.cancel()
        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)
        if self.client:
            self.client.close()

    async def ensure_integrity(self) -> None:
        if not self.enabled:
            return
        await self.db.users.create_index("email", unique=True)
        await self.db.users.create_index("aadhaar.lookup_hash", unique=True, sparse=True)
        await self.db.sessions.create_index("expires_at", expireAfterSeconds=0)
        await self.db.jobs.create_index("title", partialFilterExpression={"status": "open"})
        await self.db.jobs.create_index("skills.name", partialFilterExpression={"status": "open"})
        await self.db.seekers.create_index("userId", unique=True)
        await self.db.seekers.create_index("aiProfile.personaArchetype")
        await self.db.applications.create_index("applicationId", unique=True)
        await self.db.applications.create_index([("jobPostId", 1), ("seekerId", 1)], unique=True)
        existing = await self.db.list_collection_names()
        if "decision_traces" not in existing:
            await self.db.create_collection(
                "decision_traces",
                capped=True,
                size=5 * 1024 * 1024 * 1024,
            )
        validator = {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["email"],
                "properties": {
                    "email": {"bsonType": "string"},
                    "resume": {
                        "bsonType": "object",
                        "properties": {
                            "file_id": {"bsonType": "objectId"},
                            "filename": {"bsonType": "string"},
                            "uploaded_at": {"bsonType": "date"},
                        },
                        "additionalProperties": False,
                    },
                    "aadhaar": {
                        "bsonType": "object",
                        "required": ["lookup_hash"],
                        "properties": {
                            "lookup_hash": {"bsonType": "string"},
                            "last_four": {
                                "bsonType": "string",
                                "pattern": "^[0-9]{4}$",
                            },
                        },
                        "additionalProperties": False,
                    },
                },
            }
        }
        try:
            await self.db.command({
                "collMod": "users",
                "validator": validator,
                "validationLevel": "strict",
                "validationAction": "error",
            })
        except Exception:
            if "users" not in existing:
                await self.db.create_collection(
                    "users",
                    validator=validator,
                    validationLevel="strict",
                    validationAction="error",
                )
            else:
                raise

    async def upload_resume(self, filename: str, content: bytes) -> dict[str, Any] | None:
        if not self.enabled or self.fs is None:
            return None
        file_id = await self.fs.upload_from_stream(filename, content)
        return {
            "file_id": str(file_id),
            "filename": filename,
            "uploaded_at": datetime.utcnow().isoformat(),
        }

    def start_watchers(self, broadcast: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        if not self.enabled:
            return
        self.tasks.extend([
            asyncio.create_task(self._watch_collection("users", "USER_UPDATE", broadcast)),
            asyncio.create_task(self._watch_collection("job_matches", "JOB_MATCH_UPDATE", broadcast)),
        ])

    async def _watch_collection(
        self,
        collection_name: str,
        event_type: str,
        broadcast: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        collection = self.db[collection_name]
        while True:
            try:
                async with collection.watch(full_document="updateLookup") as stream:
                    async for change in stream:
                        if change.get("operationType") in {"insert", "update", "replace"}:
                            await broadcast({
                                "type": event_type,
                                "data": serialize_mongo(change.get("fullDocument", {})),
                                "timestamp": datetime.utcnow().isoformat(),
                            })
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(5)


mongo_runtime = MongoRuntime()
