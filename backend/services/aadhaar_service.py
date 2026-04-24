"""Aadhaar identity hashing service."""

from utils.security import generate_aadhaar_hashes, validate_aadhaar


def build_aadhaar_payload(aadhaar: str) -> dict[str, str]:
    """Build secure Aadhaar payload for MongoDB."""
    validated = validate_aadhaar(aadhaar)
    lookup_hash, secure_hash, salt = generate_aadhaar_hashes(validated)
    return {
        "lookup_hash": lookup_hash,
        "secure_hash": secure_hash,
        "salt": salt,
        "last_four": validated[-4:],
    }
