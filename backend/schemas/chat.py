"""
Chat Schemas — Pydantic validation
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    """Send chat message request."""
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    job_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    """Chat message response."""
    session_id: str
    message: str
    timestamp: datetime


class ChatMessageInSession(BaseModel):
    """Message within a session."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    timestamp: datetime


class ChatSessionResponse(BaseModel):
    """Complete chat session."""
    session_id: str
    messages: List[ChatMessageInSession] = Field(default_factory=list)
