"""
AI Hiring OS — FastAPI Backend
Master Prompt V2.0 - Main Application Entry Point

Start with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import settings
from database_new import init_db, close_db
from routes.auth_new import router as auth_router
from routes.resumes import router as resumes_router
from routes.jobs import router as jobs_router
from routes.applications import router as applications_router
from routes.chat import router as chat_router
from routes.vm import router as vm_router

# ============================================================
# LOGGING SETUP
# ============================================================

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)


# ============================================================
# FASTAPI LIFESPAN EVENTS
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle management.
    """
    logger.info("=" * 60)
    logger.info("🚀 AI HIRING OS — Starting up (Master Prompt V2.0)")
    logger.info("=" * 60)
    
    # Startup
    try:
        logger.info(f"Environment: {settings.ENVIRONMENT}")
        logger.info(f"Database: {settings.DATABASE_URL.split('@')[0]}...")
        logger.info("Initializing PostgreSQL database...")
        await init_db()
        logger.info("✅ Database initialized")
        
        # Initialize APScheduler for background jobs
        scheduler = AsyncIOScheduler()
        scheduler.start()
        logger.info("✅ Background job scheduler started")
        
        # Pass scheduler to resumes router
        from routes import resumes
        resumes.set_scheduler(scheduler)
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down...")
    try:
        # Shutdown scheduler
        scheduler.shutdown()
        logger.info("✅ Background job scheduler shutdown")
    except Exception as e:
        logger.warning(f"Scheduler shutdown warning: {e}")
    
    try:
        await close_db()
    except Exception as e:
        logger.warning(f"Shutdown warning: {e}")
    logger.info("✅ Graceful shutdown complete")


# ============================================================
# CREATE FASTAPI APP
# ============================================================

app = FastAPI(
    title="AI Hiring OS",
    description="Master Prompt V2.0 — Production-Grade Job-Resume Matching Platform",
    version="2.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ============================================================
# CORS MIDDLEWARE
# ============================================================

cors_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS origins: {cors_origins}")


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_" + str(exc.status_code),
                "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                "detail": exc.detail if isinstance(exc.detail, dict) else None,
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Generic exception handler (500 errors)."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred",
                "detail": str(exc) if settings.DEBUG else None,
            }
        },
    )


# ============================================================
# HEALTH CHECK ENDPOINT
# ============================================================

@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "AI Hiring OS",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
    }


# ============================================================
# REGISTER ROUTERS
# ============================================================

app.include_router(auth_router, prefix="/api/v1")
logger.info("✅ Auth router registered: /api/v1/auth/*")

app.include_router(resumes_router, prefix="/api/v1")
logger.info("✅ Resumes router registered: /api/v1/resumes/*")

app.include_router(jobs_router, prefix="/api/v1")
logger.info("✅ Jobs router registered: /api/v1/jobs/*")

app.include_router(applications_router, prefix="/api/v1")
logger.info("✅ Applications router registered: /api/v1/applications/*")

app.include_router(chat_router, prefix="/api/v1")
logger.info("✅ Chat router registered: /api/v1/chat/*")

app.include_router(vm_router, prefix="/api/v1")
logger.info("✅ VM router registered: /api/v1/vm/*")


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/", tags=["root"])
async def root():
    """Root endpoint — API documentation."""
    return {
        "message": "Welcome to AI Hiring OS v2.0 (Master Prompt V2.0)",
        "docs": "/api/docs",
        "health": "/health",
        "api_version": "v1",
        "endpoints": {
            "auth": [
                "POST /api/v1/auth/register",
                "POST /api/v1/auth/login",
                "POST /api/v1/auth/refresh",
                "POST /api/v1/auth/logout",
                "GET /api/v1/auth/me",
            ],
            "resumes": [
                "POST /api/v1/resumes/upload",
                "GET /api/v1/resumes/{resume_id}/status",
                "GET /api/v1/resumes/{resume_id}",
                "GET /api/v1/resumes/list",
            ],
            "jobs": [
                "POST /api/v1/jobs",
                "GET /api/v1/jobs",
                "GET /api/v1/jobs/{job_id}",
                "PUT /api/v1/jobs/{job_id}",
                "DELETE /api/v1/jobs/{job_id}",
            ],
            "applications": [
                "POST /api/v1/applications",
                "GET /api/v1/applications/{app_id}",
                "GET /api/v1/applications/my-applications",
                "DELETE /api/v1/applications/{app_id}",
            ],
            "chat": [
                "POST /api/v1/chat/message",
                "GET /api/v1/chat/history/{session_id}",
                "GET /api/v1/chat/sessions",
            ],
            "vm": [
                "POST /api/v1/vm/sessions/start",
                "POST /api/v1/vm/{session_id}/submit",
                "GET /api/v1/vm/{session_id}/events",
                "GET /api/v1/vm/{session_id}/score",
            ],
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
