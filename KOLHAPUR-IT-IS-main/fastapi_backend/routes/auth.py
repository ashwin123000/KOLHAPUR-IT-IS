import base64
import hashlib
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from ..database import SCHEMA_VERSION, get_db
from ..email_service import send_otp as send_otp_email


logger = logging.getLogger(__name__)
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hashlib.sha256(password.encode()).hexdigest() == password_hash


def ensure_schema_version(document: dict[str, Any], collection_name: str = "users") -> None:
    version = document.get("schema_version")
    if version != SCHEMA_VERSION:
        raise HTTPException(
            status_code=409,
            detail=f"[{collection_name}] schema_version mismatch: expected {SCHEMA_VERSION}, got {version}",
        )


def normalize_auth_user(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "email": document.get("email"),
        "name": document.get("full_name") or document.get("username") or document.get("email", "").split("@")[0],
        "full_name": document.get("full_name") or document.get("username") or document.get("email", "").split("@")[0],
        "role": document.get("user_type", "freelancer"),
        "registration_complete": document.get("registration_complete", True),
        "profile_picture": document.get("profile_picture"),
    }


def build_login_response(user: dict[str, Any]) -> dict[str, Any]:
    role = user.get("user_type", "freelancer")
    user_id = str(user["_id"])
    token = f"session:{role}:{user_id}:{secrets.token_hex(8)}"
    user_payload = normalize_auth_user(user)
    return {
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "userId": user_id,
        "id": user_id,
        "email": user["email"],
        "role": role,
        "full_name": user_payload["full_name"],
        "user": user_payload,
    }


def extract_subject_from_token(token: str) -> str | None:
    if not token:
        return None

    if token.startswith("session:"):
        parts = token.split(":")
        if len(parts) >= 4:
            return parts[2]
        return None

    if token.count(".") == 2:
        try:
            payload_segment = token.split(".")[1]
            padding = "=" * (-len(payload_segment) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_segment + padding)
            payload = json.loads(payload_bytes.decode("utf-8"))
            sub = payload.get("sub")
            return str(sub) if sub is not None else None
        except Exception:
            return None

    return None


async def lookup_user_by_subject(subject: str) -> dict[str, Any] | None:
    mongo_db = await get_db()
    if not subject:
        return None

    if ObjectId.is_valid(subject):
        user = await mongo_db.users.find_one({"_id": ObjectId(subject)})
        if user:
            return user

    return await mongo_db.users.find_one({"email": subject.strip().lower()})


class LoginPayload:
    email: str
    password: str


@router.post("/login")
async def login(payload: dict[str, Any]):
    mongo_db = await get_db()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    user = await mongo_db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    ensure_schema_version(user)
    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"success": True, "data": build_login_response(user)}


@router.get("/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    subject = extract_subject_from_token(token)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await lookup_user_by_subject(subject)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return normalize_auth_user(user)


@router.post("/send-otp")
async def send_otp_route(payload: dict[str, Any]):
    try:
        mongo_db = await get_db()
        email = str(payload.get("email", "")).strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        user = await mongo_db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="No account found with this email")

        otp_code = f"{secrets.randbelow(1_000_000):06d}"
        otp_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
        expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

        await mongo_db.otp_codes.delete_many({"email": email, "purpose": "login"})
        await mongo_db.otp_codes.insert_one(
            {
                "email": email,
                "purpose": "login",
                "otp_hash": otp_hash,
                "expires_at": expiry,
                "created_at": datetime.now(timezone.utc),
            }
        )

        email_sent = False
        try:
            send_otp_email(email, otp_code)
            email_sent = True
        except Exception as email_error:
            logger.warning("[OTP EMAIL FAILED - CHECK SMTP CONFIG] %s", email_error)

        response: dict[str, Any] = {
            "success": True,
            "message": "OTP sent successfully" if email_sent else "OTP generated (email disabled in dev)",
        }
        if not email_sent:
            response["dev_otp"] = otp_code

        return response
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("[SEND-OTP CRASH] %s", exc)
        raise HTTPException(status_code=500, detail=f"OTP error: {exc}") from exc


@router.post("/verify-otp")
async def verify_otp_route(payload: dict[str, Any]):
    mongo_db = await get_db()
    email = str(payload.get("email", "")).strip().lower()
    otp = str(payload.get("otp", "")).strip()

    user = await mongo_db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ensure_schema_version(user)
    otp_record = await mongo_db.otp_codes.find_one(
        {"email": email, "purpose": "login"},
        sort=[("created_at", -1)],
    )
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found or expired")

    if otp_record["expires_at"] < datetime.now(timezone.utc):
        await mongo_db.otp_codes.delete_one({"_id": otp_record["_id"]})
        raise HTTPException(status_code=400, detail="OTP expired")

    submitted_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
    if submitted_hash != otp_record["otp_hash"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    await mongo_db.otp_codes.delete_one({"_id": otp_record["_id"]})
    return {"success": True, "data": build_login_response(user)}
