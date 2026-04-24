"""
JWT Authentication Handler — Master Prompt V2.0
Token creation, validation, and refresh logic.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import HTTPException, status

from config import settings

logger = logging.getLogger(__name__)


def create_access_token(user_id: str, role: str) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: UUID of the user
        role: User role ('candidate', 'recruiter', 'admin')
    
    Returns:
        Encoded JWT token
    
    Raises:
        HTTPException: If token creation fails
    """
    try:
        payload = {
            "sub": user_id,
            "role": role,
            "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            "iat": datetime.utcnow(),
            "type": "access",
        }
        return jwt.encode(
            payload,
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM
        )
    except Exception as e:
        logger.error(f"Failed to create access token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token creation failed"
        )


def create_refresh_token(user_id: str) -> str:
    """
    Create a JWT refresh token (longer expiration).
    
    Args:
        user_id: UUID of the user
    
    Returns:
        Encoded JWT token
    
    Raises:
        HTTPException: If token creation fails
    """
    try:
        payload = {
            "sub": user_id,
            "exp": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            "iat": datetime.utcnow(),
            "type": "refresh",
        }
        return jwt.encode(
            payload,
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM
        )
    except Exception as e:
        logger.error(f"Failed to create refresh token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token creation failed"
        )


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_user_from_token(token: str) -> tuple[str, str]:
    """
    Extract user_id and role from token.
    
    Args:
        token: JWT token string
    
    Returns:
        Tuple of (user_id, role)
    
    Raises:
        HTTPException: If token is invalid
    """
    payload = decode_token(token)
    user_id = payload.get("sub")
    role = payload.get("role")
    
    if not user_id or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    return user_id, role
