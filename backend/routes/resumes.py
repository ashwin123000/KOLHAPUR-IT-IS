"""
Resume Routes — Master Prompt V2.0
Endpoints: upload, get status, get details, list
"""

import logging
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database_new import get_db
from models.user_new import User
from models.resume import Resume
from auth.dependencies import get_current_user
from services.resume_parser import parse_resume
from schemas.resume import (
    ResumeUploadResponse,
    ResumeStatusResponse,
    ResumeDetailsResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resumes", tags=["resumes"])

# Background job scheduler (will be initialized in main.py)
scheduler: AsyncIOScheduler = None


def set_scheduler(sched: AsyncIOScheduler):
    """Set the scheduler instance from main.py."""
    global scheduler
    scheduler = sched


# ============================================================
# HELPER FUNCTIONS
# ============================================================

async def process_resume_background(resume_id: str, pdf_bytes: bytes, file_name: str, db: AsyncSession):
    """Background job to process resume."""
    try:
        # Parse resume
        parsed_data = await parse_resume(pdf_bytes, file_name)
        
        # Update database
        result = await db.execute(select(Resume).filter(Resume.id == resume_id))
        resume = result.scalar_one_or_none()
        
        if resume:
            resume.raw_text = parsed_data.get("raw_text", "")
            resume.parse_status = parsed_data.get("parse_status", "failed")
            resume.parse_error = parsed_data.get("parse_error")
            resume.name = parsed_data.get("name")
            resume.email = parsed_data.get("email")
            resume.phone = parsed_data.get("phone")
            resume.location = parsed_data.get("location")
            resume.summary = parsed_data.get("summary")
            resume.skills = parsed_data.get("skills", [])
            resume.experience = parsed_data.get("experience", [])
            resume.education = parsed_data.get("education", [])
            resume.certifications = parsed_data.get("certifications", [])
            resume.projects = parsed_data.get("projects", [])
            resume.skill_embedding = parsed_data.get("skill_embedding")
            resume.updated_at = datetime.utcnow()
            
            await db.commit()
            logger.info(f"✅ Resume {resume_id} processing complete")
    
    except Exception as e:
        logger.error(f"Background resume processing failed: {e}")
        # Update status to failed in database
        result = await db.execute(select(Resume).filter(Resume.id == resume_id))
        resume = result.scalar_one_or_none()
        if resume:
            resume.parse_status = "failed"
            resume.parse_error = str(e)
            await db.commit()


# ============================================================
# ENDPOINTS
# ============================================================

@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Resume",
    description="Upload a PDF resume for parsing"
)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a PDF resume.
    
    - **file**: PDF file (max 10MB)
    
    Returns resume with status "pending" (processing in background).
    """
    
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported",
        )
    
    # Validate file size (max 10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 10MB limit",
        )
    
    # Check if user already has a resume (only one allowed for now)
    result = await db.execute(
        select(Resume).filter(
            Resume.user_id == current_user.id,
            Resume.parse_status != "failed",
        )
    )
    existing_resume = result.scalar_one_or_none()
    
    if existing_resume:
        logger.warning(f"User {current_user.id} attempted to upload duplicate resume")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "RESUME_EXISTS",
                "message": "You already have an active resume. Delete it first to upload another.",
            }
        )
    
    # Create resume record with pending status
    resume_id = str(uuid.uuid4())
    resume = Resume(
        id=resume_id,
        user_id=current_user.id,
        file_name=file.filename,
        raw_text="",
        parse_status="pending",
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    logger.info(f"Resume uploaded: {resume_id} (user: {current_user.email})")
    
    # Schedule background processing
    if scheduler:
        scheduler.add_job(
            process_resume_background,
            args=(resume_id, file_content, file.filename, db),
            id=f"resume_{resume_id}",
            replace_existing=True,
        )
    
    return ResumeUploadResponse(
        id=resume_id,
        status="pending",
        message="Resume uploaded successfully. Processing in background...",
    )


@router.get(
    "/{resume_id}/status",
    response_model=ResumeStatusResponse,
    summary="Get Resume Status",
    description="Get parsing status of a resume"
)
async def get_resume_status(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get resume parsing status.
    
    Returns:
    - **status**: "pending", "processing", "done", or "failed"
    - **error**: Error message if status is "failed"
    """
    
    result = await db.execute(
        select(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    
    return ResumeStatusResponse(
        id=resume.id,
        status=resume.parse_status,
        error=resume.parse_error,
    )


@router.get(
    "/{resume_id}",
    response_model=ResumeDetailsResponse,
    summary="Get Resume Details",
    description="Get full parsed resume details"
)
async def get_resume_details(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get full resume details (only if parsing is complete).
    
    Returns all parsed resume information.
    """
    
    result = await db.execute(
        select(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    
    if resume.parse_status != "done":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "NOT_READY",
                "message": f"Resume is still {resume.parse_status}. Try again in a moment.",
            }
        )
    
    return ResumeDetailsResponse.model_validate(resume)


@router.get(
    "",
    response_model=list[ResumeDetailsResponse],
    summary="List My Resumes",
    description="List all resumes for current user"
)
async def list_my_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all completed resumes for current user.
    """
    
    result = await db.execute(
        select(Resume)
        .filter(
            Resume.user_id == current_user.id,
            Resume.parse_status == "done",
        )
        .order_by(Resume.created_at.desc())
    )
    resumes = result.scalars().all()
    
    return [ResumeDetailsResponse.model_validate(r) for r in resumes]


@router.delete(
    "/{resume_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Resume",
    description="Delete a resume"
)
async def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a resume (only the owner can delete).
    """
    
    result = await db.execute(
        select(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    
    # Also remove from background jobs
    if scheduler:
        try:
            scheduler.remove_job(f"resume_{resume_id}")
        except:
            pass
    
    await db.delete(resume)
    await db.commit()
    
    logger.info(f"Resume deleted: {resume_id}")
