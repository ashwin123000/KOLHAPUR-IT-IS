"""Architect-X FastAPI backend — main application entry point.

Startup sequence (per spec §2 / §11):
1. Connect to MongoDB → print "Mongo Connected ✅"  (crash if fail)
2. Connect to Redis    → graceful degradation if unavailable
3. Register routers
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import settings
from database import connect_to_db, disconnect_from_db
from redis_client import connect_to_redis, disconnect_from_redis
from routes import auth, health, user

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle management."""
    logger.info("Architect-X backend starting …")

    # ── MongoDB (mandatory — crash on failure) ─────────────────────────────
    try:
        app.state.db = await connect_to_db()
        # "Mongo Connected ✅" is also printed inside connect_to_db()
        logger.info("MongoDB ready")
    except Exception as exc:
        logger.exception("MongoDB is required. Startup failed.")
        raise RuntimeError("MongoDB unavailable — cannot start application.") from exc

    # ── Redis (optional — graceful degradation) ────────────────────────────
    await connect_to_redis()

    logger.info("Architect-X backend startup complete ✅")
    yield

    # ── Shutdown ───────────────────────────────────────────────────────────
    await disconnect_from_redis()
    await disconnect_from_db()
    logger.info("Architect-X backend shutdown complete")


app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler — logs full exception, returns safe JSON."""
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": str(exc.detail)},
        )
    print("ERROR:", str(exc))
    import traceback

    traceback.print_exc()
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"success": False, "error": f"Internal Error: {str(exc)}"})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure HTTPException is always returned as JSON payload."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": str(exc.detail)},
    )


@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": str(getattr(exc, "detail", "HTTP error"))},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"success": False, "error": "Validation error"})


@app.get("/")
async def root():
    """Service metadata endpoint."""
    return {
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "status": "running",
        "health": "/health",
        "docs": "/docs",
    }


# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(user.router)
app.include_router(auth.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
