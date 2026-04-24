from .assessments import router as assessments_router
from .auth import router as auth_router
from .github_project_intelligence import router as github_project_intelligence_router
from .notifications import router as notifications_router
from .projects import router as projects_router
from .stats import router as stats_router
from .talent_intelligence import router as talent_intelligence_router
from .tests import router as tests_router
from .vm import router as vm_router

__all__ = [
    "assessments_router",
    "auth_router",
    "github_project_intelligence_router",
    "notifications_router",
    "projects_router",
    "stats_router",
    "talent_intelligence_router",
    "tests_router",
    "vm_router",
]
