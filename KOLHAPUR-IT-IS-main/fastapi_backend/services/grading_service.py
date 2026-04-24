from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from typing import Any

from ..database import db as sqlite_db, get_db, loads


logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_codebase_summary(files: list[dict[str, Any]]) -> dict[str, Any]:
    file_map: list[dict[str, Any]] = []
    summary_parts: list[str] = []

    for file in files:
        filename = str(file.get("filename") or "unknown")
        content = str(file.get("content") or "")
        lines = content.splitlines()
        symbols = re.findall(r"(?:def|class|function|const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)", content)
        symbols = list(dict.fromkeys(symbols))[:8]
        purpose = "configuration or support file"
        lowered = filename.lower()
        if "readme" in lowered:
            purpose = "documentation"
        elif any(name in lowered for name in ["main", "app", "index", "server", "routes", "api"]):
            purpose = "application entrypoint or core flow"
        elif any(name in lowered for name in ["model", "schema", "db"]):
            purpose = "data model or persistence layer"
        elif any(name in lowered for name in ["service", "manager", "util", "helper"]):
            purpose = "business logic or helper layer"
        elif any(name in lowered for name in ["test", "spec"]):
            purpose = "tests"

        file_map.append({
            "filename": filename,
            "purpose": purpose,
            "key_symbols": symbols,
        })
        preview = "\n".join(lines[:30]).strip()
        summary_parts.append(
            f"FILE: {filename}\nPurpose: {purpose}\nKey symbols: {', '.join(symbols) if symbols else 'none'}\nPreview:\n{preview[:900]}"
        )

    return {
        "summary_text": "\n\n".join(summary_parts)[:14000],
        "file_map": file_map,
    }


def select_code_excerpts(files: list[dict[str, Any]], questions: list[dict[str, Any]]) -> str:
    keywords: set[str] = set()
    for question in questions:
        for field in ("scenario", "task", "pattern_a", "pattern_b"):
            text = str(question.get(field) or "")
            for token in re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", text):
                keywords.add(token.lower())

    excerpts: list[str] = []
    for file in files[:8]:
        filename = str(file.get("filename") or "")
        content = str(file.get("content") or "")
        matched_lines: list[str] = []
        for line in content.splitlines():
            lowered = line.lower()
            if any(keyword in lowered for keyword in keywords):
                matched_lines.append(line)
            if len(matched_lines) >= 25:
                break
        if not matched_lines:
            matched_lines = content.splitlines()[:15]
        excerpts.append(f"FILE: {filename}\n" + "\n".join(matched_lines[:25]))
    return "\n\n".join(excerpts)[:12000]


def parse_json_payload(raw_content: str) -> dict[str, Any]:
    text = raw_content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


async def call_groq(prompt: str) -> tuple[str, int]:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured")

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.1,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a technical assessment grader. "
                    "You must respond ONLY with valid JSON. "
                    "Do not include markdown or any prose outside the JSON."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    }

    def _request() -> str:
        req = urllib.request.Request(
            GROQ_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            body = response.read().decode("utf-8")
        parsed = json.loads(body)
        return str(parsed["choices"][0]["message"]["content"])

    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            return await asyncio.to_thread(_request), attempt
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, KeyError, json.JSONDecodeError) as exc:
            last_error = exc
            logger.warning("Groq grading attempt %s failed: %s", attempt, exc)
            await asyncio.sleep(min(attempt, 3))
    raise RuntimeError(f"Groq grading failed after retries: {last_error}")


async def recompute_percentiles(assessment_id: str) -> None:
    rows = await sqlite_db.fetch_all(
        """
        WITH ranked AS (
            SELECT
                submission_id,
                PERCENT_RANK() OVER (ORDER BY total_score) * 100.0 AS percentile
            FROM assessment_scores
            WHERE assessment_id = ? AND total_score IS NOT NULL
        )
        SELECT submission_id, percentile FROM ranked
        """,
        (assessment_id,),
    )
    for row in rows:
        await sqlite_db.execute(
            "UPDATE assessment_scores SET percentile = ?, computed_at = CURRENT_TIMESTAMP WHERE submission_id = ?",
            (float(row.get("percentile") or 0), row["submission_id"]),
        )


