from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from ..services.github_project_intelligence import analyze_github_project_payload


router = APIRouter()


@router.post("/github-project")
async def analyze_github_project(payload: dict[str, Any]):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="JSON object payload is required")

    candidate_repos = payload.get("candidate_repos")
    if candidate_repos:
        if not isinstance(candidate_repos, list) or len(candidate_repos) < 2:
            raise HTTPException(status_code=400, detail="candidate_repos must contain at least 2 repo payloads for candidate mode")
        return analyze_github_project_payload(payload)

    required = ["github_url", "repo_name", "languages", "commit_count", "commit_timestamps", "file_tree", "jd_required_skills", "jd_preferred_skills", "jd_role_category"]
    missing = [field for field in required if field not in payload]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    return analyze_github_project_payload(payload)
