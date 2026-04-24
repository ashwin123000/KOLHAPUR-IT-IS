"""
Database models for Resume Parser system
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Candidate(Base):
    """Candidate model - stores GitHub user information"""
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(20))
    city = Column(String(100))
    state = Column(String(100))
    bio = Column(Text)
    github_profile_url = Column(String(500))
    github_repos = Column(JSON, default=[])  # List of repo names
    github_followers = Column(Integer, default=0)
    github_activity_score = Column(Float, default=0.0)  # Calculated from commits/activity
    github_last_synced = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")
    github_data = relationship("GitHubData", back_populates="candidate", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Candidate {self.github_username}>"


class Resume(Base):
    """Resume model - stores parsed resume information"""
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False, index=True)
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(20))
    city = Column(String(100))
    state = Column(String(100))
    summary = Column(Text)
    skills = Column(JSON, default=[])  # List of skills with confidence scores
    education = Column(JSON, default=[])  # List of education entries
    experience = Column(JSON, default=[])  # List of work experience entries
    projects = Column(JSON, default=[])  # List of projects (from resume + GitHub)
    certifications = Column(JSON, default=[])  # List of certifications
    parsed_at = Column(DateTime)
    source = Column(String(50), default="manual")  # "n8n" or "manual"
    enrichment_data = Column(JSON, default={})  # Stores enrichment scores and matches
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    candidate = relationship("Candidate", back_populates="resumes")

    def __repr__(self):
        return f"<Resume {self.id} for Candidate {self.candidate_id}>"


class GitHubData(Base):
    """GitHub repository data for candidates"""
    __tablename__ = "github_data"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False, index=True)
    repo_name = Column(String(255), nullable=False)
    repo_url = Column(String(500))
    languages = Column(JSON, default=[])  # Programming languages used
    topics = Column(JSON, default=[])  # Repository topics/tags
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    description = Column(Text)
    readme_content = Column(Text)  # First 1000 chars of README
    quality_score = Column(Float, default=0.0)  # Based on stars, forks, documentation
    commits_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    candidate = relationship("Candidate", back_populates="github_data")

    def __repr__(self):
        return f"<GitHubData {self.repo_name}>"


class APILog(Base):
    """API request logging"""
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    method = Column(String(10))  # GET, POST, PUT, DELETE
    endpoint = Column(String(255))
    status_code = Column(Integer)
    response_time_ms = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<APILog {self.method} {self.endpoint}>"
