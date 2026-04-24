"""
Application Model — SQLAlchemy ORM
Master Prompt V2.0 Part 1: Applications table
"""

from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Numeric, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database_new import Base


class Application(Base):
    """
    Applications table — stores job applications and match scores.
    
    Core of the system — tracks user→job applications with match analysis.
    Spec: Master Prompt V2.0, Part 1, Applications
    """
    __tablename__ = "applications"
    
    # Ensure one application per user per job
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job_application"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=False)
    
    status = Column(
        String(50),
        nullable=False,
        default="applied",
        index=True,
        comment="'applied'|'screening'|'vm_pending'|'vm_completed'|'interview'|'offered'|'rejected'|'withdrawn'"
    )
    
    cover_letter = Column(Text, nullable=True)
    answers = Column(
        JSONB,
        nullable=False,
        default={},
        comment='{why_us: "...", experience_years: 3}'
    )
    
    # Matching results
    match_score = Column(Numeric(5, 2), nullable=True, comment="0.00 to 100.00")
    matched_skills = Column(JSONB, nullable=False, default=[])
    missing_skills = Column(JSONB, nullable=False, default=[])
    match_insights = Column(JSONB, nullable=False, default=[])
    
    recruiter_notes = Column(Text, nullable=True)
    
    applied_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="applications")
    job = relationship("Job", backref="applications_rel")
    resume = relationship("Resume", backref="applications")
    vm_session = relationship("VMSession", uselist=False, backref="application", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Application(id={self.id}, user={self.user_id}, job={self.job_id}, status={self.status})>"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "job_id": str(self.job_id),
            "resume_id": str(self.resume_id),
            "status": self.status,
            "match_score": float(self.match_score) if self.match_score else None,
            "matched_skills": self.matched_skills,
            "missing_skills": self.missing_skills,
            "match_insights": self.match_insights,
            "applied_at": self.applied_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
