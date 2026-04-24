"""
Application Schemas — Pydantic validation
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ApplicationCreateRequest(BaseModel):
    """Submit job application."""
    job_id: str
    resume_id: str
    cover_letter: Optional[str] = None
    answers: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ApplicationStatusResponse(BaseModel):
    """Application summary (for list)."""
    id: str
    job_id: str
    status: str
    match_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    """Complete application details."""
    id: str
    user_id: str
    job_id: str
    resume_id: Optional[str] = None
    status: str
    cover_letter: Optional[str] = None
    answers: Dict[str, Any] = Field(default_factory=dict)
    match_score: Optional[float] = None
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    match_insights: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
