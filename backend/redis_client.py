"""Redis client with graceful degradation support."""

import logging
from typing import Optional

import redis.asyncio as redis

from config import settings

logger = logging.getLogger(__name__)


class RedisState:
    """Global Redis availability state."""

    available: bool = False


redis_state = RedisState()
redis_client: Optional[redis.Redis] = None


async def connect_to_redis() -> None:
    """Initialize Redis client and update degraded state if unavailable."""
    global redis_client

    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        decode_responses=True,
        socket_connect_timeout=settings.REDIS_TIMEOUT_MS / 1000,
    )

    try:
        await redis_client.ping()
        redis_state.available = True
        logger.info("Redis connection successful")
    except Exception:
        redis_state.available = False
        logger.exception("Redis unavailable, running in degraded mode")


async def disconnect_from_redis() -> None:
    """Close Redis connection."""
    global redis_client

    if redis_client is not None:
        await redis_client.aclose()
    redis_client = None
    redis_state.available = False
    logger.info("Redis connection closed")


async def get_redis() -> Optional[redis.Redis]:
    """Return Redis client if healthy, otherwise None."""
    if not redis_state.available:
        return None
    return redis_client


async def set_cache(key: str, value: str, ttl_seconds: int = 3600) -> bool:
    """Cache set helper with degraded-mode handling."""
    if not redis_state.available:
        return False

    try:
        client = await get_redis()
        if client is None:
            return False
        await client.set(key, value, ex=ttl_seconds)
        return True
    except Exception:
        redis_state.available = False
        logger.exception("Cache set failed; switching Redis to degraded mode")
        return False


async def get_cache(key: str) -> Optional[str]:
    """Cache get helper with degraded-mode handling."""
    if not redis_state.available:
        return None

    try:
        client = await get_redis()
        if client is None:
            return None
        return await client.get(key)
    except Exception:
        redis_state.available = False
        logger.exception("Cache get failed; switching Redis to degraded mode")
        return None


async def delete_cache(key: str) -> bool:
    """Cache delete helper with degraded-mode handling."""
    if not redis_state.available:
        return False

    try:
        client = await get_redis()
        if client is None:
            return False
        await client.delete(key)
        return True
    except Exception:
        redis_state.available = False
        logger.exception("Cache delete failed; switching Redis to degraded mode")
        return False
