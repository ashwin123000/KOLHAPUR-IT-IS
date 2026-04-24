"""
Job match model for job-resume matches
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class MatchEvidence(BaseModel):
    """Evidence for a match between user and job"""
    user_chunk: str
    job_req: str
    overlap_reason: str
    confidence: float = Field(ge=0.0, le=1.0)


class JobMatchCreate(BaseModel):
    """Create new job match"""
    user_id: str
    job_id: str
    match_score: float = Field(ge=0.0, le=100.0)
    evidence: List[MatchEvidence] = []


class JobMatch(BaseModel):
    """Job match document from MongoDB"""
    id: str = Field(alias="_id")
    user_id: str
    job_id: str
    match_score: float = Field(ge=0.0, le=100.0)
    trust_adjusted_score: float = Field(ge=0.0, le=100.0, default=0.0)
    evidence: List[MatchEvidence] = []
    schema_version: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class JobMatchResponse(BaseModel):
    """Match response (safe to return to client)"""
    id: str = Field(alias="_id")
    user_id: str
    job_id: str
    match_score: float
    trust_adjusted_score: float
    evidence: List[MatchEvidence]
    created_at: datetime

    class Config:
        populate_by_name = True
