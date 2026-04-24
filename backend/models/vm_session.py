"""
VM Session Model — SQLAlchemy ORM
Master Prompt V2.0 Part 1: VM Sessions & VM Events tables
"""

from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database_new import Base


class VMSession(Base):
    """
    VM Sessions table — tracks virtual machine coding test sessions.
    
    Lifecycle:
    1. pending → running → completed → expired/flagged
    
    Spec: Master Prompt V2.0, Part 1, VM Sessions
    """
    __tablename__ = "vm_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    
    container_id = Column(String(255), nullable=True, comment="Docker container ID")
    container_port = Column(Integer, nullable=True)
    session_token = Column(String(255), unique=True, nullable=True)
    
    status = Column(
        String(50),
        nullable=False,
        default="pending",
        comment="pending|running|completed|expired|flagged"
    )
    
    current_question_index = Column(Integer, default=0)
    total_questions = Column(Integer, nullable=True)
    
    questions = Column(
        JSONB,
        nullable=False,
        default=[],
        comment="[{id, prompt, starter_code, time_limit_sec}]"
    )
    answers = Column(
        JSONB,
        nullable=False,
        default=[],
        comment="[{question_id, code, language, submitted_at}]"
    )
    
    score = Column(Numeric(5, 2), nullable=True)
    max_score = Column(Numeric(5, 2), nullable=True)
    performance_summary = Column(JSONB, nullable=True, comment="AI-generated post-mortem")
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    application = relationship("Application", backref="vm_session")
    user = relationship("User", backref="vm_sessions")
    job = relationship("Job", backref="vm_sessions")
    events = relationship("VMEvent", backref="session", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<VMSession(id={self.id}, status={self.status})>"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "status": self.status,
            "current_question_index": self.current_question_index,
            "total_questions": self.total_questions,
            "score": float(self.score) if self.score else None,
            "max_score": float(self.max_score) if self.max_score else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class VMEvent(Base):
    """
    VM Events table — anti-cheat monitoring and tracking.
    
    Events tracked:
    - tab_switch, copy_paste, esc_key, focus_lost, code_submit, 
    - question_skip, page_blur, devtools_open
    
    Spec: Master Prompt V2.0, Part 1, VM Events
    """
    __tablename__ = "vm_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id"), nullable=False, index=True)
    
    event_type = Column(
        String(100),
        nullable=False,
        comment="'tab_switch'|'copy_paste'|'esc_key'|'focus_lost'|'code_submit'|'question_skip'|'page_blur'|'devtools_open'"
    )
    event_data = Column(JSONB, nullable=False, default={})
    
    severity = Column(
        String(20),
        nullable=False,
        default="low",
        comment="'low'|'medium'|'high'"
    )
    flagged = Column(Boolean, default=False)
    
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    session = relationship("VMSession", backref="vm_events")

    def __repr__(self) -> str:
        return f"<VMEvent(event_type={self.event_type}, severity={self.severity})>"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "event_type": self.event_type,
            "severity": self.severity,
            "flagged": self.flagged,
            "timestamp": self.timestamp.isoformat(),
        }
