"""
Job Schemas — Pydantic validation
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class JobCreateRequest(BaseModel):
    """Create/update job request."""
    title: str = Field(..., min_length=3, max_length=255)
    company: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    requirements: Optional[str] = None
    nice_to_have: Optional[str] = None
    location: str = Field(..., min_length=2, max_length=100)
    job_type: str = Field(..., description="full-time, part-time, contract, freelance")
    work_mode: str = Field(..., description="remote, on-site, hybrid")
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    required_skills: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="[{skill, weight, required}, ...]"
    )
    has_vm_test: Optional[bool] = False
    vm_test_duration_minutes: Optional[int] = 60
    repo_url: Optional[str] = None
    codebase_path: Optional[str] = None
    environment: Dict[str, Any] = Field(default_factory=dict)
    starter_code: Optional[str] = None


class JobListResponse(BaseModel):
    """Job listing (summary)."""
    id: str
    title: str
    company: str
    location: str
    job_type: str
    work_mode: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    required_skills: List[Dict[str, Any]] = Field(default_factory=list)
    environment: Dict[str, Any] = Field(default_factory=dict)
    repo_url: Optional[str] = None
    codebase_path: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class JobResponse(BaseModel):
    """Complete job details."""
    id: str
    recruiter_id: str
    title: str
    company: str
    description: str
    requirements: Optional[str] = None
    nice_to_have: Optional[str] = None
    location: str
    job_type: str
    work_mode: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    required_skills: List[Dict[str, Any]] = Field(default_factory=list)
    repo_url: Optional[str] = None
    codebase_path: Optional[str] = None
    environment: Dict[str, Any] = Field(default_factory=dict)
    starter_code: Optional[str] = None
    status: str
    has_vm_test: bool
    vm_test_duration_minutes: Optional[int] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
