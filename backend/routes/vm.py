"""
VM Routes — Master Prompt V2.0
Endpoints: start session, submit code, get results, track events
"""

import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from database_new import get_db
from models.user_new import User
from models.vm_session import VMSession, VMEvent
from models.application import Application
from auth.dependencies import get_current_user
from services.vm_service import (
    VMContainerManager,
    AntiCheatDetector,
    CodeTester,
    PerformanceScorer,
)
from schemas.vm import (
    VMSessionStartRequest,
    VMSessionResponse,
    VMCodeSubmitRequest,
    VMCodeSubmitResponse,
    VMEventRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vm", tags=["vm"])


@router.post(
    "/sessions/start",
    response_model=VMSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start VM Test Session",
    description="Start a new coding test session"
)
async def start_vm_session(
    request: VMSessionStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a new VM test session.
    
    - **application_id**: The application ID for this test
    - **questions**: Test questions with inputs/expected outputs
    """
    
    # Verify application exists and belongs to user
    app_result = await db.execute(
        select(Application).filter(
            and_(
                Application.id == request.application_id,
                Application.user_id == current_user.id,
            )
        )
    )
    application = app_result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    
    # Start Docker container
    try:
        session_id = str(uuid.uuid4())
        container_id, port = await VMContainerManager.start_container(session_id)
    except Exception as e:
        logger.error(f"Failed to start container: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start test environment",
        )
    
    # Create VM session record
    vm_session = VMSession(
        id=str(uuid.uuid4()),
        application_id=request.application_id,
        user_id=current_user.id,
        job_id=application.job_id,
        container_id=container_id,
        container_port=port,
        session_token=str(uuid.uuid4()),
        status="running",
        current_question_index=0,
        total_questions=len(request.questions),
        questions=request.questions,
        answers=[],
        max_score=len(request.questions) * 100,  # Each question worth 100 points
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    
    db.add(vm_session)
    await db.commit()
    await db.refresh(vm_session)
    
    logger.info(
        f"VM session started: {vm_session.id} "
        f"(user: {current_user.email}, container: {container_id[:12]})"
    )
    
    return VMSessionResponse.model_validate(vm_session)


@router.post(
    "/sessions/{session_id}/submit",
    response_model=VMCodeSubmitResponse,
    summary="Submit Code Solution",
    description="Submit code for a test question"
)
async def submit_code(
    session_id: str,
    request: VMCodeSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit code solution for grading.
    
    - **code**: The code to submit
    - **question_index**: Which question (0-indexed)
    """
    
    # Get session
    result = await db.execute(
        select(VMSession).filter(
            and_(
                VMSession.id == session_id,
                VMSession.user_id == current_user.id,
            )
        )
    )
    vm_session = result.scalar_one_or_none()
    
    if not vm_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    if vm_session.status == "expired":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has expired",
        )
    
    # Validate question index
    if request.question_index >= vm_session.total_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid question index",
        )
    
    question = vm_session.questions[request.question_index]
    test_cases = question.get("test_cases", [])
    
    # Grade solution
    grading_result = await CodeTester.grade_solution(
        request.code,
        test_cases,
        vm_session.container_id,
    )
    
    # Store answer
    answers = vm_session.answers or []
    answers.append({
        "question_index": request.question_index,
        "code": request.code,
        "score": grading_result["score"],
        "passed_tests": grading_result["passed_tests"],
        "total_tests": grading_result["total_tests"],
        "submitted_at": datetime.utcnow().isoformat(),
    })
    
    vm_session.answers = answers
    vm_session.current_question_index = request.question_index + 1
    
    # Calculate running score
    total_score = sum(a["score"] for a in answers)
    vm_session.score = total_score / vm_session.total_questions if vm_session.total_questions > 0 else 0
    
    await db.commit()
    
    logger.info(
        f"Code submitted (session: {session_id}, question: {request.question_index}, score: {grading_result['score']:.1f})"
    )
    
    return VMCodeSubmitResponse(
        question_index=request.question_index,
        passed=grading_result["passed_tests"],
        total=grading_result["total_tests"],
        score=grading_result["score"],
        running_score=vm_session.score,
    )


