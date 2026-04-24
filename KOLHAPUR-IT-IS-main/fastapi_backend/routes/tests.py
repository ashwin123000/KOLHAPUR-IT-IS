import logging
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymongo import ReturnDocument

from ..database import db as sqlite_db, get_db
from ..routes.auth import get_current_user
from ..services.execution_runner import run_code

logger = logging.getLogger(__name__)
router = APIRouter()

SUPPORTED_LANGUAGES = {"python", "javascript", "java", "cpp"}
SESSION_EXPIRY_HOURS = 24


def _serialize(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {key: _serialize(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    return value


def _parse_object_id(raw_id: str) -> ObjectId:
    if not ObjectId.is_valid(raw_id):
        raise HTTPException(status_code=400, detail=f"Invalid ObjectId: {raw_id}")
    return ObjectId(raw_id)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_user_id(user: dict[str, Any]) -> str:
    user_id = str(user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authenticated user")
    return user_id


async def _get_project(job_id: str) -> dict[str, Any] | None:
    project = await sqlite_db.fetch_one("SELECT * FROM projects WHERE id = ?", (job_id,))
    if project:
        return project
    return await sqlite_db.fetch_one("SELECT * FROM job_posts WHERE id = ?", (job_id,))


def _job_title_from_project(project: dict[str, Any] | None) -> str:
    if not project:
        return "Untitled job"
    if project.get("title"):
        return project.get("title")
    raw_basic = project.get("basic_details")
    if isinstance(raw_basic, str):
        try:
            raw_basic = json.loads(raw_basic)
        except json.JSONDecodeError:
            raw_basic = {}
    if isinstance(raw_basic, dict) and raw_basic.get("title"):
        return raw_basic["title"]
    return "Untitled job"


async def _assert_test_access_for_candidate(mongo_db, user_id: str, job_id: str) -> dict[str, Any]:
    application = await mongo_db.applications.find_one(
        {
            "$or": [
                {"jobPostId": job_id, "seekerId": user_id},
                {"jobPostId": job_id, "userId": user_id},
            ]
        }
    )
    if not application:
        raise HTTPException(status_code=403, detail="You have not applied to this job")
    return application


async def _get_session_or_expire(mongo_db, session_id: str) -> dict[str, Any]:
    session = await mongo_db.test_sessions.find_one({"_id": _parse_object_id(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.get("status") in {"submitted", "terminated", "expired"}:
        return session

    started_at = session.get("startedAt")
    duration_minutes = int(session.get("durationMinutes", 0) or 0)
    if started_at and duration_minutes:
        deadline = started_at + timedelta(minutes=duration_minutes)
        if _utcnow() > deadline:
            await mongo_db.test_sessions.update_one(
                {"_id": session["_id"]},
                {"$set": {"status": "expired", "endedAt": _utcnow()}},
            )
            session["status"] = "expired"
    return session


class CreateTestBody(BaseModel):
    jobId: str
    title: str = Field(min_length=5)
    description: str = Field(min_length=20)
    starterCode: str = ""
    language: Literal["python", "javascript", "java", "cpp"]
    durationMinutes: int = Field(ge=10, le=180)

    @field_validator("title", "description", "starterCode")
    @classmethod
    def strip_fields(cls, value: str) -> str:
        return (value or "").strip()


class StartSessionBody(BaseModel):
    testId: str
    jobId: str


class RunCodeBody(BaseModel):
    sessionId: str
    code: str
    language: str
    stdin: str = ""


class ViolationBody(BaseModel):
    sessionId: str
    type: Literal["TAB_SWITCH", "FOCUS_LOSS", "COPY_PASTE"]


class SnapshotBody(BaseModel):
    sessionId: str
    imageBase64: str = Field(min_length=20, max_length=2_000_000)


class SubmitCodeBody(BaseModel):
    sessionId: str
    code: str
    language: str
    lastRunOutput: dict[str, Any] | None = None


class SubmitAnswersBody(BaseModel):
    approach: str = Field(min_length=10)
    complexity: str = Field(min_length=10)
    tradeoffs: str = Field(min_length=10)
    edgeCases: str = Field(min_length=10)

    @field_validator("approach", "complexity", "tradeoffs", "edgeCases")
    @classmethod
    def strip_answer(cls, value: str) -> str:
        return (value or "").strip()


def _reasoning_questions() -> list[dict[str, str]]:
    return [
        {
            "key": "approach",
            "label": "Your approach",
            "placeholder": "Walk through the logic you chose and how you landed there.",
        },
        {
            "key": "complexity",
            "label": "Time and space complexity",
            "placeholder": "Explain the runtime and memory profile of your final solution.",
        },
        {
            "key": "tradeoffs",
            "label": "Tradeoffs and alternatives",
            "placeholder": "What other approach did you consider and why did you reject it?",
        },
        {
            "key": "edgeCases",
            "label": "Edge cases",
            "placeholder": "List the tricky cases you handled or intentionally skipped.",
        },
    ]


@router.post("/test/create")
async def create_test(payload: CreateTestBody, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    job = await _get_project(payload.jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    owner_id = str(job.get("client_id") or job.get("posted_by") or "")
    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this job")

    existing = await mongo_db.tests.find_one({"jobId": payload.jobId})
    if existing:
        await mongo_db.tests.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "title": payload.title,
                    "description": payload.description,
                    "starterCode": payload.starterCode,
                    "language": payload.language,
                    "durationMinutes": payload.durationMinutes,
                    "updatedAt": _utcnow(),
                }
            },
        )
        return {
            "testId": str(existing["_id"]),
            "alreadyExists": True,
            "message": "Test updated successfully",
        }

    document = {
        "jobId": payload.jobId,
        "createdBy": user_id,
        "title": payload.title,
        "description": payload.description,
        "starterCode": payload.starterCode,
        "language": payload.language,
        "durationMinutes": payload.durationMinutes,
        "isActive": True,
        "createdAt": _utcnow(),
    }
    result = await mongo_db.tests.insert_one(document)
    return {"testId": str(result.inserted_id), "alreadyExists": False, "message": "Test created successfully"}


@router.get("/test/config/{job_id}")
async def get_test_config(job_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    job = await _get_project(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    owner_id = str(job.get("client_id") or job.get("posted_by") or "")
    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    test = await mongo_db.tests.find_one({"jobId": job_id})
    return {
        "test": _serialize(test) if test else None,
        "reasoningQuestions": _reasoning_questions(),
    }


@router.get("/test/job/{job_id}")
async def get_test_for_job(job_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    await _assert_test_access_for_candidate(mongo_db, user_id, job_id)

    test = await mongo_db.tests.find_one({"jobId": job_id, "isActive": True})
    if not test:
        raise HTTPException(status_code=404, detail="No active test for this job")

    existing_submission = await mongo_db.submissions.find_one({"userId": user_id, "testId": str(test["_id"])})
    existing_session = await mongo_db.test_sessions.find_one(
        {"userId": user_id, "testId": str(test["_id"]), "status": {"$in": ["active", "code_submitted"]}}
    )
    payload = _serialize(test)
    payload.pop("createdBy", None)
    payload["alreadySubmitted"] = existing_submission is not None and existing_submission.get("submittedAt") is not None
    payload["existingSessionId"] = str(existing_session["_id"]) if existing_session else None
    payload["reasoningQuestions"] = _reasoning_questions()
    return payload


@router.post("/test/session/start")
async def start_session(payload: StartSessionBody, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    await _assert_test_access_for_candidate(mongo_db, user_id, payload.jobId)

    test = await mongo_db.tests.find_one({"_id": _parse_object_id(payload.testId), "isActive": True})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found or inactive")

    existing = await mongo_db.test_sessions.find_one({"userId": user_id, "testId": payload.testId})
    if existing:
        existing = await _get_session_or_expire(mongo_db, str(existing["_id"]))
        if existing.get("status") in {"active", "code_submitted"}:
            return {
                "sessionId": str(existing["_id"]),
                "durationMinutes": existing["durationMinutes"],
                "startedAt": existing["startedAt"].isoformat(),
                "resumed": True,
                "status": existing.get("status"),
            }
        if existing.get("status") in {"submitted", "terminated", "expired"}:
            raise HTTPException(status_code=409, detail=f"Session already {existing['status']}")

    now = _utcnow()
    session = {
        "userId": user_id,
        "jobId": payload.jobId,
        "testId": payload.testId,
        "startedAt": now,
        "endedAt": None,
        "durationMinutes": test["durationMinutes"],
        "violations": {"tabSwitches": 0, "focusLoss": 0, "copyPasteAttempts": 0},
        "cameraSnapshots": [],
        "runCount": 0,
        "status": "active",
        "lastRunOutput": None,
    }
    result = await mongo_db.test_sessions.insert_one(session)
    return {
        "sessionId": str(result.inserted_id),
        "durationMinutes": session["durationMinutes"],
        "startedAt": session["startedAt"].isoformat(),
        "resumed": False,
        "status": "active",
    }


@router.post("/test/run")
async def run_code_endpoint(payload: RunCodeBody, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_or_expire(mongo_db, payload.sessionId)
    if session["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session["status"] not in {"active", "code_submitted"}:
        raise HTTPException(status_code=403, detail=f"Session is {session['status']}")
    if not (payload.code or "").strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    result = await run_code(payload.language, payload.code, payload.stdin or "")
    await mongo_db.test_sessions.update_one(
        {"_id": session["_id"]},
        {"$inc": {"runCount": 1}, "$set": {"lastRunOutput": result}},
    )
    return result


@router.post("/test/session/violation")
async def log_violation(payload: ViolationBody, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_or_expire(mongo_db, payload.sessionId)
    if session["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Not your session")

    field_map = {
        "TAB_SWITCH": "violations.tabSwitches",
        "FOCUS_LOSS": "violations.focusLoss",
        "COPY_PASTE": "violations.copyPasteAttempts",
    }
    await mongo_db.test_sessions.update_one({"_id": session["_id"]}, {"$inc": {field_map[payload.type]: 1}})
    return {"logged": True, "type": payload.type}


@router.post("/test/session/snapshot")
async def save_snapshot(payload: SnapshotBody, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_or_expire(mongo_db, payload.sessionId)
    if session["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Not your session")

    snapshot = {"takenAt": _utcnow(), "imageBase64": payload.imageBase64}
    await mongo_db.test_sessions.update_one(
        {"_id": session["_id"]},
        {"$push": {"cameraSnapshots": {"$each": [snapshot], "$slice": -30}}},
    )
    return {"saved": True}


@router.post("/test/submit/code")
async def submit_code(payload: SubmitCodeBody, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    session = await _get_session_or_expire(mongo_db, payload.sessionId)
    if session["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.get("status") == "submitted":
        raise HTTPException(status_code=409, detail="Already submitted")
    if not (payload.code or "").strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    existing = await mongo_db.submissions.find_one({"userId": user_id, "testId": session["testId"]})
    if existing and existing.get("codeSubmittedAt"):
        return {"submissionId": str(existing["_id"]), "nextStep": "logic_questions", "alreadyExists": True}

    now = _utcnow()
    submission = {
        "sessionId": payload.sessionId,
        "testId": session["testId"],
        "jobId": session["jobId"],
        "userId": user_id,
        "code": payload.code,
        "language": payload.language,
        "lastRunOutput": payload.lastRunOutput or session.get("lastRunOutput") or None,
        "runCount": session.get("runCount", 0),
        "codeSubmittedAt": now,
        "answers": {"approach": "", "complexity": "", "tradeoffs": "", "edgeCases": ""},
        "answersSubmittedAt": None,
        "submittedAt": None,
    }
    result = await mongo_db.submissions.insert_one(submission)
    await mongo_db.test_sessions.update_one({"_id": session["_id"]}, {"$set": {"status": "code_submitted"}})
    return {"submissionId": str(result.inserted_id), "nextStep": "logic_questions", "alreadyExists": False}


@router.patch("/test/submit/answers/{submission_id}")
async def submit_answers(submission_id: str, payload: SubmitAnswersBody, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    submission = await mongo_db.submissions.find_one({"_id": _parse_object_id(submission_id)})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Not your submission")
    if not submission.get("codeSubmittedAt"):
        raise HTTPException(status_code=403, detail="Submit code before answering questions")
    if submission.get("submittedAt"):
        raise HTTPException(status_code=409, detail="Already submitted")

    now = _utcnow()
    await mongo_db.submissions.update_one(
        {"_id": submission["_id"]},
        {
            "$set": {
                "answers": payload.model_dump(),
                "answersSubmittedAt": now,
                "submittedAt": now,
            }
        },
    )
    await mongo_db.test_sessions.update_one(
        {"_id": _parse_object_id(submission["sessionId"])},
        {"$set": {"status": "submitted", "endedAt": now}},
    )
    return {"success": True, "message": "Submission complete"}


@router.get("/test/submissions/{job_id}")
async def get_submissions(job_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    job = await _get_project(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    owner_id = str(job.get("client_id") or job.get("posted_by") or "")
    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    test = await mongo_db.tests.find_one({"jobId": job_id})
    if not test:
        return {"submissions": [], "test": None, "totalCount": 0}

    submissions = await mongo_db.submissions.find({"testId": str(test["_id"])}).sort("submittedAt", -1).to_list(length=200)
    enriched = []
    for submission in submissions:
        session = await mongo_db.test_sessions.find_one({"_id": _parse_object_id(submission["sessionId"])})
        seeker = await mongo_db.seekers.find_one({"userId": submission["userId"]})
        application = await mongo_db.applications.find_one({"jobPostId": job_id, "seekerId": submission["userId"]})
        enriched.append(
            {
                **_serialize(submission),
                "session": {
                    "violations": _serialize((session or {}).get("violations", {})),
                    "snapshotCount": len((session or {}).get("cameraSnapshots", [])),
                    "cameraSnapshots": _serialize((session or {}).get("cameraSnapshots", [])[:5]),
                    "status": (session or {}).get("status"),
                    "runCount": (session or {}).get("runCount", 0),
                    "timeTakenSeconds": max(
                        0,
                        int(
                            (
                                ((session or {}).get("endedAt") or _utcnow())
                                - ((session or {}).get("startedAt") or _utcnow())
                            ).total_seconds()
                        ),
                    )
                    if session
                    else 0,
                },
                "seeker": {
                    "name": (seeker or {}).get("identity", {}).get("name") or (application or {}).get("seekerSnapshot", {}).get("name") or "Unknown candidate",
                    "email": (seeker or {}).get("identity", {}).get("email", ""),
                    "personaArchetype": (seeker or {}).get("aiProfile", {}).get("personaArchetype", ""),
                    "careerTrajectory": (seeker or {}).get("aiProfile", {}).get("careerTrajectory", ""),
                    "skillCount": len((seeker or {}).get("skills", [])),
                },
                "matchScore": (application or {}).get("matchData", {}).get("totalScore"),
                "violationCount": sum(int(v or 0) for v in ((session or {}).get("violations") or {}).values()),
            }
        )

    return {
        "submissions": enriched,
        "test": _serialize(test),
        "totalCount": len(enriched),
        "reasoningQuestions": _reasoning_questions(),
    }


@router.patch("/test/{test_id}/toggle")
async def toggle_test(test_id: str, user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    test = await mongo_db.tests.find_one({"_id": _parse_object_id(test_id)})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test.get("createdBy") != user_id:
        raise HTTPException(status_code=403, detail="Not your test")

    updated = await mongo_db.tests.find_one_and_update(
        {"_id": test["_id"]},
        {"$set": {"isActive": not test.get("isActive", True)}},
        return_document=ReturnDocument.AFTER,
    )
    return {
        "isActive": bool(updated.get("isActive")),
        "message": "Test activated" if updated.get("isActive") else "Test deactivated",
    }


@router.get("/test/my-assignments")
async def my_test_assignments(user: dict[str, Any] = Depends(get_current_user)):
    mongo_db = await get_db()
    user_id = _get_user_id(user)
    applications = await mongo_db.applications.find({"seekerId": user_id}).sort("appliedAt", -1).to_list(length=100)
    job_ids = [app.get("jobPostId") for app in applications if app.get("jobPostId")]
    tests_by_job = {
        test["jobId"]: test
        for test in await mongo_db.tests.find({"jobId": {"$in": job_ids}}).to_list(length=200)
    }

    results = []
    for application in applications:
        job_id = application.get("jobPostId")
        test = tests_by_job.get(job_id)
        if not test:
            continue
        project = await _get_project(job_id)
        submission = await mongo_db.submissions.find_one({"userId": user_id, "testId": str(test["_id"])})
        session = await mongo_db.test_sessions.find_one({"userId": user_id, "testId": str(test["_id"])})
        results.append(
            {
                "jobId": job_id,
                "jobTitle": _job_title_from_project(project) or application.get("projectTitle") or "Untitled job",
                "applicationId": application.get("applicationId"),
                "matchScore": application.get("matchData", {}).get("totalScore"),
                "companyName": application.get("companyName") or application.get("clientName") or "Client Project",
                "test": {
                    "_id": str(test["_id"]),
                    "title": test.get("title"),
                    "language": test.get("language"),
                    "durationMinutes": test.get("durationMinutes"),
                    "isActive": test.get("isActive", True),
                },
                "sessionStatus": (session or {}).get("status"),
                "submitted": submission is not None and submission.get("submittedAt") is not None,
            }
        )
    return {"assignments": results}