async def grade_submission(submission_id: str) -> None:
    mongo_db = await get_db()
    submission = await sqlite_db.fetch_one("SELECT * FROM assessment_submissions WHERE id = ?", (submission_id,))
    if not submission:
        raise RuntimeError(f"Submission not found: {submission_id}")

    assessment = await sqlite_db.fetch_one("SELECT * FROM assessments WHERE id = ?", (submission["assessment_id"],))
    if not assessment:
        raise RuntimeError(f"Assessment not found for submission: {submission_id}")

    answers = await sqlite_db.fetch_all(
        """
        SELECT sa.*, aq.scenario, aq.task, aq.pattern_a, aq.pattern_b, aq.evaluation_rubric
        FROM submission_answers sa
        JOIN assessment_questions aq ON aq.id = sa.question_id
        WHERE sa.submission_id = ?
        ORDER BY aq.question_order
        """,
        (submission_id,),
    )
    codebase = await mongo_db.vm_codebases.find_one({"assessment_id": assessment["id"]}) or {}
    summary_doc = await mongo_db.vm_codebase_summaries.find_one({"assessment_id": assessment["id"]}) or {}
    files = codebase.get("files") or []
    summary_text = str(summary_doc.get("summary_text") or "")
    file_map = summary_doc.get("file_map") or []
    if not summary_text:
        summary_doc = build_codebase_summary(files)
        summary_text = summary_doc["summary_text"]
        file_map = summary_doc["file_map"]
        await mongo_db.vm_codebase_summaries.update_one(
            {"assessment_id": assessment["id"]},
            {"$set": {
                "assessment_id": assessment["id"],
                "summary_text": summary_text,
                "file_map": file_map,
                "generated_at": datetime.now(timezone.utc),
                "model_used": "local-summary-v1",
            }},
            upsert=True,
        )

    batched_questions = []
    for answer in answers:
        batched_questions.append({
            "question_id": answer["question_id"],
            "scenario": answer["scenario"],
            "task": answer["task"],
            "pattern_a": answer["pattern_a"],
            "pattern_b": answer["pattern_b"],
            "rubric": loads(answer["evaluation_rubric"], {}),
            "candidate_answer": answer["answer_text"],
        })

    prompt = (
        "You are grading a senior engineering candidate's VM assessment submission.\n\n"
        f"ASSESSMENT ID:\n{assessment['id']}\n\n"
        f"CODEBASE SUMMARY:\n{summary_text}\n\n"
        f"FILE MAP:\n{json.dumps(file_map, ensure_ascii=True)}\n\n"
        f"OPTIONAL KEY CODE EXCERPTS:\n{select_code_excerpts(files, batched_questions)}\n\n"
        "QUESTIONS AND ANSWERS:\n"
        f"{json.dumps(batched_questions, ensure_ascii=True)}\n\n"
        "Return ONLY this JSON:\n"
        '{"results":[{"question_id":"...","score":0,"feedback":"...","referenced_code":"..."}]}\n\n'
        "Rules:\n"
        "- score must be exactly one of: 0, 50, 100\n"
        "- feedback must be 2-3 sentences\n"
        "- if the candidate answer is generic and not grounded in the codebase, assign 0\n"
        "- referenced_code should be the named file/function/module or null\n"
    )

    retry_count = 0
    raw_response = ""
    parsed: dict[str, Any] | None = None
    try:
        raw_response, retry_count = await call_groq(prompt)
        parsed = parse_json_payload(raw_response)
        results = parsed.get("results")
        if not isinstance(results, list):
            raise ValueError("Groq response missing results list")
        result_map = {
            str(item.get("question_id")): item
            for item in results
            if isinstance(item, dict) and item.get("question_id")
        }
        if len(result_map) != len(answers):
            raise ValueError("Groq response count mismatch")

        total = 0.0
        parsed_results: list[dict[str, Any]] = []
        for answer in answers:
            result = result_map.get(answer["question_id"])
            score = int(result.get("score", 0))
            if score not in {0, 50, 100}:
                raise ValueError(f"Invalid score {score}")
            feedback = str(result.get("feedback") or "").strip()[:2000]
            referenced_code = result.get("referenced_code")
            await sqlite_db.execute(
                """
                UPDATE submission_answers
                SET llm_score = ?, llm_feedback = ?, graded_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (score, feedback, answer["id"]),
            )
            total += score
            parsed_results.append({
                "question_id": answer["question_id"],
                "parsed_score": score,
                "parsed_feedback": feedback,
                "referenced_code": referenced_code,
            })

        total_score = total / max(len(answers), 1)
        score_row = await sqlite_db.fetch_one(
            "SELECT id FROM assessment_scores WHERE submission_id = ?",
            (submission_id,),
        )
        if score_row:
            await sqlite_db.execute(
                """
                UPDATE assessment_scores
                SET total_score = ?, grading_flag = NULL, computed_at = CURRENT_TIMESTAMP
                WHERE submission_id = ?
                """,
                (total_score, submission_id),
            )
        else:
            await sqlite_db.execute(
                """
                INSERT INTO assessment_scores (id, submission_id, freelancer_id, assessment_id, total_score, percentile, grading_flag)
                VALUES (?, ?, ?, ?, ?, 0, NULL)
                """,
                (str(uuid.uuid4()), submission_id, submission["freelancer_id"], assessment["id"], total_score),
            )
        await recompute_percentiles(assessment["id"])
        await sqlite_db.execute(
            "UPDATE assessment_submissions SET status = 'graded' WHERE id = ?",
            (submission_id,),
        )
        await mongo_db.vm_llm_evaluations.insert_one({
            "submission_id": submission_id,
            "assessment_id": assessment["id"],
            "batched_prompt_sent": prompt,
            "llm_response_raw": raw_response,
            "parsed_results": parsed_results,
            "model_used": GROQ_MODEL,
            "evaluated_at": datetime.now(timezone.utc),
            "retry_count": retry_count,
        })
    except Exception as exc:
        logger.exception("Assessment grading failed for %s: %s", submission_id, exc)
        await sqlite_db.execute(
            """
            UPDATE submission_answers
            SET llm_score = COALESCE(llm_score, 0),
                llm_feedback = COALESCE(llm_feedback, 'Grading failed'),
                graded_at = CURRENT_TIMESTAMP
            WHERE submission_id = ?
            """,
            (submission_id,),
        )
        score_row = await sqlite_db.fetch_one(
            "SELECT id FROM assessment_scores WHERE submission_id = ?",
            (submission_id,),
        )
        if score_row:
            await sqlite_db.execute(
                """
                UPDATE assessment_scores
                SET total_score = 0, grading_flag = 'grading_failed', computed_at = CURRENT_TIMESTAMP
                WHERE submission_id = ?
                """,
                (submission_id,),
            )
        else:
            await sqlite_db.execute(
                """
                INSERT INTO assessment_scores (id, submission_id, freelancer_id, assessment_id, total_score, percentile, grading_flag)
                VALUES (?, ?, ?, ?, 0, 0, 'grading_failed')
                """,
                (str(uuid.uuid4()), submission_id, submission["freelancer_id"], assessment["id"]),
            )
        await recompute_percentiles(assessment["id"])
        await sqlite_db.execute(
            "UPDATE assessment_submissions SET status = 'grading_failed' WHERE id = ?",
            (submission_id,),
        )
        await mongo_db.vm_llm_evaluations.insert_one({
            "submission_id": submission_id,
            "assessment_id": assessment["id"],
            "batched_prompt_sent": prompt,
            "llm_response_raw": raw_response,
            "parsed_results": [],
            "model_used": GROQ_MODEL,
            "evaluated_at": datetime.now(timezone.utc),
            "retry_count": retry_count,
            "error": str(exc),
        })
