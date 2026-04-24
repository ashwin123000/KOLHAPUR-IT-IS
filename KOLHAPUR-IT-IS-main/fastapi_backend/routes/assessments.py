from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from ..database import db as sqlite_db, get_db, loads
from ..routes.auth import get_current_user
from ..services.grading_service import build_codebase_summary, grade_submission
from ..services.scheduler import get_scheduler


logger = logging.getLogger(__name__)
router = APIRouter()


def _user_id(user: dict[str, Any]) -> str:
    value = str(user.get("id") or "").strip()
    if not value:
        raise HTTPException(status_code=401, detail="Invalid authenticated user")
    return value


def _require_role(user: dict[str, Any], role: str) -> None:
    if str(user.get("role") or "").strip() != role:
        raise HTTPException(status_code=403, detail=f"{role.title()} access required")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _get_job(job_id: str) -> dict[str, Any] | None:
    project = await sqlite_db.fetch_one("SELECT * FROM projects WHERE id = ?", (job_id,))
    if project:
        return {**project, "_source": "projects", "_owner_id": project.get("client_id"), "_title": project.get("title")}
    job_post = await sqlite_db.fetch_one("SELECT * FROM job_posts WHERE id = ?", (job_id,))
    if job_post:
        basic_details = loads(job_post.get("basic_details"), {}) or {}
        return {
            **job_post,
            "_source": "job_posts",
            "_owner_id": job_post.get("posted_by"),
            "_title": basic_details.get("title") or "Untitled job",
        }
    job = await sqlite_db.fetch_one("SELECT * FROM jobs WHERE id = ?", (job_id,))
    if job:
        return {**job, "_source": "jobs", "_owner_id": job.get("client_id"), "_title": job.get("title")}
    return None


async def _assert_client_owns_job(job_id: str, user_id: str) -> dict[str, Any]:
    job = await _get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if str(job.get("_owner_id") or "") != user_id:
        raise HTTPException(status_code=403, detail="You do not own this job")
    return job


async def _assert_freelancer_applied(job_id: str, freelancer_id: str) -> None:
    sqlite_application = await sqlite_db.fetch_one(
        "SELECT id FROM applications WHERE project_id = ? AND freelancer_id = ?",
        (job_id, freelancer_id),
    )
    if sqlite_application:
        return
    mongo_db = await get_db()
    mongo_application = await mongo_db.applications.find_one(
        {
            "$or": [
                {"jobPostId": job_id, "seekerId": freelancer_id},
                {"jobPostId": job_id, "userId": freelancer_id},
            ]
        }
    )
    if mongo_application:
        return
    raise HTTPException(status_code=403, detail="You have not applied to this job")


