"""
Pydantic Request/Response Schemas — Auth
Master Prompt V2.0 - Auth Endpoints
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class AuthRegisterRequest(BaseModel):
    """Registration request payload."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: str = Field(..., min_length=1, max_length=255)


class AuthLoginRequest(BaseModel):
    """Login request payload."""
    email: EmailStr
    password: str


class AuthRefreshRequest(BaseModel):
    """Token refresh request (refresh token in cookie)."""
    pass  # Refresh token comes from HttpOnly cookie


# ============================================================
# RESPONSE SCHEMAS
# ============================================================

class UserResponse(BaseModel):
    """User data response."""
    id: str
    email: str
    full_name: Optional[str]
    role: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AuthRegisterResponse(BaseModel):
    """Registration response."""
    message: str
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class AuthLoginResponse(BaseModel):
    """Login response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AuthRefreshResponse(BaseModel):
    """Token refresh response."""
    access_token: str
    token_type: str = "bearer"


class AuthMeResponse(BaseModel):
    """Current user profile response."""
    id: str
    email: str
    full_name: Optional[str]
    role: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    """Standard error response."""
    code: str
    message: str
    detail: Optional[dict] = None
