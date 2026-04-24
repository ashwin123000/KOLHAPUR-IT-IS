"""
Resume Model — SQLAlchemy ORM
Master Prompt V2.0 Part 1: Resumes table
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database_new import Base


class Resume(Base):
    """
    Resumes table — stores parsed resume data.
    
    Spec: Master Prompt V2.0, Part 1, Resumes
    """
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    raw_text = Column(Text, nullable=True, comment="Full extracted text from PDF")
    file_path = Column(String(500), nullable=True, comment="Path to original PDF")
    
    parse_status = Column(
        String(50),
        nullable=False,
        default="pending",
        comment="pending|processing|done|failed"
    )
    parsed_at = Column(DateTime(timezone=True), nullable=True)

    # Structured extracted data
    name = Column(String(255), nullable=True)
    email = Column(String(320), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)
    
    skills = Column(JSONB, nullable=False, default=[], comment='["Python", "React", ...]')
    experience = Column(
        JSONB,
        nullable=False,
        default=[],
        comment='{title, company, start, end, description}'
    )
    education = Column(
        JSONB,
        nullable=False,
        default=[],
        comment='{degree, institution, year, gpa}'
    )
    projects = Column(
        JSONB,
        nullable=False,
        default=[],
        comment='{name, description, tech_stack, url}'
    )
    certifications = Column(
        JSONB,
        nullable=False,
        default=[],
        comment='{name, issuer, year}'
    )
    
    # Embeddings
    skill_embedding = Column(
        "skill_embedding",
        None,  # pgvector type, but SQLAlchemy doesn't have native support yet
        comment="Vector embedding of skills (384 dims, sentence-transformers)"
    )
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="resumes")

    def __repr__(self) -> str:
        return f"<Resume(id={self.id}, user_id={self.user_id}, status={self.parse_status})>"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "location": self.location,
            "summary": self.summary,
            "skills": self.skills,
            "experience": self.experience,
            "education": self.education,
            "projects": self.projects,
            "certifications": self.certifications,
            "parse_status": self.parse_status,
            "parsed_at": self.parsed_at.isoformat() if self.parsed_at else None,
            "created_at": self.created_at.isoformat(),
        }
