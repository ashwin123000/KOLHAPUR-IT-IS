"""User and auth models for Architect-X identity layer."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator




class AadhaarRecord(BaseModel):
    """Stored Aadhaar security fields."""

    lookup_hash: str
    secure_hash: str
    salt: str
    last_four: str


# ---------------------------------------------------------------------------
# Auth — Register
# ---------------------------------------------------------------------------

class AuthRegisterRequest(BaseModel):
    """Registration payload."""

    name: str
    email: EmailStr
    password: str
    aadhaar: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty")
        return cleaned


# ---------------------------------------------------------------------------
# Auth — Send OTP
# ---------------------------------------------------------------------------

class AuthSendOTPRequest(BaseModel):
    """Send-OTP payload."""

    email: EmailStr


# ---------------------------------------------------------------------------
# Auth — Verify OTP
# ---------------------------------------------------------------------------

class AuthVerifyOTPRequest(BaseModel):
    """Verify-OTP payload."""

    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


# ---------------------------------------------------------------------------
# Auth — Login
# ---------------------------------------------------------------------------

class AuthLoginRequest(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class AuthTokenResponse(BaseModel):
    """JWT response payload."""

    access_token: str
    token_type: str = "bearer"
    user: dict | None = None


class AuthMeResponse(BaseModel):
    """Current user response."""

    id: str
    email: EmailStr
    name: str
    registration_complete: bool = True


# ---------------------------------------------------------------------------
# User document models
# ---------------------------------------------------------------------------

class UserUpdate(BaseModel):
    """Update user payload."""

    name: Optional[str] = None


class UserResponse(BaseModel):
    """User response payload."""

    id: str = Field(alias="_id")
    email: EmailStr
    name: str
    schema_version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(populate_by_name=True)


class UserDocument(BaseModel):
    """MongoDB user document format (full internal representation)."""

    id: str = Field(alias="_id")
    email: EmailStr
    name: str
    password_hash: str
    aadhaar: AadhaarRecord
    is_verified: bool = False
    otp: Optional[str] = None
    otp_expiry: Optional[datetime] = None
    schema_version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(populate_by_name=True)
