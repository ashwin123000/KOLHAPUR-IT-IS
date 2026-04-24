from __future__ import annotations

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_recruiter, get_current_user
from celery_app import celery_app
from database_new import get_db
from models.job_new import Job
from models.user_new import User
from models.vm_session import (
    VMAnswer,
    VMBehavior,
    VMBehaviorEvent,
    VMImprovement,
    VMQuestion,
    VMResult,
    VMSession,
    VMSubmission,
)
from schemas.vm import (
    VMAnalyticsResponse,
    VMAnswersRequest,
    VMImprovementResponse,
    VMLeaderboardEntry,
    VMLeaderboardResponse,
    VMProjectSummary,
    VMQuestionsResponse,
    VMResultResponse,
    VMRunRequest,
    VMRunResponse,
    VMAutosaveRequest,
    VMStartRequest,
    VMStartResponse,
    VMSubmitRequest,
    VMSubmitResponse,
)
from services.vm_runtime import (
    VMInfrastructureError,
    VMResourceError,
    cleanup_workspace,
    container_pool,
    exec_code,
    security_scan,
    seed_workspace,
    write_main_file,
)
from tasks.vm_assessment_tasks import evaluate_answers, evaluate_submission


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vm", tags=["vm"])
projects_router = APIRouter(prefix="/projects", tags=["projects"])
recruiter_router = APIRouter(prefix="/recruiter", tags=["recruiter"])


def _project_to_summary(project: Job) -> VMProjectSummary:
    skills = []
    for item in project.required_skills or []:
        if isinstance(item, dict):
            skills.append(str(item.get("skill") or item.get("name") or ""))
        else:
            skills.append(str(item))
    return VMProjectSummary(
        project_id=str(project.id),
        title=project.title,
        description=project.description,
        required_skills=[skill for skill in skills if skill],
        environment=project.environment or {},
        repo_url=project.repo_url,
    )


async def _get_session_or_404(db: AsyncSession, session_id: str) -> VMSession:
    session = await db.get(VMSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


async def _owned_session(db: AsyncSession, session_id: str, user_id: str) -> VMSession:
    session = await _get_session_or_404(db, session_id)
    if str(session.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied.")
    return session


async def _log_event(db: AsyncSession, session_id: str, event_type: str, payload: dict):
    db.add(VMBehaviorEvent(session_id=session_id, event_type=event_type, event_payload=payload))
    await db.flush()


@projects_router.get("", response_model=list[VMProjectSummary])
async def list_vm_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Job).where(Job.status == "active", Job.has_vm_test.is_(True)).order_by(Job.created_at.desc())
    )
    return [_project_to_summary(project) for project in result.scalars().all()]


