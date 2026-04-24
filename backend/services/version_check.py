"""
Schema version enforcement
Every document must have schema_version that matches SCHEMA_VERSION
"""

import logging
from typing import Dict, Any
from config import settings

logger = logging.getLogger(__name__)


class VersionMismatchError(Exception):
    """Raised when document schema version doesn't match"""
    pass


def validate_schema(doc: Dict[str, Any], collection_name: str = "unknown"):
    """
    Validate that document has correct schema version
    
    Raises:
        VersionMismatchError: If schema version mismatch
    """
    if doc is None:
        return

    schema_version = doc.get("schema_version")

    if schema_version is None:
        raise VersionMismatchError(
            f"[{collection_name}] Document missing schema_version"
        )

    if schema_version != settings.SCHEMA_VERSION:
        raise VersionMismatchError(
            f"[{collection_name}] Schema mismatch: "
            f"expected {settings.SCHEMA_VERSION}, got {schema_version}"
        )


def inject_schema_version(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add schema_version to document before writing
    """
    doc["schema_version"] = settings.SCHEMA_VERSION
    return doc


def validate_list(docs: list, collection_name: str = "unknown"):
    """Validate list of documents"""
    for doc in docs:
        validate_schema(doc, collection_name)
