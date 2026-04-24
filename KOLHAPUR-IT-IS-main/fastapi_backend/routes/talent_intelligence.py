import json
import uuid
from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from ..database import db, get_db
from ..services.seeker_intelligence import seeker_intelligence_service


router = APIRouter()

VALID_SHORT_SKILLS = {"c", "r", "go", "c++", "os", "git", "sql"}
GENERIC_SKILL_STOPWORDS = {
    "skills",
    "technical skills",
    "programming",
    "programming language",
    "programming languages",
    "languages",
    "engineer",
    "project",
    "presentation",
    "drawing",
    "mail",
    "purchasing",
    "security",
    "controller",
    "producer",
}


def _is_valid_skill(skill: Any) -> bool:
    if not isinstance(skill, dict):
        return False
    if skill.get("isFlagged", False):
        return False
    raw = str(skill.get("skillRaw") or skill.get("skillNormalized") or "").strip()
    if not raw:
        return False
    lowered = raw.lower()
    if ":" in raw:
        return False
    if len(raw) < 3 and lowered not in VALID_SHORT_SKILLS:
        return False
    if raw.isupper() and len(raw) <= 3 and lowered not in VALID_SHORT_SKILLS:
        return False
    if lowered in GENERIC_SKILL_STOPWORDS:
        return False
    if skill.get("normalizationMethod") == "no_match" and float(skill.get("normalizationConfidence", 0) or 0) < 50:
        return False
    return True


