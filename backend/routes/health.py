"""
Health check routes
"""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db
from services.health import get_health_status

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Health check endpoint
    
    Returns overall system status:
    - healthy: Mongo + Redis ok
    - degraded: Mongo ok, Redis unavailable
    - down: Mongo unavailable (can't operate)
    """
    return await get_health_status(db)
