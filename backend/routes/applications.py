"""
Applications Routes — Master Prompt V2.0
Endpoints: apply, get status, list, withdraw
"""

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from database_new import get_db
from models.user_new import User
from models.job_new import Job
from models.resume import Resume
from models.application import Application
from auth.dependencies import get_current_user
from services.matching_engine import MatchingEngine
from schemas.application import (
    ApplicationCreateRequest,
    ApplicationResponse,
    ApplicationStatusResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply to Job",
    description="Submit an application for a job"
)
async def apply_to_job(
    request: ApplicationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Apply to a job.
    
    - **job_id**: The job ID to apply for
    - **resume_id**: User's resume ID (must be completed)
    - **cover_letter**: Optional cover letter
    """
    
    # Verify job exists and is active
    job_result = await db.execute(select(Job).filter(Job.id == request.job_id))
    job = job_result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    if job.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job is no longer active",
        )
    
    # Verify resume exists and is parsed
    resume_result = await db.execute(
        select(Resume).filter(
            and_(
                Resume.id == request.resume_id,
                Resume.user_id == current_user.id,
                Resume.parse_status == "done",
            )
        )
    )
    resume = resume_result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_RESUME",
                "message": "Resume must be uploaded and fully parsed first",
            }
        )
    
    # Check for duplicate application
    dup_result = await db.execute(
        select(Application).filter(
            and_(
                Application.user_id == current_user.id,
                Application.job_id == request.job_id,
            )
        )
    )
    existing_app = dup_result.scalar_one_or_none()
    
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_APPLIED",
                "message": "You have already applied to this job",
            }
        )
    
    # Calculate match score
    engine = MatchingEngine()
    skill_match, matched_skills, missing_skills = engine.calculate_skill_match(
        job.required_skills,
        resume.skills,
    )
    experience_match = engine.calculate_experience_match("mid", resume.experience)
    education_match = engine.calculate_education_match("bachelors", resume.education)
    
    overall_match = engine.calculate_overall_match(
        skill_match, experience_match, education_match
    )
    
    insights = engine.generate_insights(
        matched_skills, missing_skills, overall_match
    )
    
    # Create application
    application = Application(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        job_id=request.job_id,
        resume_id=request.resume_id,
        status="applied",
        cover_letter=request.cover_letter,
        match_score=overall_match,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        match_insights=insights,
    )
    
    db.add(application)
    await db.commit()
    await db.refresh(application)
    
    logger.info(
        f"Application submitted: {application.id} "
        f"(user: {current_user.email}, job: {job.title}, match: {overall_match:.1f}%)"
    )
    
    return ApplicationResponse.model_validate(application)


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Get Application Status",
    description="Get application details and status"
)
async def get_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get application details.
    """
    
    result = await db.execute(
        select(Application).filter(
            and_(
                Application.id == application_id,
                Application.user_id == current_user.id,
            )
        )
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    
    return ApplicationResponse.model_validate(application)


@router.get(
    "",
    response_model=list[ApplicationStatusResponse],
    summary="List My Applications",
    description="List all applications for current user"
)
async def list_my_applications(
    status_filter: str = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all applications for current user.
    
    Parameters:
    - **status_filter**: Filter by status (applied, screening, interview, offered, rejected, withdrawn)
    - **skip**: Pagination offset
    - **limit**: Maximum results
    """
    
    query = select(Application).filter(Application.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Application.status == status_filter)
    
    result = await db.execute(
        query.order_by(Application.created_at.desc()).offset(skip).limit(limit)
    )
    applications = result.scalars().all()
    
    return [ApplicationStatusResponse.model_validate(app) for app in applications]


@router.patch(
    "/{application_id}/withdraw",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Withdraw Application",
    description="Withdraw an application"
)
async def withdraw_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Withdraw an application.
    """
    
    result = await db.execute(
        select(Application).filter(
            and_(
                Application.id == application_id,
                Application.user_id == current_user.id,
            )
        )
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    
    if application.status == "withdrawn":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application already withdrawn",
        )
    
    application.status = "withdrawn"
    application.updated_at = datetime.utcnow()
    
    await db.commit()
    
    logger.info(f"Application withdrawn: {application_id}")
