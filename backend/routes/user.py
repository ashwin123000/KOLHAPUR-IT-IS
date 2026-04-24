"""User routes."""

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from database import get_db
from models.user import UserResponse, UserUpdate
from services.version_check import (
    VersionMismatchError,
    validate_schema,
)

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Fetch single user by id."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id",
        )

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    try:
        validate_schema(user, "users")
    except VersionMismatchError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    user["_id"] = str(user["_id"])
    return UserResponse(**user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update user with schema enforcement."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id",
        )

    update_data = user_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )
    update_data["updated_at"] = datetime.utcnow()

    updated = await db["users"].find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    try:
        validate_schema(updated, "users")
    except VersionMismatchError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    updated["_id"] = str(updated["_id"])
    return UserResponse(**updated)
