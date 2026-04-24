"""
FastAPI Dependencies — Master Prompt V2.0
Reusable dependency functions for endpoints.
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database_new import get_db
from auth.jwt_handler import extract_user_from_token
from models.user_new import User

logger = logging.getLogger(__name__)

security = HTTPBearer()


class HTTPAuthCredentials:
    """Simple HTTP Auth Credentials holder."""
    def __init__(self, scheme: str, credentials: str):
        self.scheme = scheme
        self.credentials = credentials


async def get_current_user(
    credentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency: Extract and validate current user from JWT token.
    
    Usage:
        @app.get("/profile")
        async def get_profile(current_user = Depends(get_current_user)):
            return current_user
    
    Args:
        credentials: HTTP Bearer token from request header
        db: Database session
    
    Returns:
        User object from database
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    try:
        user_id, role = extract_user_from_token(credentials.credentials)
    except HTTPException:
        raise
    
    # Fetch user from database
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Dependency: Extract current user if token provided, otherwise None.
    
    Usage for optional auth:
        @app.get("/public")
        async def public_endpoint(current_user = Depends(get_current_user_optional)):
            if current_user:
                return {"message": f"Hello {current_user.email}"}
            return {"message": "Hello guest"}
    """
    if not credentials:
        return None
    
    try:
        user_id, role = extract_user_from_token(credentials.credentials)
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        return user
    except HTTPException:
        return None


async def get_current_recruiter(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency: Ensure current user is a recruiter.
    
    Usage:
        @app.post("/jobs/create")
        async def create_job(recruiter = Depends(get_current_recruiter)):
            # Only recruiters can create jobs
            pass
    """
    if current_user.role not in ["recruiter", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can access this endpoint",
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency: Ensure current user is an admin.
    
    Usage:
        @app.get("/admin/dashboard")
        async def admin_dashboard(admin = Depends(get_current_admin)):
            # Only admins can access
            pass
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
