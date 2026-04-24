import json
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..database import db


router = APIRouter()


def _parse_skills(value: Any) -> list[str]:
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value:
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


def _normalize_project(row: dict[str, Any]) -> dict[str, Any]:
    project = dict(row)
    project["skills_required"] = _parse_skills(project.get("skills_required"))
    return project


@router.get("")
async def get_projects():
    rows = await db.fetch_all("SELECT * FROM projects WHERE status = 'open' ORDER BY rowid DESC")
    return {"success": True, "data": [_normalize_project(row) for row in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(payload: dict[str, Any]):
    project_id = str(uuid.uuid4())
    await db.execute(
        """
        INSERT INTO projects (id, client_id, title, description, budget, skills_required, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            project_id,
            payload.get("client_id") or payload.get("clientId") or "",
            payload.get("title") or payload.get("name") or "Untitled project",
            payload.get("description", ""),
            float(payload.get("budget", 0) or 0),
            json.dumps(payload.get("skills_required") or payload.get("skillsRequired") or []),
            payload.get("status", "open"),
        ),
    )
    project = await db.fetch_one("SELECT * FROM projects WHERE id = ?", (project_id,))
    return {"success": True, "data": _normalize_project(project or {})}


@router.get("/freelancer/{user_id}")
async def get_freelancer_projects(user_id: str):
    rows = await db.fetch_all(
        """
        SELECT p.*
        FROM projects p
        LEFT JOIN applications a ON a.project_id = p.id
        WHERE p.status = 'open' OR a.freelancer_id = ?
        ORDER BY p.rowid DESC
        """,
        (user_id,),
    )
    return {"success": True, "data": [_normalize_project(row) for row in rows]}


@router.get("/client/{user_id}")
async def get_client_projects(user_id: str):
    rows = await db.fetch_all(
        "SELECT * FROM projects WHERE client_id = ? ORDER BY rowid DESC",
        (user_id,),
    )
    return {"success": True, "data": [_normalize_project(row) for row in rows]}


@router.post("/submit")
async def submit_work(payload: dict[str, Any]):
    project_id = payload.get("projectId")
    if not project_id:
        raise HTTPException(status_code=400, detail="projectId is required")

    updated = await db.execute(
        "UPDATE projects SET status = 'completed' WHERE id = ?",
        (project_id,),
    )
    if updated == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True, "data": {"projectId": project_id, "status": "completed"}}


@router.post("/{project_id}/verify")
async def verify_project(project_id: str, payload: dict[str, Any]):
    status_value = "verified" if payload.get("verify", True) else "rejected"
    updated = await db.execute(
        "UPDATE projects SET status = ? WHERE id = ?",
        (status_value, project_id),
    )
    if updated == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True, "data": {"projectId": project_id, "status": status_value}}
