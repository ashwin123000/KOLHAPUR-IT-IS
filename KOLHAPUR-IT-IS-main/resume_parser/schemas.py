"""
Pydantic schemas for request/response validation
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator


# ==================== Candidate Schemas ====================

class GitHubProfileData(BaseModel):
    """GitHub profile information"""
    name: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    followers: int = 0
    public_repos: int = 0
    profile_url: Optional[str] = None
    location: Optional[str] = None
    
    class Config:
        from_attributes = True


class SkillWithConfidence(BaseModel):
    """Skill with confidence score"""
    name: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: str = Field(default="resume")  # "resume", "github", "both"


class EducationEntry(BaseModel):
    """Education entry"""
    school: Optional[str] = None
    degree: Optional[str] = None
    field: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = None


class ExperienceEntry(BaseModel):
    """Work experience entry"""
    title: str
    company: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    skills_used: List[str] = []


class ProjectEntry(BaseModel):
    """Project entry"""
    name: str
    description: Optional[str] = None
    url: Optional[str] = None
    technologies: List[str] = []
    source: str = Field(default="resume")  # "resume" or "github"


class CertificationEntry(BaseModel):
    """Certification entry"""
    name: str
    issuer: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_url: Optional[str] = None


class CandidateRegisterRequest(BaseModel):
    """Request to register a new candidate"""
    github_username: str
    email: Optional[str] = None  # Optional fallback email
    phone: Optional[str] = None
    
    @validator('github_username')
    def validate_username(cls, v):
        if not v or len(v) < 1:
            raise ValueError('GitHub username cannot be empty')
        return v.lower().strip()


class CandidateResponse(BaseModel):
    """Response for candidate data"""
    id: int
    github_username: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    bio: Optional[str] = None
    github_profile_url: Optional[str] = None
    github_followers: int
    github_activity_score: float
    github_repos: List[str] = []
    github_last_synced: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CandidateUpdateRequest(BaseModel):
    """Request to update candidate"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    bio: Optional[str] = None


# ==================== Resume Schemas ====================

class ResumeParsedData(BaseModel):
    """Parsed resume data from n8n"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = []
    education: List[EducationEntry] = []
    experience: List[ExperienceEntry] = []
    projects: List[ProjectEntry] = []
    certifications: List[CertificationEntry] = []


class ResumeUploadRequest(BaseModel):
    """Request to upload parsed resume"""
    candidate_id: int
    resume_data: ResumeParsedData
    source: str = Field(default="manual")  # "n8n" or "manual"


class EnrichmentScore(BaseModel):
    """Skill enrichment and matching scores"""
    skill: str
    resume_confidence: float
    github_confidence: float
    final_confidence: float
    match_type: str  # "exact", "semantic", "inferred"


class ResumeEnrichmentResponse(BaseModel):
    """Response for resume enrichment"""
    resume_id: int
    candidate_id: int
    original_skills: List[str]
    enriched_skills: List[SkillWithConfidence]
    github_projects_added: List[ProjectEntry]
    enrichment_scores: List[EnrichmentScore]
    overall_match_score: float
    missing_skills_from_github: List[str]
    recommendations: List[str]


class ResumeResponse(BaseModel):
    """Response for resume data"""
    id: int
    candidate_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    summary: Optional[str] = None
    skills: List[SkillWithConfidence] = []
    education: List[EducationEntry] = []
    experience: List[ExperienceEntry] = []
    projects: List[ProjectEntry] = []
    certifications: List[CertificationEntry] = []
    source: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumeWithAnalysisResponse(ResumeResponse):
    """Resume with analysis data"""
    enrichment_data: Dict[str, Any]
    analysis: Optional[Dict[str, Any]] = None


# ==================== GitHub Schemas ====================

class GitHubRepoData(BaseModel):
    """GitHub repository data"""
    name: str
    url: str
    description: Optional[str] = None
    language: Optional[str] = None
    languages: List[str] = []
    topics: List[str] = []
    stars: int = 0
    forks: int = 0
    quality_score: float = 0.0


class GitHubSkillsResponse(BaseModel):
    """GitHub extracted skills"""
    languages: Dict[str, int]  # language -> count
    topics: List[str]
    inferred_skills: List[str]
    activity_level: str  # "high", "medium", "low"
    quality_score: float


class GitHubProfileResponse(BaseModel):
    """Complete GitHub profile"""
    username: str
    name: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    followers: int
    public_repos: int
    profile_url: str
    repositories: List[GitHubRepoData]
    activity_score: float
    last_synced: datetime


# ==================== Analysis Schemas ====================

class ResumeAnalysisReport(BaseModel):
    """Resume analysis report"""
    resume_id: int
    candidate_name: str
    total_skills: int
    verified_skills: int  # Skills verified by GitHub
    unverified_skills: int
    github_projects_count: int
    overall_score: float
    strengths: List[str]
    gaps: List[str]
    recommendations: List[str]
    activity_level: str


# ==================== Pagination ====================

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    page: int
    limit: int
    total: int
    total_pages: int
    items: List[Any]


# ==================== Error Response ====================

class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
