"""
Job Model — SQLAlchemy ORM
Master Prompt V2.0 Part 1: Jobs table
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database_new import Base


class Job(Base):
    """
    Jobs table — stores job listings created by recruiters.
    
    Spec: Master Prompt V2.0, Part 1, Jobs
    """
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    recruiter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    
    job_type = Column(
        String(50),
        nullable=True,
        comment="'full-time'|'part-time'|'contract'|'internship'"
    )
    work_mode = Column(
        String(50),
        nullable=True,
        comment="'remote'|'onsite'|'hybrid'"
    )
    
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    nice_to_have = Column(Text, nullable=True)
    
    required_skills = Column(
        JSONB,
        nullable=False,
        default=[],
        comment='[{skill: "Python", weight: 10, required: true}]'
    )
    repo_url = Column(Text, nullable=True)
    codebase_path = Column(Text, nullable=True)
    environment = Column(JSONB, nullable=False, default=dict)
    starter_code = Column(Text, nullable=True)
    
    status = Column(
        String(50),
        nullable=False,
        default="active",
        index=True,
        comment="'active'|'paused'|'closed'"
    )
    
    has_vm_test = Column(Boolean, default=False)
    vm_test_duration_minutes = Column(Integer, default=60)
    
    # Embeddings
    jd_embedding = Column(
        "jd_embedding",
        None,
        comment="Vector embedding of full JD (384 dims)"
    )
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    recruiter = relationship("User", backref="jobs_created")
    applications = relationship("Application", backref="job", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Job(id={self.id}, title={self.title}, status={self.status})>"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "job_type": self.job_type,
            "work_mode": self.work_mode,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "description": self.description,
            "requirements": self.requirements,
            "nice_to_have": self.nice_to_have,
            "required_skills": self.required_skills,
            "status": self.status,
            "has_vm_test": self.has_vm_test,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
