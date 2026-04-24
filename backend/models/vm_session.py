from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database_new import Base


class VMSession(Base):
    __tablename__ = "vm_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True)

    container_name = Column(String(255), unique=True, nullable=True)
    container_id = Column(String(255), nullable=True)
    vm_url = Column(Text, nullable=True)
    workspace_path = Column(Text, nullable=True)
    language = Column(String(50), nullable=False, default="python")

    status = Column(
        String(50),
        nullable=False,
        default="starting",
        comment="starting|active|submitted|evaluating|evaluated|timed_out|ended|error",
        index=True,
    )

    started_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_activity_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    application = relationship("Application", backref="vm_session", uselist=False)
    user = relationship("User", backref="vm_sessions")
    job = relationship("Job", foreign_keys=[job_id], backref="legacy_vm_sessions")
    project = relationship("Job", foreign_keys=[project_id], backref="project_vm_sessions")


class VMSubmission(Base):
    __tablename__ = "vm_submissions"

    submission_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(Text, nullable=False)
    language = Column(String(50), nullable=False, default="python")
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    session = relationship("VMSession", backref="submissions")


class VMQuestion(Base):
    __tablename__ = "vm_questions"

    question_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    questions = Column(JSONB, nullable=False, default=list)
    generated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    session = relationship("VMSession", backref="question_sets")


class VMAnswer(Base):
    __tablename__ = "vm_answers"

    answer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    answers = Column(JSONB, nullable=False, default=list)
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    session = relationship("VMSession", backref="answer_sets")


class VMResult(Base):
    __tablename__ = "vm_results"

    result_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True)
    score = Column(Integer, nullable=True)
    rank = Column(Integer, nullable=True)
    reasoning = Column(Text, nullable=True)
    llm_explanation_score = Column(Integer, nullable=True)
    code_quality_score = Column(Integer, nullable=True)
    execution_behavior_score = Column(Integer, nullable=True)
    participation_score = Column(Integer, nullable=True, default=100)
    rule_penalties = Column(Integer, nullable=True, default=0)
    penalty_reasons = Column(JSONB, nullable=False, default=list)
    evaluated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    session = relationship("VMSession", backref="result", uselist=False)
    user = relationship("User", backref="vm_results")
    project = relationship("Job", backref="vm_results")


class VMBehavior(Base):
    __tablename__ = "vm_behavior"

    behavior_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    run_count = Column(Integer, nullable=False, default=0)
    error_count = Column(Integer, nullable=False, default=0)
    first_run_at = Column(DateTime(timezone=True), nullable=True)
    first_clean_run_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    total_edit_time_seconds = Column(Integer, nullable=False, default=0)
    keypress_count = Column(Integer, nullable=False, default=0)
    final_code_length_chars = Column(Integer, nullable=False, default=0)

    session = relationship("VMSession", backref="behavior", uselist=False)


class VMBehaviorEvent(Base):
    __tablename__ = "vm_behavior_events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    event_payload = Column(JSONB, nullable=False, default=dict)
    occurred_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    session = relationship("VMSession", backref="behavior_events")


class VMImprovement(Base):
    __tablename__ = "vm_improvements"

    improvement_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    improved_code = Column(Text, nullable=False)
    generated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    session = relationship("VMSession", backref="improvement", uselist=False)


class VMEvent(Base):
    __tablename__ = "vm_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    event_data = Column(JSONB, nullable=False, default=dict)
    severity = Column(String(20), nullable=False, default="low")
    flagged = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    session = relationship("VMSession", backref="vm_events_legacy")

