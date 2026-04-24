"""
VM Schemas — Pydantic validation
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class VMTestQuestion(BaseModel):
    """A single test question."""
    index: int
    title: str
    description: str
    test_cases: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Test cases with input and expected_output"
    )
    time_limit: Optional[int] = 300  # seconds


class VMSessionStartRequest(BaseModel):
    """Start VM session request."""
    application_id: str
    questions: List[Dict[str, Any]] = Field(..., description="Test questions")


class VMSessionResponse(BaseModel):
    """VM session details."""
    id: str
    application_id: str
    user_id: str
    job_id: str
    container_id: Optional[str] = None
    container_port: Optional[int] = None
    session_token: str
    status: str = Field(..., description="running, completed, expired, flagged")
    current_question_index: int
    total_questions: int
    score: Optional[float] = None
    max_score: float
    answers: List[Dict[str, Any]] = Field(default_factory=list)
    performance_summary: Optional[Dict[str, Any]] = None
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class VMCodeSubmitRequest(BaseModel):
    """Submit code solution."""
    code: str = Field(..., min_length=1)
    question_index: int
    language: Optional[str] = "python"


class VMCodeSubmitResponse(BaseModel):
    """Code submission result."""
    question_index: int
    passed: int = Field(..., description="Number of test cases passed")
    total: int = Field(..., description="Total test cases")
    score: float = Field(..., description="Score 0-100")
    running_score: float = Field(..., description="Session running score")


class VMEventRequest(BaseModel):
    """Anti-cheat event."""
    event_type: str = Field(
        ...,
        description="tab_switch, copy_paste, focus_lost, devtools_open, etc."
    )
    metadata: Optional[Dict[str, Any]] = None


class VMEventResponse(BaseModel):
    """Anti-cheat event response."""
    id: str
    session_id: str
    event_type: str
    severity: str = Field(..., description="low, medium, high")
    flagged: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