@router.post(
    "/sessions/{session_id}/events",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Track Anti-Cheat Event",
    description="Track suspicious activities"
)
async def track_event(
    session_id: str,
    request: VMEventRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Track anti-cheat events during session.
    
    Event types: tab_switch, copy_paste, focus_lost, devtools_open, etc.
    """
    
    # Get session
    result = await db.execute(
        select(VMSession).filter(
            and_(
                VMSession.id == session_id,
                VMSession.user_id == current_user.id,
            )
        )
    )
    vm_session = result.scalar_one_or_none()
    
    if not vm_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    # Process event
    processed_event = AntiCheatDetector.process_event(request.event_type, request.metadata)
    
    # Store event
    event = VMEvent(
        id=str(uuid.uuid4()),
        session_id=session_id,
        event_type=request.event_type,
        severity=processed_event["severity"],
        flagged=processed_event["flagged"],
        metadata=processed_event["metadata"],
    )
    
    db.add(event)
    
    # Check if session should be flagged
    event_result = await db.execute(
        select(VMEvent).filter(VMEvent.session_id == session_id)
    )
    all_events = event_result.scalars().all()
    
    integrity_analysis = AntiCheatDetector.calculate_session_score(
        [
            {
                "event_type": e.event_type,
                "severity": e.severity,
                "flagged": e.flagged,
            }
            for e in all_events + [event]
        ]
    )
    
    if integrity_analysis["integrity_score"] < 50:
        vm_session.status = "flagged"
    
    await db.commit()
    
    logger.info(f"Anti-cheat event tracked: {request.event_type} (severity: {processed_event['severity']})")


@router.post(
    "/sessions/{session_id}/complete",
    response_model=dict,
    summary="Complete VM Session",
    description="End session and get final results"
)
async def complete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete VM session and generate final score.
    """
    
    # Get session
    result = await db.execute(
        select(VMSession).filter(
            and_(
                VMSession.id == session_id,
                VMSession.user_id == current_user.id,
            )
        )
    )
    vm_session = result.scalar_one_or_none()
    
    if not vm_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    # Get all events
    event_result = await db.execute(
        select(VMEvent).filter(VMEvent.session_id == session_id)
    )
    events = event_result.scalars().all()
    
    # Calculate integrity score
    integrity_analysis = AntiCheatDetector.calculate_session_score(
        [
            {
                "event_type": e.event_type,
                "severity": e.severity,
                "flagged": e.flagged,
            }
            for e in events
        ]
    )
    
    # Calculate final score
    test_score = vm_session.score or 0.0
    integrity_score = integrity_analysis["integrity_score"]
    
    final_score = PerformanceScorer.calculate_score(
        test_score, integrity_score, 0  # time_taken would be calculated from session duration
    )
    
    # Generate postmortem
    postmortem = await PerformanceScorer.generate_postmortem(
        final_score,
        {
            "passed_tests": len([a for a in (vm_session.answers or []) if a.get("score") == 100.0]),
            "total_tests": vm_session.total_questions,
        },
        integrity_score,
    )
    
    # Update session
    vm_session.status = "completed"
    vm_session.score = final_score
    vm_session.performance_summary = postmortem
    
    await db.commit()
    
    # Stop container
    await VMContainerManager.stop_container(vm_session.container_id)
    
    logger.info(
        f"VM session completed: {session_id} "
        f"(score: {final_score:.1f}, integrity: {integrity_score:.1f})"
    )
    
    return {
        "session_id": session_id,
        "final_score": final_score,
        "test_score": test_score,
        "integrity_score": integrity_score,
        "postmortem": postmortem,
    }


@router.get(
    "/sessions/{session_id}",
    response_model=VMSessionResponse,
    summary="Get Session Status",
    description="Get current session status and progress"
)
async def get_session_status(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get VM session status and progress.
    """
    
    result = await db.execute(
        select(VMSession).filter(
            and_(
                VMSession.id == session_id,
                VMSession.user_id == current_user.id,
            )
        )
    )
    vm_session = result.scalar_one_or_none()
    
    if not vm_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    return VMSessionResponse.model_validate(vm_session)
