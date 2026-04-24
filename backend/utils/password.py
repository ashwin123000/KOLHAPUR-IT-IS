"""
Password Hashing Utilities — Master Prompt V2.0
CRITICAL: Use bcrypt for password storage (not plain text!)
"""

import logging
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# Use bcrypt for password hashing (10 rounds is standard)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    
    Args:
        password: Plaintext password from user registration
    
    Returns:
        Bcrypt hash (safe to store in database)
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a bcrypt hash.
    
    Args:
        plain_password: Password submitted by user (e.g., during login)
        hashed_password: Bcrypt hash from database
    
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)