def _serialize(document: dict[str, Any] | None) -> dict[str, Any] | None:
    if document is None:
        return None
    serialized = {}
    for key, value in document.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, list):
            serialized[key] = [_serialize(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            serialized[key] = _serialize(value)
        else:
            serialized[key] = value
    return serialized


async def _get_seeker_by_user_id(user_id: str) -> dict[str, Any] | None:
    mongo_db = await get_db()
    seeker = await mongo_db.seekers.find_one({"userId": user_id})
    return _serialize(seeker)


async def _build_seeker_snapshot(user_id: str) -> dict[str, Any]:
    seeker = await _get_seeker_by_user_id(user_id)
    if not seeker:
        user = await (await get_db()).users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
        identity_name = user.get("full_name") if user else "Unknown Candidate"
        return {
            "name": identity_name,
            "skills": [],
            "personaArchetype": "Builder",
            "topDomains": [],
            "seniorityLevel": "Fresher",
            "profilePhotoUrl": "",
            "careerTrajectory": "Software Developer",
        }
    return {
        "name": seeker.get("identity", {}).get("name", ""),
        "skills": [skill.get("skillNormalized", "") for skill in seeker.get("skills", [])],
        "personaArchetype": seeker.get("aiProfile", {}).get("personaArchetype", ""),
        "topDomains": seeker.get("aiProfile", {}).get("topDomains", []),
        "seniorityLevel": seeker.get("aiProfile", {}).get("seniorityLevel", ""),
        "profilePhotoUrl": seeker.get("identity", {}).get("profilePhoto", ""),
        "careerTrajectory": seeker.get("aiProfile", {}).get("careerTrajectory", ""),
    }


@router.post("/auth/upload-resume")
async def upload_resume_intelligence(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    parsed = seeker_intelligence_service.parse_resume(file.filename or "resume.pdf", content)
    return {
        "success": True,
        "prefillData": parsed["prefillData"],
        "confidence": parsed["confidence"],
        "parsed": parsed["parsed"],
        "data": parsed["parsed"],
        "resume": {
            "filename": file.filename,
            "uploaded_at": datetime.utcnow().isoformat(),
        },
        "file_url": json.dumps({"filename": file.filename, "uploaded_at": datetime.utcnow().isoformat()}),
    }


@router.post("/seeker/profile/save")
async def save_seeker_profile(payload: dict[str, Any]):
    user_id = payload.get("userId")
    profile = payload.get("profileData")
    if not user_id or not isinstance(profile, dict):
        raise HTTPException(status_code=400, detail="userId and profileData are required")

    mongo_db = await get_db()
    now = datetime.utcnow().isoformat()
    existing = await mongo_db.seekers.find_one({"userId": user_id})
    profile["skills"] = profile.get("skills") if isinstance(profile.get("skills"), list) else []
    deduped_skills = []
    seen_skills = set()
    for skill in profile["skills"]:
        if not _is_valid_skill(skill):
            continue
        key = str(skill.get("skillNormalized") or skill.get("skillRaw") or "").strip().lower()
        if not key or key in seen_skills:
            continue
        seen_skills.add(key)
        deduped_skills.append(skill)
    profile["skills"] = deduped_skills
    profile["projects"] = profile.get("projects") if isinstance(profile.get("projects"), list) else []
    profile["experience"] = profile.get("experience") if isinstance(profile.get("experience"), list) else []
    profile["education"] = profile.get("education") if isinstance(profile.get("education"), list) else []
    profile["aiProfile"] = profile.get("aiProfile") if isinstance(profile.get("aiProfile"), dict) else {}
    profile["confidence"] = profile.get("confidence") if isinstance(profile.get("confidence"), dict) else {}
    profile.pop("matchCache", None)
    print("[SEEKER_SAVE] profileData:", profile)
    profile["userId"] = user_id
    profile["updatedAt"] = now
    profile["createdAt"] = existing.get("createdAt", now) if existing else now
    profile["registrationStatus"] = "complete" if profile.get("confidence", {}).get("overall", 0) >= 60 else "pending"

    await mongo_db.seekers.update_one({"userId": user_id}, {"$set": profile}, upsert=True)
    seeker = await mongo_db.seekers.find_one({"userId": user_id})
    await mongo_db.users.update_one(
        {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"email": user_id},
        {"$set": {"profileId": str(seeker["_id"]), "registration_complete": True}},
    )
    return {"success": True, "seeker": _serialize(seeker), "seekerId": str(seeker["_id"])}


@router.get("/seeker/profile/{user_id}")
async def get_seeker_profile(user_id: str):
    seeker = await _get_seeker_by_user_id(user_id)
    if not seeker:
        raise HTTPException(status_code=404, detail="Seeker profile not found")
    return {"success": True, "seeker": seeker}


@router.get("/seeker/{user_id}")
async def get_seeker_profile_alias(user_id: str):
    seeker = await _get_seeker_by_user_id(user_id)
    if not seeker:
        raise HTTPException(status_code=404, detail="Seeker profile not found")
    return {"success": True, "seeker": seeker}


@router.post("/apply/secure")
@router.post("/applications/apply")
async def apply_to_project(payload: dict[str, Any]):
    project_id = payload.get("projectId") or payload.get("jobPostId")
    freelancer_id = payload.get("freelancerId") or payload.get("seekerId")
    if not project_id or not freelancer_id:
        raise HTTPException(status_code=400, detail="projectId and freelancerId are required")

    existing = await db.fetch_one(
        "SELECT * FROM applications WHERE project_id = ? AND freelancer_id = ?",
        (project_id, freelancer_id),
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already applied")

    project = await db.fetch_one("SELECT * FROM projects WHERE id = ?", (project_id,))
    is_ai_job = False
    
    # Fallback to AI scraped jobs and manually posted AI jobs
    if not project:
        project = await db.fetch_one("SELECT * FROM jobs WHERE id = ?", (project_id,))
        if project:
            is_ai_job = True

    if not project:
        project_post = await db.fetch_one("SELECT * FROM job_posts WHERE id = ?", (project_id,))
        if project_post:
            # Reconstruct basic project structure from job_posts for the application pipeline
            basic_details_str = project_post.get("basic_details")
            try:
                basic_details = json.loads(basic_details_str) if basic_details_str else {}
            except json.JSONDecodeError:
                basic_details = {}
            project = {
                "id": project_post["id"],
                "client_id": project_post.get("posted_by"),
                "title": basic_details.get("title", "AI Job Post"),
                "skills_required": project_post.get("keywords", "[]")
            }
            is_ai_job = True

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    seeker = await _get_seeker_by_user_id(freelancer_id)
    seeker_for_match = seeker or {"skills": [], "aiProfile": {}, "education": []}
    match_data = seeker_intelligence_service.calculate_match_score(seeker_for_match, project)
    snapshot = await _build_seeker_snapshot(freelancer_id)

    application_id = str(uuid.uuid4())
    await db.execute(
        """
        INSERT INTO applications (id, project_id, freelancer_id, proposal, status, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (application_id, project_id, freelancer_id, payload.get("coverLetter") or payload.get("pitch") or "", "pending"),
    )

    mongo_db = await get_db()
    now = datetime.utcnow().isoformat()
    application_doc = {
        "applicationId": application_id,
        "jobPostId": project_id,
        "seekerId": freelancer_id,
        "clientId": project.get("client_id"),
        "appliedAt": now,
        "updatedAt": now,
        "matchData": match_data,
        "seekerSnapshot": snapshot,
        "status": "applied",
        "statusHistory": [{"status": "applied", "changedAt": now, "note": ""}],
        "seekerPitch": payload.get("coverLetter") or payload.get("pitch") or "",
        "clientNotes": "",
        "clientRating": None,
        "isWithdrawn": False,
        "projectTitle": project.get("title", ""),
        "projectSkills": json.loads(project.get("skills_required") or "[]"),
    }
    await mongo_db.applications.update_one({"applicationId": application_id}, {"$set": application_doc}, upsert=True)
    return {"success": True, "data": application_doc}


@router.get("/applications/{project_id}")
async def get_project_applications(project_id: str):
    rows = await db.fetch_all(
        "SELECT * FROM applications WHERE project_id = ? ORDER BY created_at DESC",
        (project_id,),
    )
    mongo_db = await get_db()
    results = []
    for row in rows:
        application_doc = await mongo_db.applications.find_one({"applicationId": row["id"]})
        application_doc = _serialize(application_doc) or {}
        results.append({
            "applicationId": row["id"],
            "projectId": row["project_id"],
            "freelancerId": row["freelancer_id"],
            "status": row["status"],
            "coverLetter": row["proposal"],
            "bidAmount": 0,
            "seekerSnapshot": application_doc.get("seekerSnapshot", {}),
            "matchData": application_doc.get("matchData", {}),
            "createdAt": row.get("created_at"),
        })
    return {"success": True, "data": results}


@router.get("/applications/freelancer/{freelancer_id}")
async def get_freelancer_applications(freelancer_id: str):
    rows = await db.fetch_all(
        "SELECT * FROM applications WHERE freelancer_id = ? ORDER BY created_at DESC",
        (freelancer_id,),
    )
    return {"success": True, "data": rows}


@router.post("/hire/secure")
async def hire_freelancer(payload: dict[str, Any]):
    application_id = payload.get("applicationId")
    project_id = payload.get("projectId")
    freelancer_id = payload.get("freelancerId")
    if not application_id or not project_id or not freelancer_id:
        raise HTTPException(status_code=400, detail="applicationId, projectId, and freelancerId are required")

    await db.execute("UPDATE applications SET status = 'accepted' WHERE id = ?", (application_id,))
    await db.execute("UPDATE projects SET status = 'in_progress' WHERE id = ?", (project_id,))
    mongo_db = await get_db()
    now = datetime.utcnow().isoformat()
    await mongo_db.applications.update_one(
        {"applicationId": application_id},
        {
            "$set": {"status": "shortlisted", "updatedAt": now},
            "$push": {"statusHistory": {"status": "shortlisted", "changedAt": now, "note": "Client hired candidate"}},
        },
    )
    return {"success": True, "data": {"applicationId": application_id, "projectId": project_id, "freelancerId": freelancer_id}}


@router.post("/ratings/secure")
async def rate_freelancer(payload: dict[str, Any]):
    project_id = payload.get("projectId")
    if not project_id:
        raise HTTPException(status_code=400, detail="projectId is required")
    await db.execute("UPDATE projects SET status = 'verified' WHERE id = ?", (project_id,))
    return {"success": True, "data": {"projectId": project_id, "status": "verified"}}


@router.get("/payments/{user_id}")
async def get_payments(user_id: str):
    return {"success": True, "data": []}


@router.post("/payments/release")
async def release_payment(payload: dict[str, Any]):
    return {"success": True, "data": payload}


@router.get("/client/dashboard/summary")
async def client_dashboard_summary(client_id: str = Query(..., alias="clientId")):
    jobs = await db.fetch_all("SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC", (client_id,))
    total_spent = sum(float(job.get("budget") or 0) for job in jobs)
    application_rows = []
    for job in jobs:
        application_rows.extend(await db.fetch_all("SELECT * FROM applications WHERE project_id = ?", (job["id"],)))
    return {
        "success": True,
        "data": {
            "totalProjects": len(jobs),
            "openProjects": len([job for job in jobs if job.get("status") == "open"]),
            "activeProjects": len([job for job in jobs if job.get("status") == "in_progress"]),
            "completedProjects": len([job for job in jobs if job.get("status") in {"completed", "verified"}]),
            "pendingApplications": len([app for app in application_rows if app.get("status") == "pending"]),
            "totalSpent": total_spent,
        },
    }


@router.get("/client/dashboard/jobs")
async def client_dashboard_jobs(client_id: str = Query(..., alias="clientId")):
    jobs = await db.fetch_all("SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC", (client_id,))
    mongo_db = await get_db()
    results = []
    for job in jobs:
        applications = await mongo_db.applications.find({"jobPostId": job["id"]}).sort("matchData.totalScore", -1).to_list(length=3)
        test = await mongo_db.tests.find_one({"jobId": job["id"]})
        assessment_submission_count = 0
        pending_assessment_reviews = 0
        if test:
            assessment_submission_count = await mongo_db.submissions.count_documents({"jobId": job["id"]})
            pending_assessment_reviews = assessment_submission_count
        results.append({
            "_id": job["id"],
            "basicDetails": {"projectTitle": job.get("title", ""), "budget": job.get("budget", 0)},
            "compiledDashboard": {"roleHeader": {"domain": "AI-screened project"}},
            "status": job.get("status", "open"),
            "applicationCount": await mongo_db.applications.count_documents({"jobPostId": job["id"]}),
            "viewCount": 0,
            "shortlistedCount": await mongo_db.applications.count_documents({"jobPostId": job["id"], "status": {"$in": ["shortlisted", "interview", "hired"]}}),
            "createdAt": job.get("created_at"),
            "topCandidates": [_serialize(app) for app in applications],
            "assessment": {
                "configured": test is not None,
                "testId": str(test["_id"]) if test else None,
                "isActive": bool((test or {}).get("isActive", False)),
                "submissionCount": assessment_submission_count,
                "pendingReviewCount": pending_assessment_reviews,
            },
        })
    return {"success": True, "jobs": results}


@router.get("/client/dashboard/jobs/{job_id}/applications")
async def client_job_applications(job_id: str, status: str | None = None, sortBy: str = "matchScore", page: int = 1, limit: int = 20):
    mongo_db = await get_db()
    query: dict[str, Any] = {"jobPostId": job_id}
    if status:
        query["status"] = status
    cursor = mongo_db.applications.find(query)
    if sortBy == "recent":
        cursor = cursor.sort("appliedAt", -1)
    elif sortBy == "oldest":
        cursor = cursor.sort("appliedAt", 1)
    else:
        cursor = cursor.sort("matchData.totalScore", -1)
    total = await mongo_db.applications.count_documents(query)
    applications = await cursor.skip((page - 1) * limit).limit(limit).to_list(length=limit)
    stats = await mongo_db.applications.aggregate([
        {"$match": {"jobPostId": job_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "avgScore": {"$avg": "$matchData.totalScore"}}},
    ]).to_list(length=20)
    project = await db.fetch_one("SELECT * FROM projects WHERE id = ?", (job_id,))
    return {
        "job": {"id": job_id, "title": project.get("title", "") if project else "", "roleHeader": {"domain": "AI-screened project"}},
        "applications": [_serialize(app) for app in applications],
        "pagination": {"total": total, "page": page, "limit": limit, "pages": max(1, (total + limit - 1) // limit)},
        "stats": [_serialize(item) for item in stats],
    }


@router.get("/client/dashboard/seeker/{seeker_id}")
async def client_view_seeker(seeker_id: str, jobId: str | None = None):
    mongo_db = await get_db()
    seeker = await mongo_db.seekers.find_one({"userId": seeker_id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Seeker not found")
    match_data = None
    if jobId:
        match_data = await mongo_db.applications.find_one({"jobPostId": jobId, "seekerId": seeker_id})
    return {"seeker": _serialize(seeker), "matchData": _serialize(match_data)}


@router.patch("/client/dashboard/applications/{application_id}/status")
async def update_application_status(application_id: str, payload: dict[str, Any]):
    status_value = payload.get("status")
    if status_value not in {"viewed", "shortlisted", "interview", "rejected", "hired"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    mongo_db = await get_db()
    now = datetime.utcnow().isoformat()
    await mongo_db.applications.update_one(
        {"applicationId": application_id},
        {
            "$set": {"status": status_value, "updatedAt": now, "clientNotes": payload.get("note", ""), "clientRating": payload.get("rating")},
            "$push": {"statusHistory": {"status": status_value, "changedAt": now, "note": payload.get("note", "")}},
        },
    )
    return {"success": True}
