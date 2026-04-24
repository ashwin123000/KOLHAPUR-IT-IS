"""
Job model for job postings
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SkillRequirement(BaseModel):
    """Skill requirement for a job"""
    name: str
    weight: float = Field(ge=0.0, le=1.0)  # 0.0 to 1.0
    priority: str = "MEDIUM"  # HIGH, MEDIUM, LOW

    @validator("name")
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Skill name cannot be empty")
        return v.strip()


class SalaryRange(BaseModel):
    """Salary range in LPA (Lakh Per Annum)"""
    min: int = 0
    max: int = 100

    @validator("max")
    def max_gte_min(cls, v, values):
        if "min" in values and v < values["min"]:
            raise ValueError("max must be >= min")
        return v


class JobCreate(BaseModel):
    """Create new job posting"""
    company_id: str
    title: str
    description: str
    skills: List[SkillRequirement] = []
    salary_range: Optional[SalaryRange] = None
    location: Optional[str] = None
    notice_period_days: int = 30  # Preferred notice period

    @validator("title")
    def title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()


class Job(BaseModel):
    """Job document from MongoDB"""
    id: str = Field(alias="_id")
    company_id: str
    title: str
    description: str
    skills: List[SkillRequirement] = []
    salary_range: SalaryRange = Field(default_factory=lambda: SalaryRange())
    location: Optional[str] = None
    notice_period_days: int = 30
    status: str = "open"  # open, closed, filled
    schema_version: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class JobResponse(BaseModel):
    """Job response (safe to return to client)"""
    id: str = Field(alias="_id")
    title: str
    company_id: str
    description: str
    skills: List[SkillRequirement]
    salary_range: SalaryRange
    location: Optional[str]
    status: str
    created_at: datetime

    class Config:
        populate_by_name = True
