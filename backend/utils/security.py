import hashlib
import os
import re

AADHAAR_PATTERN = re.compile(r"^\d{12}$")

def hash_password(password: str) -> str:
    """Hash password using plain SHA256 hexdigest as requested.
    
    ZERO restrictions on length or content.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against SHA256 hash.
    
    Returns True if password matches hash, False otherwise.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest() == hashed

# ---------------------------------------------------------------------------
# Aadhaar (Kept to prevent breaking auth_service)
# ---------------------------------------------------------------------------

def validate_aadhaar(aadhaar: str) -> str:
    """Raise ValueError if *aadhaar* is not a 12-digit string."""
    if not AADHAAR_PATTERN.match(aadhaar):
        raise ValueError("Invalid Aadhaar — must be exactly 12 digits.")
    return aadhaar

def generate_aadhaar_hashes(aadhaar: str) -> tuple[str, str, str]:
    """Return (lookup_hash, secure_hash, salt) for a validated Aadhaar number."""
    validated = validate_aadhaar(aadhaar)
    lookup_hash = hashlib.sha256(validated.encode("utf-8")).hexdigest()
    salt = os.urandom(16).hex()
    secure_hash = hashlib.sha256(f"{salt}{validated}".encode("utf-8")).hexdigest()
    return lookup_hash, secure_hash, salt
