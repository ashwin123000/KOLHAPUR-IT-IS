"""
Resume Schemas — Pydantic validation
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SkillInfo(BaseModel):
    """Individual skill with weight."""
    skill: str
    weight: Optional[float] = None


class ExperienceInfo(BaseModel):
    """Work experience entry."""
    title: str
    company: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class EducationInfo(BaseModel):
    """Education entry."""
    degree: str
    field: Optional[str] = None
    institution: str
    graduation_date: Optional[str] = None


class CertificationInfo(BaseModel):
    """Certification entry."""
    name: str
    issuer: Optional[str] = None
    date: Optional[str] = None


class ProjectInfo(BaseModel):
    """Project entry."""
    title: str
    description: Optional[str] = None
    technologies: Optional[List[str]] = None
    date: Optional[str] = None


class ResumeUploadResponse(BaseModel):
    """Response after resume upload."""
    id: str
    status: str = Field(..., description="'pending', 'processing', 'done', or 'failed'")
    message: str


class ResumeStatusResponse(BaseModel):
    """Resume parsing status."""
    id: str
    status: str = Field(..., description="'pending', 'processing', 'done', or 'failed'")
    error: Optional[str] = None


class ResumeDetailsResponse(BaseModel):
    """Complete resume details."""
    id: str
    user_id: str
    file_name: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    parse_status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
