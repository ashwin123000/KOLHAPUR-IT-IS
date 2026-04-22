"""
Resume Parser - FastAPI Main Application
Complete system for parsing resumes and enriching with GitHub data
"""
import os
import logging
import time
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import init_db, get_db, SessionLocal
from models import Candidate, Resume, GitHubData, APILog
from schemas import (
    CandidateRegisterRequest, CandidateResponse, CandidateUpdateRequest,
    ResumeUploadRequest, ResumeResponse, ResumeEnrichmentResponse,
    ResumeAnalysisReport, GitHubProfileResponse, GitHubSkillsResponse,
    PaginatedResponse, ErrorResponse, SkillWithConfidence
)
from services.github_service import GitHubService, GitHubRateLimitError
from services.resume_service import ResumeEnrichmentService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize services
github_service = GitHubService()
resume_enrichment = ResumeEnrichmentService()


# ==================== Application Startup/Shutdown ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    # Startup
    logger.info("=" * 60)
    logger.info("Resume Parser - FastAPI Application Starting")
    logger.info("=" * 60)
    init_db()
    logger.info("✓ Database initialized")
    logger.info("✓ Running on http://0.0.0.0:8000")
    logger.info("✓ API Docs: http://0.0.0.0:8000/docs")
    logger.info("=" * 60)
    yield
    # Shutdown
    logger.info("Application shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Resume Parser API",
    description="Parse resumes and enrich with GitHub data",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5678",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5678",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Middleware for Logging ====================

@app.middleware("http")
async def log_requests(request, call_next):
    """Log all API requests"""
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000  # ms

    # Log to database in background
    db = SessionLocal()
    try:
        log = APILog(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code,
            response_time_ms=process_time
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Error logging request: {e}")
        db.rollback()
    finally:
        db.close()

    return response


# ==================== Health Check ====================

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Resume Parser API"
    }


# ==================== Candidate Endpoints ====================

@app.post("/api/candidates/register", response_model=CandidateResponse, status_code=201)
def register_candidate(
    request: CandidateRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new candidate from GitHub
    Fetches profile and repositories from GitHub
    """
    try:
        # Validate GitHub username format
        if not github_service.validate_username(request.github_username):
            raise HTTPException(
                status_code=400,
                detail="Invalid GitHub username format"
            )

        # Check if candidate already exists
        existing = db.query(Candidate).filter(
            Candidate.github_username == request.github_username.lower()
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Candidate {request.github_username} already registered"
            )

        logger.info(f"Registering candidate: {request.github_username}")

        # Fetch GitHub profile
        try:
            profile = github_service.get_user_profile(request.github_username)
            repos = github_service.get_user_repositories(request.github_username)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except GitHubRateLimitError as e:
            raise HTTPException(status_code=429, detail=str(e))

        # Extract data
        repo_names = [repo["name"] for repo in repos]
        activity_score = github_service.calculate_activity_score(profile, repos)

        # Create candidate
        candidate = Candidate(
            github_username=request.github_username.lower(),
            name=profile.get("name"),
            email=request.email or profile.get("email"),
            phone=request.phone,
            bio=profile.get("bio"),
            github_profile_url=profile.get("profile_url"),
            github_repos=repo_names,
            github_followers=profile.get("followers", 0),
            github_activity_score=activity_score,
            github_last_synced=datetime.utcnow()
        )
        db.add(candidate)
        db.flush()  # Get the ID

        # Create GitHub data entries for each repo
        for repo in repos:
            gh_data = GitHubData(
                candidate_id=candidate.id,
                repo_name=repo["name"],
                repo_url=repo["url"],
                languages=[repo.get("primary_language")] if repo.get("primary_language") else [],
                topics=repo.get("topics", []),
                stars=repo.get("stars", 0),
                forks=repo.get("forks", 0),
                description=repo.get("description"),
                quality_score=github_service.calculate_quality_score(repo),
                commits_count=0  # Can be added if commits API call is made
            )
            db.add(gh_data)

        db.commit()
        db.refresh(candidate)

        logger.info(f"✓ Candidate registered: {candidate.github_username} (ID: {candidate.id})")

        return CandidateResponse.from_orm(candidate)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering candidate: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/candidates", response_model=PaginatedResponse)
def get_candidates(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all candidates with pagination"""
    total = db.query(Candidate).count()
    skip = (page - 1) * limit

    candidates = db.query(Candidate).order_by(
        desc(Candidate.created_at)
    ).offset(skip).limit(limit).all()

    return PaginatedResponse(
        page=page,
        limit=limit,
        total=total,
        total_pages=(total + limit - 1) // limit,
        items=[CandidateResponse.from_orm(c) for c in candidates]
    )


@app.get("/api/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Get single candidate by ID"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return CandidateResponse.from_orm(candidate)


@app.put("/api/candidates/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    request: CandidateUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update candidate information"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Update fields
    if request.name is not None:
        candidate.name = request.name
    if request.email is not None:
        candidate.email = request.email
    if request.phone is not None:
        candidate.phone = request.phone
    if request.city is not None:
        candidate.city = request.city
    if request.state is not None:
        candidate.state = request.state
    if request.bio is not None:
        candidate.bio = request.bio

    candidate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(candidate)

    return CandidateResponse.from_orm(candidate)


@app.delete("/api/candidates/{candidate_id}", status_code=204)
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Delete candidate"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    db.delete(candidate)
    db.commit()


# ==================== Resume Endpoints ====================

@app.post("/api/resume/parsed", response_model=ResumeResponse, status_code=201)
def upload_parsed_resume(
    request: ResumeUploadRequest,
    db: Session = Depends(get_db)
):
    """
    Receive parsed resume from n8n
    Store in database and link to candidate
    """
    try:
        # Verify candidate exists
        candidate = db.query(Candidate).filter(
            Candidate.id == request.candidate_id
        ).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Create resume record
        resume = Resume(
            candidate_id=request.candidate_id,
            name=request.resume_data.name,
            email=request.resume_data.email,
            phone=request.resume_data.phone,
            city=request.resume_data.city,
            state=request.resume_data.state,
            summary=request.resume_data.summary,
            skills=[s.dict() for s in request.resume_data.skills] if isinstance(request.resume_data.skills[0], SkillWithConfidence) else 
                    [{"name": s, "confidence": 0.7, "source": "resume"} for s in request.resume_data.skills],
            education=[e.dict() for e in request.resume_data.education],
            experience=[e.dict() for e in request.resume_data.experience],
            projects=[p.dict() for p in request.resume_data.projects],
            certifications=[c.dict() for c in request.resume_data.certifications],
            source=request.source,
            parsed_at=datetime.utcnow()
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)

        logger.info(f"✓ Resume created (ID: {resume.id}) for candidate {request.candidate_id}")

        return ResumeResponse.from_orm(resume)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading resume: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/resumes", response_model=PaginatedResponse)
def get_resumes(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all resumes with pagination"""
    total = db.query(Resume).count()
    skip = (page - 1) * limit

    resumes = db.query(Resume).order_by(
        desc(Resume.created_at)
    ).offset(skip).limit(limit).all()

    return PaginatedResponse(
        page=page,
        limit=limit,
        total=total,
        total_pages=(total + limit - 1) // limit,
        items=[ResumeResponse.from_orm(r) for r in resumes]
    )


@app.get("/api/resumes/{resume_id}", response_model=ResumeResponse)
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    """Get single resume by ID"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return ResumeResponse.from_orm(resume)


@app.put("/api/resumes/{resume_id}", response_model=ResumeResponse)
def update_resume(
    resume_id: int,
    request: ResumeUploadRequest,
    db: Session = Depends(get_db)
):
    """Update resume"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Update fields
    resume.summary = request.resume_data.summary
    resume.skills = [{"name": s, "confidence": 0.7, "source": "resume"} for s in request.resume_data.skills]
    resume.education = [e.dict() for e in request.resume_data.education]
    resume.experience = [e.dict() for e in request.resume_data.experience]
    resume.projects = [p.dict() for p in request.resume_data.projects]
    resume.certifications = [c.dict() for c in request.resume_data.certifications]
    resume.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(resume)

    return ResumeResponse.from_orm(resume)


@app.delete("/api/resumes/{resume_id}", status_code=204)
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    """Delete resume"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    db.delete(resume)
    db.commit()


# ==================== GitHub Sync Endpoints ====================

@app.post("/api/candidates/{candidate_id}/sync-github", response_model=CandidateResponse)
def sync_github_data(
    candidate_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Re-sync GitHub data for candidate
    Runs in background to avoid timeouts
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Background task to sync
    def sync_github():
        try:
            profile = github_service.get_user_profile(candidate.github_username)
            repos = github_service.get_user_repositories(candidate.github_username)

            # Update candidate
            candidate.name = profile.get("name")
            candidate.email = candidate.email or profile.get("email")
            candidate.bio = profile.get("bio")
            candidate.github_followers = profile.get("followers", 0)
            candidate.github_activity_score = github_service.calculate_activity_score(profile, repos)
            candidate.github_last_synced = datetime.utcnow()
            candidate.github_repos = [repo["name"] for repo in repos]

            # Update GitHub data
            db.query(GitHubData).filter(GitHubData.candidate_id == candidate_id).delete()

            for repo in repos:
                gh_data = GitHubData(
                    candidate_id=candidate_id,
                    repo_name=repo["name"],
                    repo_url=repo["url"],
                    languages=[repo.get("primary_language")] if repo.get("primary_language") else [],
                    topics=repo.get("topics", []),
                    stars=repo.get("stars", 0),
                    forks=repo.get("forks", 0),
                    description=repo.get("description"),
                    quality_score=github_service.calculate_quality_score(repo)
                )
                db.add(gh_data)

            db.commit()
            logger.info(f"✓ GitHub data synced for candidate {candidate_id}")

        except Exception as e:
            logger.error(f"Error syncing GitHub data: {e}")
            db.rollback()

    background_tasks.add_task(sync_github)

    return CandidateResponse.from_orm(candidate)


@app.get("/api/candidates/{candidate_id}/github", response_model=GitHubProfileResponse)
def get_github_profile(candidate_id: int, db: Session = Depends(get_db)):
    """Get candidate's GitHub profile and repositories"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    try:
        profile_data = github_service.get_user_profile(candidate.github_username)
        repos_data = github_service.get_user_repositories(candidate.github_username)

        return GitHubProfileResponse(
            username=candidate.github_username,
            name=profile_data.get("name"),
            email=profile_data.get("email"),
            bio=profile_data.get("bio"),
            followers=profile_data.get("followers", 0),
            public_repos=profile_data.get("public_repos", 0),
            profile_url=profile_data.get("profile_url"),
            repositories=repos_data,
            activity_score=candidate.github_activity_score,
            last_synced=candidate.github_last_synced
        )

    except GitHubRateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching GitHub profile: {e}")
        raise HTTPException(status_code=500, detail="Error fetching GitHub profile")


@app.get("/api/candidates/{candidate_id}/github-skills", response_model=GitHubSkillsResponse)
def get_github_skills(candidate_id: int, db: Session = Depends(get_db)):
    """Extract programming languages/skills from GitHub repos"""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    try:
        languages = github_service.extract_languages_from_repos(candidate.github_username)
        topics = github_service.extract_topics_from_repos(candidate.github_username)
        inferred_skills = github_service.infer_skills_from_repos(candidate.github_username)

        # Determine activity level
        activity_score = candidate.github_activity_score
        if activity_score >= 0.7:
            activity_level = "high"
        elif activity_score >= 0.4:
            activity_level = "medium"
        else:
            activity_level = "low"

        return GitHubSkillsResponse(
            languages=languages,
            topics=topics,
            inferred_skills=inferred_skills,
            activity_level=activity_level,
            quality_score=activity_score
        )

    except GitHubRateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.error(f"Error extracting GitHub skills: {e}")
        raise HTTPException(status_code=500, detail="Error extracting skills")


# ==================== Resume Enrichment & Analysis ====================

@app.post("/api/resumes/{resume_id}/enrich", response_model=ResumeEnrichmentResponse)
def enrich_resume(
    resume_id: int,
    db: Session = Depends(get_db)
):
    """
    Enrich resume with GitHub data
    Match skills, add projects, calculate scores
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    candidate = db.query(Candidate).filter(Candidate.id == resume.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    try:
        # Get GitHub data
        github_profile = github_service.get_user_profile(candidate.github_username)
        github_repos = github_service.get_user_repositories(candidate.github_username)
        github_languages = github_service.extract_languages_from_repos(candidate.github_username)

        # Extract skills from resume
        resume_skills = resume.skills if isinstance(resume.skills, list) else []
        if resume_skills and isinstance(resume_skills[0], dict):
            resume_skills = [s.get("name") if isinstance(s, dict) else s for s in resume_skills]

        # Match skills
        skill_matches = resume_enrichment.match_skills(resume_skills, github_languages)

        # Add GitHub projects
        current_projects = resume.projects if isinstance(resume.projects, list) else []
        enriched_projects, added_projects = resume_enrichment.enrich_with_github_projects(
            current_projects, github_repos
        )

        # Create confidence map
        confidence_map = resume_enrichment.create_skill_confidence_map(
            resume_skills, github_languages, skill_matches
        )

        # Update resume with enrichment data
        resume.projects = enriched_projects
        resume.enrichment_data = {
            "skill_matches": skill_matches,
            "added_projects": added_projects,
            "confidence_map": confidence_map,
            "enriched_at": datetime.utcnow().isoformat()
        }
        db.commit()

        # Calculate overall match score
        verified_count = len(skill_matches.get("matched", {}))
        overall_match = verified_count / max(len(resume_skills), 1) if resume_skills else 0.5

        return ResumeEnrichmentResponse(
            resume_id=resume_id,
            candidate_id=resume.candidate_id,
            original_skills=resume_skills,
            enriched_skills=confidence_map,
            github_projects_added=added_projects,
            enrichment_scores=[
                {
                    "skill": skill,
                    "resume_confidence": 0.7,
                    "github_confidence": skill_matches.get("matched", {}).get(skill, {}).get("confidence", 0.0),
                    "final_confidence": (0.7 + skill_matches.get("matched", {}).get(skill, {}).get("confidence", 0.0)) / 2,
                    "match_type": "verified" if skill in skill_matches.get("matched", {}) else "unverified"
                }
                for skill in resume_skills
            ],
            overall_match_score=min(overall_match, 1.0),
            missing_skills_from_github=resume_enrichment.identify_skill_gaps(resume_skills, github_languages),
            recommendations=resume_enrichment.generate_recommendations(
                resume_skills, github_languages, skill_matches
            )
        )

    except GitHubRateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.error(f"Error enriching resume: {e}")
        raise HTTPException(status_code=500, detail="Error enriching resume")


@app.get("/api/resumes/{resume_id}/analysis", response_model=ResumeAnalysisReport)
def get_resume_analysis(
    resume_id: int,
    db: Session = Depends(get_db)
):
    """Get resume analysis report"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    candidate = db.query(Candidate).filter(Candidate.id == resume.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    try:
        # Get GitHub data
        github_repos = github_service.get_user_repositories(candidate.github_username)
        github_languages = github_service.extract_languages_from_repos(candidate.github_username)

        # Extract resume skills
        resume_skills = resume.skills if isinstance(resume.skills, list) else []
        if resume_skills and isinstance(resume_skills[0], dict):
            resume_skills = [s.get("name") if isinstance(s, dict) else s for s in resume_skills]

        # Generate analysis
        skill_matches = resume_enrichment.match_skills(resume_skills, github_languages)
        verified_skills = len(skill_matches.get("matched", {}))
        unverified_skills = len(skill_matches.get("unmatched", []))

        # Calculate score
        skill_score = verified_skills / max(len(resume_skills), 1) if resume_skills else 0
        project_score = min(len(resume.projects or []) / 5, 1.0)
        activity_score = candidate.github_activity_score
        overall_score = (skill_score * 0.4 + project_score * 0.3 + activity_score * 0.3)

        return ResumeAnalysisReport(
            resume_id=resume_id,
            candidate_name=candidate.name or candidate.github_username,
            total_skills=len(resume_skills),
            verified_skills=verified_skills,
            unverified_skills=unverified_skills,
            github_projects_count=len(github_repos),
            overall_score=min(overall_score, 1.0),
            strengths=[
                f"Strong in {skill}" for skill in resume_skills
                if skill in skill_matches.get("matched", {})
            ][:3],
            gaps=skill_matches.get("unmatched", [])[:3],
            recommendations=resume_enrichment.generate_recommendations(
                resume_skills, github_languages, skill_matches
            )[:3],
            activity_level="high" if activity_score >= 0.7 else "medium" if activity_score >= 0.4 else "low"
        )

    except GitHubRateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating analysis: {e}")
        raise HTTPException(status_code=500, detail="Error generating analysis")


# ==================== Error Handlers ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail or "An error occurred",
            detail=None,
            status_code=exc.status_code
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc),
            status_code=500
        ).dict()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
