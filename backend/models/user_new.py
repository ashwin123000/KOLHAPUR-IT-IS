"""
User Model — SQLAlchemy ORM
Master Prompt V2.0 Part 1: Users table
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID

from database_new import Base


class User(Base):
    """
    Users table — stores all user accounts and roles.
    
    Spec: Master Prompt V2.0, Part 1, Users
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(320), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    
    role = Column(
        String(50),
        nullable=False,
        default="candidate",
        comment="'candidate' | 'recruiter' | 'admin'"
    )
    
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
