"""Health check service."""

import logging
from typing import Dict
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis_client import redis_state

logger = logging.getLogger(__name__)


async def get_health_status(db: AsyncIOMotorDatabase) -> Dict[str, str]:
    """
    Get overall health status
    
    Returns JSON-compatible status payload:
    {
      "mongo": "ok" | "down",
      "redis": "ok" | "degraded",
      "status": "healthy" | "degraded" | "down"
    }
    """
    health = {
        "mongo": "down",
        "redis": "degraded" if not redis_state.available else "ok",
        "status": "down",
    }

    # Check MongoDB
    try:
        await db.client.admin.command("ping")
        health["mongo"] = "ok"
    except Exception as e:
        health["mongo"] = "down"
        logger.error(f"MongoDB health check failed: {e}")

    # Determine overall status
    if health["mongo"] == "ok" and health["redis"] == "ok":
        health["status"] = "healthy"
    elif health["mongo"] == "ok" and health["redis"] == "degraded":
        health["status"] = "degraded"
    else:
        health["status"] = "down"

    return health
