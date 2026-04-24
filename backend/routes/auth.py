"""Authentication routes — Register, Send OTP, Verify OTP, Login, Me."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.user import (
    AuthLoginRequest,
    AuthMeResponse,
    AuthRegisterRequest,
    AuthSendOTPRequest,
    AuthTokenResponse,
    AuthVerifyOTPRequest,
)
from services.auth_service import (
    AuthConflictError,
    AuthEmailError,
    AuthError,
    AuthOTPError,
    AuthRateLimitError,
    AuthUnauthorizedError,
    AuthValidationError,
    get_current_user_from_token,
    login_user,
    send_otp,
    verify_otp,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: AuthRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Register a new user (unverified). Email OTP verification required before login."""
    print("Register hit")
    try:
        existing = await db.users.find_one({"email": str(payload.email)})
        if existing:
            raise HTTPException(status_code=409, detail="Email already exists")

        import hashlib

        password_hash = hashlib.sha256(payload.password.encode()).hexdigest()

        user = {
            "name": payload.name,
            "email": str(payload.email),
            "password_hash": password_hash,
            "is_verified": False,
            "schema_version": 1,
        }

        result = await db.users.insert_one(user)
        print("User inserted:", result.inserted_id)
        print(await db.users.find_one({"email": str(payload.email)}))

        return {
            "success": True,
            "data": {"id": str(result.inserted_id), "email": str(payload.email)},
        }
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", str(e))
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal Error: {str(e)}",
        )


# ---------------------------------------------------------------------------
# POST /auth/send-otp
# ---------------------------------------------------------------------------

@router.post("/send-otp", status_code=status.HTTP_200_OK)
async def send_otp_route(
    payload: AuthSendOTPRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Generate a 6-digit OTP and attempt email delivery without crashing."""
    try:
        await send_otp(db=db, email=str(payload.email))
        return {"message": "OTP sent successfully. Check your inbox."}
    except AuthValidationError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AuthEmailError as exc:
        logger.exception("OTP email delivery failed")
        return {
            "message": "OTP generated (email failed - dev mode)",
            "dev_otp": getattr(exc, "dev_otp", None),
            "email_error": str(exc),
        }
    except AuthError as exc:
        logger.exception("send-otp failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /auth/verify-otp
# ---------------------------------------------------------------------------

@router.post("/verify-otp", status_code=status.HTTP_200_OK)
async def verify_otp_route(
    payload: AuthVerifyOTPRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Verify OTP, mark account as verified, clear OTP fields."""
    try:
        await verify_otp(db=db, email=str(payload.email), otp=payload.otp)
        return {"message": "Email verified successfully. You can now log in."}
    except AuthOTPError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AuthValidationError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AuthError as exc:
        logger.exception("verify-otp failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP verification failed.",
        ) from exc


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=AuthTokenResponse)
async def login(
    payload: AuthLoginRequest,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Login and issue a 24-hour JWT. Requires is_verified=True."""
    client_ip = request.client.host if request.client else "unknown"
    identity_key = f"{str(payload.email).lower()}:{client_ip}"

    try:
        token = await login_user(
            db=db,
            email=str(payload.email),
            password=payload.password,
            identity_key=identity_key,
        )
        return AuthTokenResponse(**token)
    except AuthRateLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)
        ) from exc
    except AuthUnauthorizedError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    except AuthValidationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except AuthError as exc:
        logger.exception("Login failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed.",
        ) from exc


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=AuthMeResponse)
async def me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get current user from JWT Bearer token."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token.",
        )

    try:
        user = await get_current_user_from_token(db=db, token=credentials.credentials)
        return AuthMeResponse(**user)
    except AuthUnauthorizedError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    except AuthValidationError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except AuthError as exc:
        logger.exception("Could not fetch user profile")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch user profile.",
        ) from exc
