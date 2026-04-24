"""JWT creation and verification helpers.

Spec §9:
- Algorithm: HS256
- Expiry: 24 hours (configured via JWT_EXPIRE_MINUTES = 1440 in config.py)
- Payload: { user_id, email, exp }
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from config import settings


def create_access_token(user_id: str, email: str) -> str:
    """Create a signed JWT access token with 24-hour expiry.

    Args:
        user_id: MongoDB ObjectId string of the authenticated user.
        email:   Verified email address of the authenticated user.

    Returns:
        Signed JWT token string (HS256).
    """
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "user_id": user_id,
        "email": email,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),  # issued-at for audit trails
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT access token.

    Raises:
        jwt.ExpiredSignatureError: if the token has expired.
        jwt.InvalidTokenError:     if the token is invalid / tampered.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
