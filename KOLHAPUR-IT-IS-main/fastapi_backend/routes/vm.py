from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from ..database import db as sqlite_db, get_db, loads
from ..routes.auth import get_current_user
from ..services.execution_runner import normalize_language, run_code


router = APIRouter()
SESSION_EXPIRY_HOURS = 24


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_datetime(dt: Any) -> datetime:
    if not isinstance(dt, datetime):
        raise ValueError(f"Expected datetime, got {type(dt).__name__}")
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _serialize(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    return value


def _parse_object_id(raw_id: str) -> ObjectId:
    if not ObjectId.is_valid(raw_id):
        raise HTTPException(status_code=400, detail=f"Invalid session id: {raw_id}")
    return ObjectId(raw_id)


def _get_user_id(user: dict[str, Any]) -> str:
    user_id = str(user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authenticated user")
    return user_id


def _starter_comment(language: str) -> str:
    return "#" if normalize_language(language) == "python" else "//"


def _build_starter_code(language: str, title: str) -> str:
    comment = _starter_comment(language)
    return (
        f"{comment} {title}\n"
        f"{comment} Write your solution here.\n"
    )


def _normalize_project(row: dict[str, Any]) -> dict[str, Any]:
    language = normalize_language(row.get("language") or "python") or "python"
    skills = row.get("skills_required")
    if isinstance(skills, str):
        skills = loads(skills, [])
    if not isinstance(skills, list):
        skills = []
    return {
        "project_id": row.get("id"),
        "id": row.get("id"),
        "title": row.get("title") or "Untitled project",
        "description": row.get("description") or "",
        "required_skills": skills,
        "skills_required": skills,
        "status": row.get("status") or "open",
        "environment": {
            "language": language,
            "starter_code": _build_starter_code(language, row.get("title") or "Untitled project"),
        },
    }


async def _get_project(project_id: str) -> dict[str, Any]:
    project = await sqlite_db.fetch_one("SELECT * FROM projects WHERE id = ? AND status = 'open'", (project_id,))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _normalize_project(project)


async def _get_session_for_user(mongo_db, session_id: str, user_id: str) -> dict[str, Any]:
    try:
        session = await mongo_db.vm_sessions.find_one({"_id": _parse_object_id(session_id)})
        if not session:
            raise HTTPException(status_code=404, detail="VM session not found")
        if str(session.get("user_id") or "") != user_id:
            raise HTTPException(status_code=403, detail="Not your VM session")

        created_at = session.get("created_at")
        if session.get("status") not in {"evaluated", "ended", "timed_out"} and created_at is not None:
            normalized_created_at = normalize_datetime(created_at)
            if _utcnow() - normalized_created_at > timedelta(hours=SESSION_EXPIRY_HOURS):
                await mongo_db.vm_sessions.update_one(
                    {"_id": session["_id"]},
                    {"$set": {"status": "timed_out", "updated_at": _utcnow()}},
                )
                session["status"] = "timed_out"
        return session
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=f"Malformed VM session timestamp: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load VM session: {exc}") from exc


def _question_set(session: dict[str, Any]) -> list[dict[str, Any]]:
    code = str(session.get("code") or "")
    lines = [line for line in code.splitlines() if line.strip()]
    first_line = 1
    for index, line in enumerate(code.splitlines(), start=1):
        if line.strip():
            first_line = index
            break

    line_reference = first_line if lines else None
    return [
        {
            "index": 0,
            "type": "Approach",
            "line_reference": line_reference,
            "text": "Explain the approach you chose for this solution and why it fits the project prompt.",
        },
        {
            "index": 1,
            "type": "Complexity",
            "line_reference": line_reference,
            "text": "Describe the time and space complexity of your implementation.",
        },
        {
            "index": 2,
            "type": "Tradeoff",
            "line_reference": line_reference,
            "text": "What tradeoffs or edge cases did you consider while writing this code?",
        },
    ]


def _build_improved_code(session: dict[str, Any]) -> str:
    code = str(session.get("code") or "")
    language = normalize_language(session.get("language") or "python") or "python"
    comment = _starter_comment(language)
    note = (
        f"{comment} IMPROVEMENT: add explicit input validation and stronger edge-case handling.\n"
        f"{comment} IMPROVEMENT: include a few representative tests before final submission.\n"
    )
    return f"{note}\n{code}".strip()


def _compute_score(session: dict[str, Any]) -> int:
    code = str(session.get("code") or "").strip()
    answers = session.get("answers") or []
    run_output = session.get("last_run_output") or {}
    answered_count = sum(1 for answer in answers if str(answer.get("answer") or "").strip())
    score = 35 if code else 0
    score += min(30, len(code.splitlines()) * 3)
    score += min(30, answered_count * 10)
    if int(run_output.get("exit_code", 1)) == 0:
        score += 5
    return max(0, min(100, score))


class VMStartPayload(BaseModel):
    project_id: str = Field(min_length=1)

    @field_validator("project_id")
    @classmethod
    def strip_project_id(cls, value: str) -> str:
        return (value or "").strip()


class VMAutosavePayload(BaseModel):
    session_id: str = Field(min_length=1)
    code: str = ""


class VMRunPayload(BaseModel):
    session_id: str = Field(min_length=1)
    code: str = ""
    language: str = "python"


class VMSubmitPayload(BaseModel):
    session_id: str = Field(min_length=1)
    code: str = ""
    language: str = "python"


class VMAnswersPayload(BaseModel):
    session_id: str = Field(min_length=1)
    answers: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/projects")
async def get_vm_projects(user: dict[str, Any] = Depends(get_current_user)):
    _get_user_id(user)
    rows = await sqlite_db.fetch_all("SELECT * FROM projects WHERE status = 'open' ORDER BY created_at DESC")
    return {"success": True, "data": [_normalize_project(row) for row in rows]}


@router.post("/start")
async def start_vm(payload: VMStartPayload, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    project = await _get_project(payload.project_id)

    existing = await mongo_db.vm_sessions.find_one(
        {
            "user_id": user_id,
            "project_id": payload.project_id,
            "status": {"$in": ["active", "submitted", "questions_ready"]},
        },
        sort=[("created_at", -1)],
    )
    if existing:
        return {
            "session_id": str(existing["_id"]),
            "project_id": payload.project_id,
            "status": existing.get("status", "active"),
        }

    session = {
        "user_id": user_id,
        "user_name": user.get("name") or user.get("full_name") or user.get("email") or "Candidate",
        "project_id": payload.project_id,
        "project": project,
        "language": project["environment"]["language"],
        "code": project["environment"]["starter_code"],
        "status": "active",
        "created_at": _utcnow(),
        "updated_at": _utcnow(),
        "last_run_output": {"stdout": "", "stderr": "", "exit_code": 0},
        "questions": [],
        "answers": [],
        "result": None,
        "improved_code": "",
    }
    result = await mongo_db.vm_sessions.insert_one(session)
    return {
        "session_id": str(result.inserted_id),
        "project_id": payload.project_id,
        "status": "active",
    }


@router.get("/session/{session_id}")
async def get_vm_session(session_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, session_id, user_id)
    return {
        "success": True,
        "data": {
            "session_id": session_id,
            "status": session.get("status"),
            "project_id": session.get("project_id"),
            "project": _serialize(session.get("project") or {}),
            "language": session.get("language") or "python",
            "code": session.get("code") or "",
        },
    }


@router.post("/autosave")
async def autosave_vm(payload: VMAutosavePayload, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, payload.session_id, user_id)
    if session.get("status") in {"evaluated", "ended", "timed_out"}:
        raise HTTPException(status_code=409, detail=f"Session is {session.get('status')}")
    await mongo_db.vm_sessions.update_one(
        {"_id": session["_id"]},
        {"$set": {"code": payload.code, "updated_at": _utcnow()}},
    )
    return {"success": True, "saved": True}


@router.post("/run")
async def run_vm(payload: VMRunPayload, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, payload.session_id, user_id)
    if session.get("status") in {"evaluated", "ended", "timed_out"}:
        raise HTTPException(status_code=409, detail=f"Session is {session.get('status')}")

    result = await run_code(payload.language or session.get("language") or "python", payload.code or "")
    normalized = {
        "stdout": result.get("stdout", ""),
        "stderr": result.get("stderr", ""),
        "exit_code": int(result.get("exitCode", 1)),
        "timed_out": bool(result.get("timedOut", False)),
        "execution_time_ms": int(result.get("executionTimeMs", 0)),
    }
    await mongo_db.vm_sessions.update_one(
        {"_id": session["_id"]},
        {
            "$set": {
                "code": payload.code,
                "language": normalize_language(payload.language or session.get("language") or "python"),
                "last_run_output": normalized,
                "updated_at": _utcnow(),
            }
        },
    )
    return normalized


@router.post("/submit")
async def submit_vm(payload: VMSubmitPayload, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, payload.session_id, user_id)
    if session.get("status") in {"evaluated", "ended", "timed_out"}:
        raise HTTPException(status_code=409, detail=f"Session is {session.get('status')}")

    updated_session = {
        **session,
        "code": payload.code,
        "language": normalize_language(payload.language or session.get("language") or "python"),
    }
    questions = _question_set(updated_session)
    await mongo_db.vm_sessions.update_one(
        {"_id": session["_id"]},
        {
            "$set": {
                "code": payload.code,
                "language": updated_session["language"],
                "questions": questions,
                "status": "questions_ready",
                "updated_at": _utcnow(),
            }
        },
    )
    return {"success": True, "session_id": payload.session_id, "status": "questions_ready"}


@router.get("/questions/{session_id}")
async def get_vm_questions(session_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, session_id, user_id)
    questions = session.get("questions") or []
    if session.get("status") in {"active", "submitted"} and not questions:
        return {"status": "pending", "questions": []}
    return {"status": "ready", "questions": questions}


@router.post("/answers")
async def submit_vm_answers(payload: VMAnswersPayload, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, payload.session_id, user_id)
    if session.get("status") in {"evaluated", "ended", "timed_out"}:
        raise HTTPException(status_code=409, detail=f"Session is {session.get('status')}")

    next_session = {**session, "answers": payload.answers}
    score = _compute_score(next_session)
    result = {
        "score": score,
        "reasoning": "Evaluation was based on code completeness, runtime behavior, and the clarity of your written explanations.",
        "project_id": session.get("project_id"),
    }
    await mongo_db.vm_sessions.update_one(
        {"_id": session["_id"]},
        {
            "$set": {
                "answers": payload.answers,
                "result": result,
                "improved_code": _build_improved_code(next_session),
                "status": "evaluated",
                "updated_at": _utcnow(),
            }
        },
    )
    return {"success": True, "status": "evaluated"}


@router.get("/result/{session_id}")
async def get_vm_result(session_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, session_id, user_id)
    if session.get("status") == "timed_out":
        return {"status": "timed_out"}
    if session.get("status") != "evaluated":
        return {
            "status": session.get("status") or "active",
            "project_id": session.get("project_id"),
        }

    sessions = await mongo_db.vm_sessions.find(
        {"project_id": session.get("project_id"), "status": "evaluated"}
    ).to_list(length=500)
    ranked = sorted(sessions, key=lambda item: int((item.get("result") or {}).get("score", 0)), reverse=True)
    session_key = str(session["_id"])
    rank = next((index for index, item in enumerate(ranked, start=1) if str(item["_id"]) == session_key), 1)
    total = len(ranked) or 1
    result = session.get("result") or {}
    return {
        "status": "evaluated",
        "score": int(result.get("score", 0)),
        "rank": rank,
        "total": total,
        "reasoning": result.get("reasoning") or "",
        "project_id": session.get("project_id"),
    }


@router.get("/leaderboard/{project_id}")
async def get_vm_leaderboard(project_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    _get_user_id(user)
    sessions = await mongo_db.vm_sessions.find(
        {"project_id": project_id, "status": "evaluated"}
    ).to_list(length=100)
    ranked = sorted(sessions, key=lambda item: int((item.get("result") or {}).get("score", 0)), reverse=True)
    leaderboard = [
        {
            "rank": index,
            "user_id": item.get("user_id"),
            "name": item.get("user_name") or "Candidate",
            "score": int((item.get("result") or {}).get("score", 0)),
        }
        for index, item in enumerate(ranked, start=1)
    ]
    return {"leaderboard": leaderboard}


@router.get("/improvement/{session_id}")
async def get_vm_improvement(session_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, session_id, user_id)
    if session.get("status") != "evaluated":
        return {"status": "pending"}
    return {
        "status": "ready",
        "improved_code": session.get("improved_code") or _build_improved_code(session),
    }


@router.delete("/session/{session_id}")
async def end_vm_session(session_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_for_user(mongo_db, session_id, user_id)
    await mongo_db.vm_sessions.update_one(
        {"_id": session["_id"]},
        {"$set": {"status": "ended", "updated_at": _utcnow()}},
    )
    return {"success": True, "session_id": session_id, "status": "ended"}
