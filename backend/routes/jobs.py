"""
Jobs Routes — Master Prompt V2.0
Endpoints: create, list, get, update, delete (recruiter only)
"""

import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database_new import get_db
from models.user_new import User
from models.job_new import Job
from auth.dependencies import get_current_recruiter
from schemas.job import JobCreateRequest, JobResponse, JobListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Job Posting",
    description="Create a new job posting (recruiters only)"
)
async def create_job(
    request: JobCreateRequest,
    recruiter: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new job posting.
    
    Only recruiters can create jobs.
    """
    
    job = Job(
        id=str(uuid.uuid4()),
        recruiter_id=recruiter.id,
        title=request.title,
        company=request.company,
        description=request.description,
        requirements=request.requirements,
        nice_to_have=request.nice_to_have,
        location=request.location,
        job_type=request.job_type,
        work_mode=request.work_mode,
        salary_min=request.salary_min,
        salary_max=request.salary_max,
        required_skills=request.required_skills,
        status="active",
        has_vm_test=request.has_vm_test or False,
        vm_test_duration_minutes=request.vm_test_duration_minutes,
        expires_at=datetime.utcnow() + timedelta(days=30),  # 30-day default expiry
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    logger.info(f"Job created: {job.id} by recruiter {recruiter.email}")
    
    return JobResponse.model_validate(job)


@router.get(
    "",
    response_model=list[JobListResponse],
    summary="List Jobs",
    description="List all active jobs"
)
async def list_jobs(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of active jobs.
    
    Parameters:
    - **skip**: Number of results to skip (pagination)
    - **limit**: Maximum number of results (max 100)
    """
    
    if limit > 100:
        limit = 100
    
    result = await db.execute(
        select(Job)
        .filter(Job.status == "active")
        .order_by(Job.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    jobs = result.scalars().all()
    
    return [JobListResponse.model_validate(j) for j in jobs]


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get Job Details",
    description="Get detailed job information"
)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get job details by ID.
    """
    
    result = await db.execute(select(Job).filter(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    if job.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This job posting is no longer available",
        )
    
    return JobResponse.model_validate(job)


@router.patch(
    "/{job_id}",
    response_model=JobResponse,
    summary="Update Job",
    description="Update job details (recruiter only)"
)
async def update_job(
    job_id: str,
    request: JobCreateRequest,
    recruiter: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db),
):
    """
    Update job posting (only the recruiter who created it).
    """
    
    result = await db.execute(select(Job).filter(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    if job.recruiter_id != recruiter.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own job postings",
        )
    
    # Update fields
    job.title = request.title
    job.company = request.company
    job.description = request.description
    job.requirements = request.requirements
    job.nice_to_have = request.nice_to_have
    job.location = request.location
    job.job_type = request.job_type
    job.work_mode = request.work_mode
    job.salary_min = request.salary_min
    job.salary_max = request.salary_max
    job.required_skills = request.required_skills
    job.has_vm_test = request.has_vm_test or False
    job.vm_test_duration_minutes = request.vm_test_duration_minutes
    job.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(job)
    
    logger.info(f"Job updated: {job.id}")
    
    return JobResponse.model_validate(job)


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Close Job",
    description="Close a job posting (recruiter only)"
)
async def close_job(
    job_id: str,
    recruiter: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db),
):
    """
    Close a job posting.
    """
    
    result = await db.execute(select(Job).filter(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    
    if job.recruiter_id != recruiter.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only close your own job postings",
        )
    
    job.status = "closed"
    job.updated_at = datetime.utcnow()
    
    await db.commit()
    
    logger.info(f"Job closed: {job.id}")
