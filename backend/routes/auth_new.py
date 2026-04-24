"""
Auth Router — Master Prompt V2.0
Endpoints: register, login, refresh, logout, me
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database_new import get_db
from models.user_new import User
from schemas.auth import (
    AuthRegisterRequest,
    AuthLoginRequest,
    AuthRegisterResponse,
    AuthLoginResponse,
    AuthMeResponse,
)
from auth.jwt_handler import create_access_token, create_refresh_token, decode_token
from auth.dependencies import get_current_user
from utils.password import hash_password, verify_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Cookie configuration
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"
REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


@router.post(
    "/register",
    response_model=AuthRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="User Registration",
    description="Register a new candidate account"
)
async def register(
    request: AuthRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account.
    
    - **email**: Must be valid email address
    - **password**: Minimum 8 characters
    - **full_name**: User's full name
    
    Returns JWT access token and user data.
    Refresh token stored in HttpOnly cookie.
    """
    
    # Check if email already exists
    result = await db.execute(select(User).filter(User.email == request.email.lower()))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        logger.warning(f"Registration attempt with existing email: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EMAIL_EXISTS",
                "message": "Email already registered. Try logging in instead."
            }
        )
    
    # Create new user
    try:
        new_user = User(
            email=request.email.lower(),
            password_hash=hash_password(request.password),
            full_name=request.full_name,
            role="candidate",  # New registrations default to candidate
            is_verified=False,
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        logger.info(f"New user registered: {new_user.email}")
    except Exception as e:
        await db.rollback()
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User creation failed"
        )
    
    # Generate tokens
    access_token = create_access_token(str(new_user.id), new_user.role)
    
    return AuthRegisterResponse(
        message="Account created successfully",
        user=AuthMeResponse.model_validate(new_user),
        access_token=access_token
    )


@router.post(
    "/login",
    response_model=AuthLoginResponse,
    summary="User Login",
    description="Login with email and password"
)
async def login(
    request: AuthLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email and password.
    
    Returns:
    - **access_token**: JWT for subsequent requests (15 min expiry)
    - **refresh_token**: HttpOnly cookie (7 day expiry)
    
    Set Authorization header to: `Bearer {access_token}`
    """
    
    # Find user by email (case-insensitive)
    result = await db.execute(select(User).filter(User.email == request.email.lower()))
    user = result.scalar_one_or_none()
    
    if not user:
        logger.warning(f"Login attempt with unknown email: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password"
            }
        )
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        logger.warning(f"Login failed for {user.email}: invalid password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password"
            }
        )
    
    # Generate tokens
    access_token = create_access_token(str(user.id), user.role)
    refresh_token = create_refresh_token(str(user.id))
    
    # Set refresh token in HttpOnly cookie
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_TOKEN_COOKIE_MAX_AGE,
        httponly=True,
        secure=False,  # Set to True in production (https only)
        samesite="lax",
    )
    
    logger.info(f"User logged in: {user.email}")
    
    return AuthLoginResponse(
        access_token=access_token,
        user=AuthMeResponse.model_validate(user)
    )


@router.post(
    "/refresh",
    response_model=AuthLoginResponse,
    summary="Refresh Access Token",
    description="Get a new access token using refresh token"
)
async def refresh(
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using the refresh token from HttpOnly cookie.
    
    Returns new access token (15 min expiry).
    Refresh token cookie is automatically sent by browser.
    """
    
    # Get refresh token from cookie
    refresh_token = http_request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "NO_REFRESH_TOKEN",
                "message": "Refresh token not found. Please login again."
            }
        )
    
    # Validate refresh token and extract user_id
    try:
        payload = decode_token(refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
    except HTTPException:
        raise
    
    # Fetch user
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Generate new access token
    access_token = create_access_token(str(user.id), user.role)
    
    logger.info(f"Token refreshed for: {user.email}")
    
    return AuthLoginResponse(
        access_token=access_token,
        user=AuthMeResponse.model_validate(user)
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout",
    description="Logout and invalidate refresh token"
)
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user)
):
    """
    Logout by clearing the refresh token cookie.
    
    Frontend should also discard the access token from local storage/memory.
    """
    
    # Clear refresh token cookie
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        httponly=True,
        secure=False,  # Set to True in production
        samesite="lax",
    )
    
    logger.info(f"User logged out: {current_user.email}")
    return None


@router.get(
    "/me",
    response_model=AuthMeResponse,
    summary="Get Current User",
    description="Get current authenticated user profile"
)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Get the current authenticated user's profile.
    
    Requires valid JWT in Authorization header.
    """
    return AuthMeResponse.model_validate(current_user)
