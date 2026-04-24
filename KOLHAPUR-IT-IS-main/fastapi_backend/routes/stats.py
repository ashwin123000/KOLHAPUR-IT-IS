from fastapi import APIRouter

from ..database import db


router = APIRouter()


@router.get("/{user_id}/freelancer")
async def get_freelancer_stats(user_id: str):
    assigned_projects = await db.fetch_all(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS active
        FROM applications
        WHERE freelancer_id = ?
        """,
        (user_id,),
    )
    application_total = await db.fetch_one(
        "SELECT COUNT(*) AS total FROM applications WHERE freelancer_id = ?",
        (user_id,),
    )
    row = assigned_projects[0] if assigned_projects else {"total": 0, "completed": 0, "active": 0}
    return {
        "success": True,
        "data": {
            "totalProjects": row.get("total", 0) or 0,
            "projects_completed": row.get("completed", 0) or 0,
            "completedProjects": row.get("completed", 0) or 0,
            "active_projects": row.get("active", 0) or 0,
            "activeProjects": row.get("active", 0) or 0,
            "applicationsSubmitted": (application_total or {}).get("total", 0) or 0,
            "earnings": 0,
            "totalEarnings": 0,
            "rating": 0,
            "averageRating": 0,
            "score": 0,
        },
    }


@router.get("/{user_id}/client")
async def get_client_stats(user_id: str):
    row = await db.fetch_one(
        """
        SELECT COUNT(*) AS total_projects,
               SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_projects,
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS active_projects,
               SUM(CASE WHEN status IN ('completed', 'verified') THEN 1 ELSE 0 END) AS completed_projects,
               COALESCE(SUM(budget), 0) AS total_spent
        FROM projects
        WHERE client_id = ?
        """,
        (user_id,),
    ) or {}
    return {
        "success": True,
        "data": {
            "projects": row.get("total_projects", 0) or 0,
            "projects_posted": row.get("total_projects", 0) or 0,
            "totalProjects": row.get("total_projects", 0) or 0,
            "openProjects": row.get("open_projects", 0) or 0,
            "active_projects": row.get("active_projects", 0) or 0,
            "activeProjects": row.get("active_projects", 0) or 0,
            "completedProjects": row.get("completed_projects", 0) or 0,
            "total_spent": row.get("total_spent", 0) or 0,
            "totalSpent": row.get("total_spent", 0) or 0,
            "pendingApplications": 0,
            "waitlist": [],
        },
    }
