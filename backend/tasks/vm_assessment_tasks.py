from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from statistics import mean
from types import SimpleNamespace

from sqlalchemy import select

from celery_app import celery_app
from database_new import async_session_maker
from models.job_new import Job
from models.user_new import User
from models.vm_session import (
    VMAnswer,
    VMBehavior,
    VMImprovement,
    VMQuestion,
    VMResult,
    VMSession,
    VMSubmission,
)
from services.vm_evaluation import (
    add_line_numbers,
    analyze_code_quality,
    compute_execution_behavior_score,
    compute_final_score,
    fallback_generate_questions,
    fallback_score_answer,
    persist_chunks,
    retrieve_relevant_chunks,
    run_deterministic_checks,
    split_code_into_chunks,
)
from services.vm_runtime import cleanup_workspace, container_pool


logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.vm_assessment.evaluate_submission", bind=True, max_retries=3)
def evaluate_submission(self, session_id: str):
    asyncio.run(_evaluate_submission(session_id))


async def _evaluate_submission(session_id: str):
    async with async_session_maker() as db:
        session = await db.get(VMSession, session_id)
        if not session:
            return
        submission_result = await db.execute(
            select(VMSubmission).where(VMSubmission.session_id == session.id).order_by(VMSubmission.submitted_at.desc())
        )
        submission = submission_result.scalars().first()
        if not submission:
            session.status = "error"
            await db.commit()
            return
        project = await db.get(Job, session.project_id)
        chunks = split_code_into_chunks(submission.code)
        persist_chunks(session_id, chunks)
        questions = fallback_generate_questions(submission.code)
        existing = await db.execute(select(VMQuestion).where(VMQuestion.session_id == session.id))
        question_row = existing.scalars().first()
        if question_row:
            question_row.questions = questions
            question_row.generated_at = datetime.utcnow()
        else:
            db.add(VMQuestion(session_id=session.id, questions=questions))
        session.status = "submitted"
        await db.commit()


@celery_app.task(name="tasks.vm_assessment.evaluate_answers", bind=True, max_retries=3)
def evaluate_answers(self, session_id: str):
    asyncio.run(_evaluate_answers(session_id))


async def _evaluate_answers(session_id: str):
    async with async_session_maker() as db:
        session = await db.get(VMSession, session_id)
        if not session:
            return
        submission = (await db.execute(select(VMSubmission).where(VMSubmission.session_id == session.id).order_by(VMSubmission.submitted_at.desc()))).scalars().first()
        answer_row = (await db.execute(select(VMAnswer).where(VMAnswer.session_id == session.id).order_by(VMAnswer.submitted_at.desc()))).scalars().first()
        question_row = (await db.execute(select(VMQuestion).where(VMQuestion.session_id == session.id).order_by(VMQuestion.generated_at.desc()))).scalars().first()
        if not submission or not answer_row or not question_row:
            session.status = "error"
            await db.commit()
            return

        per_answer_scores = []
        for answer in answer_row.answers:
            question = next((q for q in question_row.questions if q["index"] == answer["question_index"]), None)
            relevant_chunks = retrieve_relevant_chunks(session_id, answer["answer"], k=3)
            per_answer_scores.append(
                fallback_score_answer(question["text"] if question else "", answer["answer"], relevant_chunks)
            )

        llm_raw_score = round(mean(item["score"] for item in per_answer_scores)) if per_answer_scores else 0
        code_metrics = analyze_code_quality(submission.code)
        deterministic = run_deterministic_checks(submission.code, answer_row.answers)
        behavior = (await db.execute(select(VMBehavior).where(VMBehavior.session_id == session.id))).scalars().first()
        metrics = SimpleNamespace(
            run_count=behavior.run_count if behavior else 0,
            error_count=behavior.error_count if behavior else 0,
            minutes_to_first_clean_run=(
                (behavior.first_clean_run_at - behavior.first_run_at).total_seconds() / 60
                if behavior and behavior.first_run_at and behavior.first_clean_run_at else 999
            ),
            first_run_was_clean=bool(behavior and behavior.run_count == 1 and behavior.error_count == 0),
        )
        execution_behavior_score = compute_execution_behavior_score(metrics)
        final_score = compute_final_score(
            llm_raw_score=llm_raw_score,
            rule_penalties=deterministic["total_penalty"],
            code_quality_score=code_metrics.get("quality_score", 0),
            execution_behavior_score=execution_behavior_score,
        )
        reasoning = " ".join(item["feedback"] for item in per_answer_scores)
        result = (await db.execute(select(VMResult).where(VMResult.session_id == session.id))).scalars().first()
        if result:
            result.score = final_score
            result.reasoning = reasoning
            result.llm_explanation_score = llm_raw_score
            result.code_quality_score = code_metrics.get("quality_score", 0)
            result.execution_behavior_score = execution_behavior_score
            result.participation_score = 100
            result.rule_penalties = deterministic["total_penalty"]
            result.penalty_reasons = list(deterministic["penalties"].keys())
            result.evaluated_at = datetime.utcnow()
        else:
            db.add(
                VMResult(
                    session_id=session.id,
                    user_id=session.user_id,
                    project_id=session.project_id,
                    score=final_score,
                    reasoning=reasoning,
                    llm_explanation_score=llm_raw_score,
                    code_quality_score=code_metrics.get("quality_score", 0),
                    execution_behavior_score=execution_behavior_score,
                    participation_score=100,
                    rule_penalties=deterministic["total_penalty"],
                    penalty_reasons=list(deterministic["penalties"].keys()),
                )
            )
        await db.flush()

        all_results = (
            await db.execute(select(VMResult).where(VMResult.project_id == session.project_id).order_by(VMResult.score.desc(), VMResult.evaluated_at.asc()))
        ).scalars().all()
        for idx, row in enumerate(all_results, start=1):
            row.rank = idx

        session.status = "evaluated"
        session.ended_at = datetime.utcnow()
        await db.commit()
        generate_improvement.delay(session_id)
        container_pool.release(session_id, destroy=True)
        cleanup_workspace(session_id)


@celery_app.task(name="tasks.vm_assessment.generate_improvement", bind=True, max_retries=2)
def generate_improvement(self, session_id: str):
    asyncio.run(_generate_improvement(session_id))


async def _generate_improvement(session_id: str):
    async with async_session_maker() as db:
        session = await db.get(VMSession, session_id)
        if not session:
            return
        submission = (await db.execute(select(VMSubmission).where(VMSubmission.session_id == session.id).order_by(VMSubmission.submitted_at.desc()))).scalars().first()
        if not submission:
            return
        improved_code = (
            "# IMPROVEMENT: Added a docstring scaffold and clearer main flow.\n"
            "\"\"\"Improved candidate submission.\"\"\"\n\n"
            + submission.code
        )
        existing = (await db.execute(select(VMImprovement).where(VMImprovement.session_id == session.id))).scalars().first()
        if existing:
            existing.improved_code = improved_code
            existing.generated_at = datetime.utcnow()
        else:
            db.add(VMImprovement(session_id=session.id, improved_code=improved_code))
        await db.commit()