async def _get_assessment_with_job(assessment_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    assessment = await sqlite_db.fetch_one("SELECT * FROM assessments WHERE id = ?", (assessment_id,))
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    job = await _get_job(assessment["job_id"])
    if not job:
        raise HTTPException(status_code=404, detail="Linked job not found")
    return assessment, job


async def _notify_assigned_freelancers(assessment_id: str, job_id: str, title: str) -> None:
    mongo_db = await get_db()
    application_rows = await sqlite_db.fetch_all(
        "SELECT freelancer_id FROM applications WHERE project_id = ?",
        (job_id,),
    )
    freelancer_ids = {row["freelancer_id"] for row in application_rows if row.get("freelancer_id")}
    async for doc in mongo_db.applications.find({"jobPostId": job_id}, {"seekerId": 1, "userId": 1}):
        if doc.get("seekerId"):
            freelancer_ids.add(str(doc["seekerId"]))
        if doc.get("userId"):
            freelancer_ids.add(str(doc["userId"]))

    now = _utcnow()
    documents = [
        {
            "userId": freelancer_id,
            "type": "vm_assessment",
            "entityId": assessment_id,
            "message": f"VM Test Available: {title}",
            "isRead": False,
            "createdAt": now,
        }
        for freelancer_id in freelancer_ids
    ]
    if documents:
        await mongo_db.notifications.insert_many(documents)


class RubricPayload(BaseModel):
    score_0: str = Field(min_length=3)
    score_50: str = Field(min_length=3)
    score_100: str = Field(min_length=3)


class FilePayload(BaseModel):
    filename: str = Field(min_length=1)
    content: str
    is_primary: bool = False

    @field_validator("filename", "content")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return (value or "").strip()


class QuestionPayload(BaseModel):
    scenario: str = Field(min_length=10)
    task: str = Field(min_length=10)
    pattern_a: str = Field(min_length=3)
    pattern_b: str = Field(min_length=3)
    rubric: RubricPayload

    @field_validator("scenario", "task", "pattern_a", "pattern_b")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return (value or "").strip()


class AssessmentCreatePayload(BaseModel):
    job_id: str
    title: str = Field(min_length=3)
    language: str = Field(min_length=2)
    files: list[FilePayload]
    questions: list[QuestionPayload]

    @field_validator("title", "language")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return (value or "").strip()


class AnswerPayload(BaseModel):
    question_id: str
    answer_text: str

    @field_validator("question_id", "answer_text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return (value or "").strip()


class AssessmentSubmitPayload(BaseModel):
    submission_id: str
    answers: list[AnswerPayload]
    auto_submitted: bool = False
    violation_reason: str | None = None


@router.post("/create")
async def create_assessment(payload: AssessmentCreatePayload, user: dict[str, Any] = Depends(get_current_user)):
    _require_role(user, "client")
    user_id = _user_id(user)
    await _assert_client_owns_job(payload.job_id, user_id)

    if not payload.files:
        raise HTTPException(status_code=400, detail="At least one file is required")
    if len(payload.questions) == 0 or len(payload.questions) > 5:
        raise HTTPException(status_code=400, detail="Questions must contain between 1 and 5 items")
    primary_count = sum(1 for file in payload.files if file.is_primary)
    if primary_count == 0:
        payload.files[0].is_primary = True
    elif primary_count > 1:
        raise HTTPException(status_code=400, detail="Only one primary file is allowed")

    assessment_id = str(uuid.uuid4())
    codebase_ref = str(uuid.uuid4())
    await sqlite_db.execute(
        """
        INSERT INTO assessments (id, job_id, created_by, title, codebase_ref, status, language)
        VALUES (?, ?, ?, ?, ?, 'active', ?)
        """,
        (assessment_id, payload.job_id, user_id, payload.title, codebase_ref, payload.language),
    )

    mongo_db = await get_db()
    file_docs = [file.model_dump() for file in payload.files]
    await mongo_db.vm_codebases.update_one(
        {"assessment_id": assessment_id},
        {"$set": {
            "assessment_id": assessment_id,
            "language": payload.language,
            "files": file_docs,
            "uploaded_by": user_id,
            "created_at": _utcnow(),
        }},
        upsert=True,
    )
    summary = build_codebase_summary(file_docs)
    await mongo_db.vm_codebase_summaries.update_one(
        {"assessment_id": assessment_id},
        {"$set": {
            "assessment_id": assessment_id,
            "summary_text": summary["summary_text"],
            "file_map": summary["file_map"],
            "generated_at": _utcnow(),
            "model_used": "local-summary-v1",
        }},
        upsert=True,
    )

    for index, question in enumerate(payload.questions, start=1):
        await sqlite_db.execute(
            """
            INSERT INTO assessment_questions (
                id, assessment_id, question_order, scenario, task, pattern_a, pattern_b, evaluation_rubric
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                assessment_id,
                index,
                question.scenario,
                question.task,
                question.pattern_a,
                question.pattern_b,
                json.dumps(question.rubric.model_dump()),
            ),
        )

    await _notify_assigned_freelancers(assessment_id, payload.job_id, payload.title)
    return {"assessment_id": assessment_id, "status": "active"}


@router.get("/job/{job_id}")
async def get_assessment_for_job(job_id: str, user: dict[str, Any] = Depends(get_current_user)):
    _require_role(user, "client")
    user_id = _user_id(user)
    await _assert_client_owns_job(job_id, user_id)
    assessment = await sqlite_db.fetch_one(
        """
        SELECT
            a.*,
            (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count,
            (SELECT COUNT(*) FROM assessment_submissions s WHERE s.assessment_id = a.id) AS submission_count
        FROM assessments a
        WHERE a.job_id = ?
        ORDER BY a.created_at DESC
        LIMIT 1
        """,
        (job_id,),
    )
    if not assessment:
        return {"assessment": None}
    return {"assessment": assessment}


@router.get("/pending")
async def get_pending_assessments(user: dict[str, Any] = Depends(get_current_user)):
    _require_role(user, "freelancer")
    freelancer_id = _user_id(user)
    rows = await sqlite_db.fetch_all(
        """
        SELECT a.id, a.title, a.created_at, a.job_id
        FROM assessments a
        JOIN applications app ON app.project_id = a.job_id
        LEFT JOIN assessment_submissions s
          ON s.assessment_id = a.id
         AND s.freelancer_id = app.freelancer_id
        WHERE app.freelancer_id = ?
          AND a.status = 'active'
          AND (s.id IS NULL OR s.status = 'in_progress')
        ORDER BY a.created_at DESC
        """,
        (freelancer_id,),
    )
    items = []
    for row in rows:
        job = await _get_job(row["job_id"])
        items.append({
            "id": row["id"],
            "title": row["title"],
            "job_title": (job or {}).get("_title", "Untitled job"),
            "created_at": row["created_at"],
        })
    return {"assignments": items}


@router.get("/{assessment_id}/take")
async def take_assessment(assessment_id: str, user: dict[str, Any] = Depends(get_current_user)):
    _require_role(user, "freelancer")
    freelancer_id = _user_id(user)
    assessment, _job = await _get_assessment_with_job(assessment_id)
    if assessment["status"] != "active":
        raise HTTPException(status_code=403, detail="Assessment is closed")
    await _assert_freelancer_applied(assessment["job_id"], freelancer_id)

    submission = await sqlite_db.fetch_one(
        """
        SELECT * FROM assessment_submissions
        WHERE assessment_id = ? AND freelancer_id = ?
        ORDER BY started_at DESC
        LIMIT 1
        """,
        (assessment_id, freelancer_id),
    )
    if submission and submission["status"] in {"submitted", "graded", "grading_failed"}:
        raise HTTPException(status_code=409, detail="Assessment already submitted")
    if not submission:
        submission_id = str(uuid.uuid4())
        await sqlite_db.execute(
            """
            INSERT INTO assessment_submissions (id, assessment_id, freelancer_id, status)
            VALUES (?, ?, ?, 'in_progress')
            """,
            (submission_id, assessment_id, freelancer_id),
        )
        submission = await sqlite_db.fetch_one("SELECT * FROM assessment_submissions WHERE id = ?", (submission_id,))

    mongo_db = await get_db()
    codebase = await mongo_db.vm_codebases.find_one({"assessment_id": assessment_id})
    if not codebase:
        raise HTTPException(status_code=404, detail="Assessment codebase not found")
    questions = await sqlite_db.fetch_all(
        """
        SELECT id, question_order, scenario, task, pattern_a, pattern_b
        FROM assessment_questions
        WHERE assessment_id = ?
        ORDER BY question_order
        """,
        (assessment_id,),
    )
    return {
        "submission_id": submission["id"],
        "assessment": {
            "id": assessment["id"],
            "title": assessment["title"],
            "language": assessment["language"],
        },
        "codebase": {
            "files": codebase.get("files", []),
        },
        "questions": [
            {
                "id": question["id"],
                "order": question["question_order"],
                "scenario": question["scenario"],
                "task": question["task"],
                "pattern_a": question["pattern_a"],
                "pattern_b": question["pattern_b"],
            }
            for question in questions
        ],
    }


@router.post("/{assessment_id}/submit")
async def submit_assessment(
    assessment_id: str,
    payload: AssessmentSubmitPayload,
    user: dict[str, Any] = Depends(get_current_user),
):
    _require_role(user, "freelancer")
    freelancer_id = _user_id(user)
    assessment, _job = await _get_assessment_with_job(assessment_id)
    if assessment["status"] != "active":
        raise HTTPException(status_code=403, detail="Assessment is closed")
    submission = await sqlite_db.fetch_one(
        "SELECT * FROM assessment_submissions WHERE id = ? AND assessment_id = ?",
        (payload.submission_id, assessment_id),
    )
    if not submission or submission["freelancer_id"] != freelancer_id:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission["status"] != "in_progress":
        raise HTTPException(status_code=409, detail="Submission is already finalized")

    question_ids = {
        row["id"]
        for row in await sqlite_db.fetch_all(
            "SELECT id FROM assessment_questions WHERE assessment_id = ?",
            (assessment_id,),
        )
    }
    provided_ids = set()
    for answer in payload.answers:
        if answer.question_id not in question_ids:
            raise HTTPException(status_code=400, detail=f"Unknown question: {answer.question_id}")
        provided_ids.add(answer.question_id)
    if not payload.auto_submitted and question_ids - provided_ids:
        raise HTTPException(status_code=400, detail="All questions must be answered before manual submit")

    for answer in payload.answers:
        existing = await sqlite_db.fetch_one(
            "SELECT id FROM submission_answers WHERE submission_id = ? AND question_id = ?",
            (payload.submission_id, answer.question_id),
        )
        if existing:
            await sqlite_db.execute(
                "UPDATE submission_answers SET answer_text = ? WHERE id = ?",
                (answer.answer_text, existing["id"]),
            )
        else:
            await sqlite_db.execute(
                """
                INSERT INTO submission_answers (id, submission_id, question_id, answer_text)
                VALUES (?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), payload.submission_id, answer.question_id, answer.answer_text),
            )

    await sqlite_db.execute(
        """
        UPDATE assessment_submissions
        SET status = 'submitted',
            submitted_at = CURRENT_TIMESTAMP,
            auto_submitted = ?,
            violation_reason = ?
        WHERE id = ?
        """,
        (1 if payload.auto_submitted else 0, payload.violation_reason, payload.submission_id),
    )

    scheduler = get_scheduler()
    scheduler.add_job(
        grade_submission,
        trigger="date",
        run_date=datetime.now(timezone.utc),
        kwargs={"submission_id": payload.submission_id},
        id=f"assessment-grade-{payload.submission_id}",
        replace_existing=True,
        misfire_grace_time=60,
    )
    return {
        "submission_id": payload.submission_id,
        "status": "submitted",
        "message": "Grading in progress",
    }


@router.get("/{assessment_id}/results/freelancer")
async def freelancer_results(assessment_id: str, user: dict[str, Any] = Depends(get_current_user)):
    _require_role(user, "freelancer")
    freelancer_id = _user_id(user)
    submission = await sqlite_db.fetch_one(
        """
        SELECT * FROM assessment_submissions
        WHERE assessment_id = ? AND freelancer_id = ?
        ORDER BY started_at DESC
        LIMIT 1
        """,
        (assessment_id, freelancer_id),
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission["status"] == "submitted":
        return {"status": "grading_in_progress"}

    score = await sqlite_db.fetch_one(
        "SELECT * FROM assessment_scores WHERE submission_id = ?",
        (submission["id"],),
    )
    answers = await sqlite_db.fetch_all(
        """
        SELECT q.scenario, q.task, sa.answer_text, sa.llm_feedback, sa.llm_score
        FROM submission_answers sa
        JOIN assessment_questions q ON q.id = sa.question_id
        WHERE sa.submission_id = ?
        ORDER BY q.question_order
        """,
        (submission["id"],),
    )
    return {
        "status": submission["status"],
        "auto_submitted": bool(submission["auto_submitted"]),
        "violation_reason": submission.get("violation_reason"),
        "score": score or {},
        "answers": answers,
    }


@router.get("/{assessment_id}/leaderboard")
async def assessment_leaderboard(assessment_id: str, user: dict[str, Any] = Depends(get_current_user)):
    _require_role(user, "client")
    user_id = _user_id(user)
    assessment, job = await _get_assessment_with_job(assessment_id)
    if str(job.get("_owner_id") or "") != user_id:
        raise HTTPException(status_code=403, detail="You do not own this job")

    rows = await sqlite_db.fetch_all(
        """
        SELECT
            sc.freelancer_id,
            sc.total_score,
            sc.percentile,
            s.submitted_at,
            s.auto_submitted,
            s.violation_reason,
            sc.grading_flag
        FROM assessment_scores sc
        JOIN assessment_submissions s ON s.id = sc.submission_id
        WHERE sc.assessment_id = ?
        ORDER BY sc.total_score DESC, s.submitted_at ASC
        """,
        (assessment_id,),
    )
    mongo_db = await get_db()
    leaderboard = []
    for index, row in enumerate(rows, start=1):
        user_doc = None
        if ObjectId.is_valid(row["freelancer_id"]):
            user_doc = await mongo_db.users.find_one({"_id": ObjectId(row["freelancer_id"])})
        name = (
            (user_doc or {}).get("full_name")
            or (user_doc or {}).get("username")
            or (user_doc or {}).get("email")
            or "Candidate"
        )
        leaderboard.append({
            "rank": index,
            "freelancer_id": row["freelancer_id"],
            "name": name,
            "total_score": row["total_score"],
            "percentile": row["percentile"],
            "submitted_at": row["submitted_at"],
            "auto_submitted": bool(row["auto_submitted"]),
            "violation_reason": row["violation_reason"],
            "grading_flag": row.get("grading_flag"),
        })
    return {"leaderboard": leaderboard}


@router.patch("/{assessment_id}/close")
async def close_assessment(assessment_id: str, user: dict[str, Any] = Depends(get_current_user)):
    _require_role(user, "client")
    user_id = _user_id(user)
    assessment, job = await _get_assessment_with_job(assessment_id)
    if str(job.get("_owner_id") or "") != user_id:
        raise HTTPException(status_code=403, detail="You do not own this job")
    await sqlite_db.execute("UPDATE assessments SET status = 'closed' WHERE id = ?", (assessment["id"],))
    return {"assessment_id": assessment_id, "status": "closed"}
