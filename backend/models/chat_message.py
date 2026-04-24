"""
Chat Message Model — SQLAlchemy ORM
Master Prompt V2.0 Part 1: Chat Messages table
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database_new import Base


class ChatMessage(Base):
    """
    Chat Messages table — stores conversation history.
    
    Used for:
    - Interview prep conversations
    - Gap analysis discussions
    - General career questions
    
    Spec: Master Prompt V2.0, Part 1, Chat Messages
    """
    __tablename__ = "chat_messages"
    
    # Index for fast session retrieval
    __table_args__ = (
        Index("idx_chat_messages_user_session", "user_id", "session_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=True, comment="Context: which job was being viewed")
    
    session_id = Column(String(255), nullable=True, comment="Frontend conversation session ID")
    
    role = Column(
        String(20),
        nullable=False,
        comment="'user'|'assistant'"
    )
    content = Column(Text, nullable=False)
    
    message_metadata = Column(
        JSONB,
        nullable=False,
        default={},
        comment='{intent: "interview_prep", tool_used: "gap_analysis"}'
    )
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", backref="chat_messages")
    job = relationship("Job", backref="chat_messages")

    def __repr__(self) -> str:
        return f"<ChatMessage(id={self.id}, role={self.role}, session={self.session_id})>"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "role": self.role,
            "content": self.content,
            "metadata": self.message_metadata,
            "created_at": self.created_at.isoformat(),
        }