@router.post("/start", response_model=VMStartResponse)
async def start_vm(
    request: VMStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Job, request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = (
        await db.execute(
            select(VMSession).where(
                VMSession.user_id == current_user.id,
                VMSession.project_id == project.id,
                VMSession.status == "active",
            )
        )
    ).scalars().first()
    if existing:
        return VMStartResponse(
            session_id=str(existing.id),
            vm_url=existing.vm_url or "",
            status=existing.status,
            project=_project_to_summary(project),
        )

    session_id = str(uuid.uuid4())
    try:
        container = container_pool.acquire(session_id)
        workspace_path = await seed_workspace(container, session_id, project)
    except VMInfrastructureError as exc:
        raise HTTPException(status_code=503, detail="VM infrastructure unavailable. Contact admin.") from exc
    except VMResourceError as exc:
        raise HTTPException(status_code=507, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Docker error: {exc}") from exc

    vm_session = VMSession(
        id=session_id,
        user_id=current_user.id,
        job_id=project.id,
        project_id=project.id,
        container_name=f"vm_{session_id}",
        container_id=container.id,
        vm_url=f"docker://{container.id[:12]}",
        workspace_path=workspace_path,
        language=(project.environment or {}).get("language", "python"),
        status="active",
        started_at=datetime.utcnow(),
        last_activity_at=datetime.utcnow(),
    )
    db.add(vm_session)
    db.add(VMBehavior(session_id=session_id))
    await db.commit()

    return VMStartResponse(
        session_id=session_id,
        vm_url=vm_session.vm_url or "",
        status="active",
        project=_project_to_summary(project),
    )


@router.post("/autosave")
async def autosave(
    request: VMAutosaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _owned_session(db, request.session_id, str(current_user.id))
    if session.status not in {"active", "submitted"}:
        raise HTTPException(status_code=400, detail="No active session found.")
    try:
        container = container_pool.client.containers.get(session.container_id)
        await write_main_file(container, request.code)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Docker error: {exc}") from exc
    session.last_activity_at = datetime.utcnow()
    behavior = (await db.execute(select(VMBehavior).where(VMBehavior.session_id == session.id))).scalars().first()
    if behavior:
        behavior.final_code_length_chars = len(request.code)
    await _log_event(db, request.session_id, "autosave", {"code_length": len(request.code)})
    await db.commit()
    return {"saved": True, "timestamp": datetime.utcnow().isoformat()}


@router.post("/run", response_model=VMRunResponse)
async def run_vm_code(
    request: VMRunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _owned_session(db, request.session_id, str(current_user.id))
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session not active")

    allowed, reason = security_scan(request.code)
    if not allowed:
        return VMRunResponse(stdout="", stderr=reason, exit_code=-1, execution_time_ms=0)

    try:
        container = container_pool.client.containers.get(session.container_id)
        await write_main_file(container, request.code)
        result = await exec_code(container, request.language)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Docker error: {exc}") from exc

    session.last_activity_at = datetime.utcnow()
    behavior = (await db.execute(select(VMBehavior).where(VMBehavior.session_id == session.id))).scalars().first()
    if behavior:
        behavior.run_count += 1
        behavior.final_code_length_chars = len(request.code)
        if behavior.first_run_at is None:
            behavior.first_run_at = datetime.utcnow()
        if result["exit_code"] != 0:
            behavior.error_count += 1
        if result["exit_code"] == 0 and behavior.first_clean_run_at is None:
            behavior.first_clean_run_at = datetime.utcnow()
    event_payload = {
        "exit_code": result["exit_code"],
        "duration_ms": result["execution_time_ms"],
        "code_length": len(request.code),
    }
    await _log_event(db, request.session_id, "run_attempt", event_payload)
    if result["exit_code"] == 0:
        await _log_event(db, request.session_id, "clean_run", event_payload)
    if "SyntaxError" in result["stderr"]:
        await _log_event(db, request.session_id, "syntax_error", {"error_message": result["stderr"]})
    await db.commit()
    return VMRunResponse(**result)


@router.post("/submit", response_model=VMSubmitResponse)
async def submit_vm_code(
    request: VMSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _owned_session(db, request.session_id, str(current_user.id))
    if session.status != "active":
        raise HTTPException(status_code=400, detail="No active session found.")

    submission = VMSubmission(session_id=session.id, code=request.code, language=request.language)
    db.add(submission)
    session.status = "submitted"
    session.submitted_at = datetime.utcnow()
    session.last_activity_at = datetime.utcnow()
    behavior = (await db.execute(select(VMBehavior).where(VMBehavior.session_id == session.id))).scalars().first()
    if behavior:
        behavior.submitted_at = datetime.utcnow()
        behavior.final_code_length_chars = len(request.code)
    await _log_event(db, request.session_id, "submit", {"code_length": len(request.code)})
    await db.commit()
    try:
        evaluate_submission.delay(str(session.id))
    except Exception:
        await evaluate_submission.run(str(session.id))
    return VMSubmitResponse(
        message="Code submitted. Questions will be generated shortly.",
        submission_id=str(submission.submission_id),
    )


@router.get("/questions/{session_id}", response_model=VMQuestionsResponse)
async def get_questions(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _owned_session(db, session_id, str(current_user.id))
    question_row = (
        await db.execute(select(VMQuestion).where(VMQuestion.session_id == session_id).order_by(VMQuestion.generated_at.desc()))
    ).scalars().first()
    if not question_row:
        return VMQuestionsResponse(status="pending", questions=None)
    return VMQuestionsResponse(status="ready", questions=question_row.questions)


@router.post("/answers")
async def submit_answers(
    request: VMAnswersRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _owned_session(db, request.session_id, str(current_user.id))
    if session.status not in {"submitted", "active"}:
        raise HTTPException(status_code=400, detail="No active session found.")
    db.add(VMAnswer(session_id=session.id, answers=[item.model_dump() for item in request.answers]))
    session.status = "evaluating"
    session.last_activity_at = datetime.utcnow()
    await _log_event(db, request.session_id, "answer_typed", {"answer_lengths": [len(item.answer) for item in request.answers]})
    await db.commit()
    try:
        evaluate_answers.delay(str(session.id))
    except Exception:
        await evaluate_answers.run(str(session.id))
    return {"message": "Answers received. Evaluation in progress."}


@router.get("/result/{session_id}", response_model=VMResultResponse)
async def get_result(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _owned_session(db, session_id, str(current_user.id))
    if session.status == "timed_out":
        return VMResultResponse(status="timed_out", project_id=str(session.project_id))
    result = (await db.execute(select(VMResult).where(VMResult.session_id == session.id))).scalars().first()
    if not result:
        return VMResultResponse(status=session.status, project_id=str(session.project_id))
    total = (
        await db.execute(select(func.count(VMResult.result_id)).where(VMResult.project_id == result.project_id))
    ).scalar_one()
    return VMResultResponse(
        status="evaluated",
        score=result.score,
        rank=result.rank,
        total=int(total),
        reasoning=result.reasoning,
        evaluated_at=result.evaluated_at,
        project_id=str(result.project_id),
    )


@router.get("/leaderboard/{project_id}", response_model=VMLeaderboardResponse)
async def get_leaderboard(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(VMResult, User)
            .join(User, User.id == VMResult.user_id)
            .where(VMResult.project_id == project_id)
            .order_by(VMResult.rank.asc(), VMResult.score.desc())
        )
    ).all()
    leaderboard = [
        VMLeaderboardEntry(
            rank=result.rank or index + 1,
            user_id=str(user.id),
            name=user.full_name or user.email,
            score=result.score or 0,
            reasoning=result.reasoning,
            evaluated_at=result.evaluated_at,
        )
        for index, (result, user) in enumerate(rows)
    ]
    return VMLeaderboardResponse(project_id=project_id, total=len(leaderboard), leaderboard=leaderboard)


@router.get("/improvement/{session_id}", response_model=VMImprovementResponse)
async def get_improvement(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _owned_session(db, session_id, str(current_user.id))
    improvement = (await db.execute(select(VMImprovement).where(VMImprovement.session_id == session_id))).scalars().first()
    if not improvement:
        return VMImprovementResponse(status="pending")
    return VMImprovementResponse(status="ready", improved_code=improvement.improved_code)


@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def end_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _owned_session(db, session_id, str(current_user.id))
    container_pool.release(session_id, destroy=True)
    cleanup_workspace(session_id)
    session.status = "ended"
    session.ended_at = datetime.utcnow()
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@recruiter_router.get("/session/{session_id}/analytics", response_model=VMAnalyticsResponse)
async def recruiter_session_analytics(
    session_id: str,
    recruiter: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(db, session_id)
    project = await db.get(Job, session.project_id)
    if not project or str(project.recruiter_id) != str(recruiter.id):
        raise HTTPException(status_code=403, detail="Access denied.")
    behavior = (await db.execute(select(VMBehavior).where(VMBehavior.session_id == session.id))).scalars().first()
    events = (
        await db.execute(
            select(VMBehaviorEvent).where(VMBehaviorEvent.session_id == session.id).order_by(VMBehaviorEvent.occurred_at.asc())
        )
    ).scalars().all()
    duration_minutes = int(((session.submitted_at or datetime.utcnow()) - session.started_at).total_seconds() / 60) if session.started_at else 0
    error_rate = round((behavior.error_count / max(behavior.run_count, 1)) * 100) if behavior else 0
    first_clean_minute = None
    if behavior and behavior.first_run_at and behavior.first_clean_run_at:
        first_clean_minute = int((behavior.first_clean_run_at - behavior.first_run_at).total_seconds() / 60)
    overview = {
        "started_at": session.started_at,
        "submitted_at": session.submitted_at,
        "duration_minutes": duration_minutes,
        "total_runs": behavior.run_count if behavior else 0,
        "error_rate_pct": error_rate,
        "first_clean_run_at_minute": first_clean_minute,
        "final_code_length_chars": behavior.final_code_length_chars if behavior else 0,
    }
    timeline = [
        {
            "minute": int((event.occurred_at - session.started_at).total_seconds() / 60) if session.started_at else 0,
            "event": event.event_type,
            **event.event_payload,
        }
        for event in events
    ]
    behavior_score = max(0, 100 - error_rate)
    interpretation = (
        "Candidate iterated steadily and reached submission with a manageable error profile."
        if error_rate < 50
        else "Candidate showed a high error rate and likely learned significantly during the session."
    )
    return VMAnalyticsResponse(
        session_overview=overview,
        timeline=timeline,
        interpretation=interpretation,
        behavior_score=behavior_score,
    )
