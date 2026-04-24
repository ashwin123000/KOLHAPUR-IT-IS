"""Authentication service layer for register, OTP, and login flows."""

import logging
import random
import string
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from config import settings
from services.aadhaar_service import build_aadhaar_payload
from services.email_service import EmailDeliveryError, send_otp_email
from services.version_check import VersionMismatchError, inject_schema_version, validate_schema
from utils.jwt_handler import create_access_token, decode_access_token
from utils.security import hash_password, verify_password

logger = logging.getLogger(__name__)


class AuthError(Exception):
    """Base auth exception."""


class AuthConflictError(AuthError):
    """Raised for duplicate identity conflicts."""


class AuthValidationError(AuthError):
    """Raised for invalid auth input."""


class AuthUnauthorizedError(AuthError):
    """Raised for unauthorized access."""


class AuthRateLimitError(AuthError):
    """Raised for rate-limited login attempts."""


class AuthOTPError(AuthError):
    """Raised for invalid or expired OTP."""


class AuthEmailError(AuthError):
    """Raised when OTP email delivery fails."""
    def __init__(self, message: str, dev_otp: str | None = None):
        super().__init__(message)
        self.dev_otp = dev_otp


_login_attempts: dict[str, deque[datetime]] = defaultdict(deque)


def _check_rate_limit(identity_key: str) -> None:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS)
    attempts = _login_attempts[identity_key]

    while attempts and attempts[0] < window_start:
        attempts.popleft()

    if len(attempts) >= settings.AUTH_RATE_LIMIT_ATTEMPTS:
        raise AuthRateLimitError("Too many login attempts. Please try again later.")


def _record_failed_attempt(identity_key: str) -> None:
    _login_attempts[identity_key].append(datetime.now(timezone.utc))


def _clear_failed_attempts(identity_key: str) -> None:
    if identity_key in _login_attempts:
        del _login_attempts[identity_key]


def _generate_otp(length: int = 6) -> str:
    """Return a numeric OTP string."""
    return "".join(random.choices(string.digits, k=length))  # noqa: S311


async def register_user(
    db: AsyncIOMotorDatabase,
    name: str,
    email: str,
    password: str,
    aadhaar: str,
) -> dict:
    """Register a new user."""
    normalized_email = email.strip().lower()
    aadhaar_payload = build_aadhaar_payload(aadhaar)

    existing_user = await db["users"].find_one(
        {
            "$or": [
                {"email": normalized_email},
                {"aadhaar.lookup_hash": aadhaar_payload["lookup_hash"]},
            ]
        }
    )
    if existing_user:
        if existing_user.get("email") == normalized_email:
            raise AuthConflictError("Email already registered.")
        raise AuthConflictError("Identity already registered.")

    now = datetime.utcnow()
    user_doc = inject_schema_version(
        {
            "name": name.strip(),
            "email": normalized_email,
            "password_hash": hash_password(password),
            "aadhaar": aadhaar_payload,
            "is_verified": False,
            "otp": None,
            "otp_expiry": None,
            "created_at": now,
            "updated_at": now,
        }
    )

    try:
        result = await db["users"].insert_one(user_doc)
    except DuplicateKeyError as exc:
        raise AuthConflictError("Email or Aadhaar already registered.") from exc

    print("User inserted")
    logger.info("User inserted: _id=%s email=%s", result.inserted_id, normalized_email)

    created = await db["users"].find_one({"_id": result.inserted_id})
    if created is None:
        raise AuthError("Failed to complete registration.")

    validate_schema(created, "users")
    return {
        "user_id": str(created["_id"]),
        "email": created["email"],
        "name": created["name"],
    }


async def send_otp(db: AsyncIOMotorDatabase, email: str) -> None:
    """Generate and email a 6-digit OTP; store it with an expiry."""
    normalized_email = email.strip().lower()

    user = await db["users"].find_one({"email": normalized_email})
    if user is None:
        raise AuthValidationError("No account found for this email address.")

    otp = _generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    print(f"OTP generated: {otp}")
    logger.info("OTP generated for %s - expiry %s UTC", normalized_email, expiry.isoformat())

    await db["users"].update_one(
        {"email": normalized_email},
        {"$set": {"otp": otp, "otp_expiry": expiry, "updated_at": datetime.utcnow()}},
    )

    try:
        await send_otp_email(to_email=normalized_email, otp=otp)
    except EmailDeliveryError as exc:
        logger.exception("OTP email delivery failed for %s", normalized_email)
        raise AuthEmailError(str(exc), dev_otp=otp) from exc


async def verify_otp(db: AsyncIOMotorDatabase, email: str, otp: str) -> None:
    """Verify OTP, set `is_verified=True`, and clear OTP fields."""
    normalized_email = email.strip().lower()

    user = await db["users"].find_one({"email": normalized_email})
    if user is None:
        raise AuthValidationError("No account found for this email address.")

    stored_otp = user.get("otp")
    stored_expiry = user.get("otp_expiry")

    if not stored_otp or stored_expiry is None:
        raise AuthOTPError("No active OTP found. Please request a new one.")

    if stored_expiry.tzinfo is None:
        stored_expiry = stored_expiry.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > stored_expiry:
        raise AuthOTPError("OTP has expired. Please request a new one.")

    if stored_otp != otp.strip():
        raise AuthOTPError("Invalid OTP.")

    await db["users"].update_one(
        {"email": normalized_email},
        {
            "$set": {
                "is_verified": True,
                "otp": None,
                "otp_expiry": None,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    print("OTP verified")
    logger.info("OTP verified for %s - account marked as verified", normalized_email)


async def login_user(
    db: AsyncIOMotorDatabase,
    email: str,
    password: str,
    identity_key: str,
) -> dict:
    """Authenticate user and return a JWT access token."""
    _check_rate_limit(identity_key)

    user = await db["users"].find_one({"email": email.strip().lower()})
    if user is None:
        _record_failed_attempt(identity_key)
        raise AuthUnauthorizedError("Invalid email or password.")

    try:
        validate_schema(user, "users")
    except VersionMismatchError as exc:
        raise AuthValidationError(str(exc)) from exc

    if not verify_password(password, user.get("password_hash", "")):
        _record_failed_attempt(identity_key)
        raise AuthUnauthorizedError("Invalid email or password.")

    if not user.get("is_verified", False):
        raise AuthUnauthorizedError(
            "Account not verified. Please complete OTP verification first."
        )

    _clear_failed_attempts(identity_key)

    token = create_access_token(user_id=str(user["_id"]), email=user["email"])

    print("Login success")
    logger.info("Login success for %s", user["email"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "registration_complete": True,
        },
    }


async def get_current_user_from_token(db: AsyncIOMotorDatabase, token: str) -> dict:
    """Resolve user from JWT token."""
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
    except Exception as exc:
        raise AuthUnauthorizedError("Invalid or expired token.") from exc

    if not user_id or not ObjectId.is_valid(user_id):
        raise AuthUnauthorizedError("Invalid token payload.")

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise AuthUnauthorizedError("User not found.")

    try:
        validate_schema(user, "users")
    except VersionMismatchError as exc:
        raise AuthValidationError(str(exc)) from exc

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "registration_complete": True,
    }
