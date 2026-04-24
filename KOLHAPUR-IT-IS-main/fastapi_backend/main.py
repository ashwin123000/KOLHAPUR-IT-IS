import asyncio
import hashlib
import json
import logging
import os
import re
import secrets
import time
import uuid
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import aiosqlite
from bson import ObjectId
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from redis.asyncio import Redis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from .database import (
    DATABASE_PATH,
    SCHEMA_VERSION,
    close_mongo,
    db,
    dumps,
    get_db,
    init_db,
    init_mongo,
    loads,
)
from .mongodb_realtime import mongo_runtime, serialize_mongo
from .routes import assessments_router, auth_router, notifications_router, projects_router, stats_router, talent_intelligence_router, tests_router, vm_router
from .routes.auth import get_current_user
from .services.scheduler import shutdown_scheduler, start_scheduler
from .services.seeker_intelligence import seeker_intelligence_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DOWNLOADS_ROOT = os.environ.get("DOWNLOADS_ROOT", os.path.join(os.path.dirname(__file__), "..", "downloads_data"))
OTP_EXPIRY_MINUTES = int(os.environ.get("OTP_EXPIRY_MINUTES", "10"))
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


class WebSocketManager:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        encoded = json.dumps(message, default=str)
        for websocket in list(self.active):
            try:
                await websocket.send_text(encoded)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)


websocket_manager = WebSocketManager()


async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info("%s %s -> %s (%.2fs)", request.method, request.url.path, response.status_code, process_time)
    return response


async def validate_sqlite_schema() -> None:
    required_schema = {
        "projects": {"id", "client_id", "title", "budget", "status", "created_at"},
        "applications": {"id", "project_id", "freelancer_id", "status", "created_at"},
        "assessments": {"id", "job_id", "created_by", "title", "status", "created_at"},
    }
    async with aiosqlite.connect(DATABASE_PATH) as conn:
        for table_name, required_columns in required_schema.items():
            cursor = await conn.execute(f"PRAGMA table_info({table_name})")
            rows = await cursor.fetchall()
            if not rows:
                raise RuntimeError(f"STARTUP FAILURE: table '{table_name}' is missing from SQLite database")
            actual_columns = {row[1] for row in rows}
            missing = required_columns - actual_columns
            if missing:
                raise RuntimeError(
                    f"STARTUP FAILURE: table '{table_name}' is missing columns: {sorted(missing)}"
                )


app = FastAPI(title="Architect-X Raw Connection API", version="2.0.0")
allowed_origins = {
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    allowed_origins.add(frontend_url)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)
app.add_middleware(BaseHTTPMiddleware, dispatch=log_requests)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])
app.include_router(projects_router, prefix="/api/v1/projects", tags=["projects-compat"])
app.include_router(stats_router, prefix="/api/stats", tags=["stats"])
app.include_router(talent_intelligence_router, prefix="/api", tags=["talent-intelligence"])
app.include_router(tests_router, prefix="/api", tags=["assessments"])
app.include_router(assessments_router, prefix="/api/v1/assessments", tags=["vm-assessments"])
app.include_router(vm_router, prefix="/api/v1/vm", tags=["vm"])


@app.on_event("startup")
async def startup() -> None:
    os.makedirs(DOWNLOADS_ROOT, exist_ok=True)
    await init_db()
    await validate_sqlite_schema()
    app.state.mongo_db = await init_mongo()
    app.state.redis_enabled = False
    app.state.redis_client = None
    try:
        redis_client = Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        await redis_client.ping()
        app.state.redis_client = redis_client
        app.state.redis_enabled = True
        logger.info("Redis connected")
    except Exception:
        app.state.redis_enabled = False
        app.state.redis_client = None
        logger.exception("Redis unavailable, continuing in degraded mode")
    await mongo_runtime.connect()
    mongo_runtime.start_watchers(websocket_manager.broadcast)
    start_scheduler()
    logger.info("Startup complete")


@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "ok",
        "cors": "enabled",
        "database_path": DATABASE_PATH,
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content=b"", media_type="image/x-icon")


@app.on_event("shutdown")
async def shutdown() -> None:
    redis_client = getattr(app.state, "redis_client", None)
    if redis_client is not None:
        await redis_client.aclose()
    shutdown_scheduler()
    await mongo_runtime.close()
    await close_mongo()


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Starlette may route HTTPException through the generic Exception handler
    # depending on handler registration order. Ensure HTTPException keeps its status code.
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": str(exc.detail)},
        )
    print("ERROR:", str(exc))
    import traceback

    traceback.print_exc()
    logger.exception("Unhandled server error for %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"success": False, "error": f"Internal Error: {str(exc)}"})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
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
    details = exc.errors()
    message = "; ".join(
        error.get("msg", "Validation error")
        for error in details
        if isinstance(error, dict)
    ) or "Validation error"
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": message,
            "detail": details,
        },
    )


def aadhaar_lookup(aadhaar: str) -> str:
    digits = "".join(ch for ch in aadhaar if ch.isdigit())
    if len(digits) != 12:
        raise HTTPException(status_code=400, detail="Aadhaar must contain exactly 12 digits")
    return hashlib.sha256(digits.encode("utf-8")).hexdigest()


def aadhaar_secure_hash(aadhaar: str, salt: str) -> str:
    digits = "".join(ch for ch in aadhaar if ch.isdigit())
    if len(digits) != 12:
        raise HTTPException(status_code=400, detail="Aadhaar must contain exactly 12 digits")
    return hashlib.sha256(f"{salt}:{digits}".encode("utf-8")).hexdigest()


def build_aadhaar_payload(aadhaar: str) -> dict[str, str]:
    digits = "".join(ch for ch in aadhaar if ch.isdigit())
    salt = secrets.token_hex(16)
    return {
        "lookup_hash": aadhaar_lookup(digits),
        "secure_hash": aadhaar_secure_hash(digits, salt),
        "salt": salt,
        "last_four": digits[-4:],
    }


def extract_pdf(content: bytes) -> str:
    try:
        import io
        import pdfplumber
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ""


def extract_image(content: bytes) -> str:
    try:
        from PIL import Image
        import io
        # Placeholder for actual OCR logic
        img = Image.open(io.BytesIO(content))
        return f"Image detected: {img.format}, {img.size}"
    except Exception as e:
        logger.error(f"Image extraction failed: {e}")
        return ""


def extract_resume_text(file_name: str, content: bytes) -> str:
    if file_name.lower().endswith(".pdf"):
        return extract_pdf(content)
    elif file_name.lower().endswith((".jpg", ".png", ".jpeg")):
        return extract_image(content)
    else:
        try:
            return content.decode("utf-8", errors="ignore")
        except Exception:
            return ""


def parse_resume(text: str) -> dict[str, Any]:
    # Placeholder for actual parsing logic (e.g., using an LLM or regex)
    return {
        "full_name": "",
        "email": "",
        "college": "",
        "city": "",
        "state": "",
        "skills": [],
        "projects": [],
        "experience": [],
        "education": [],
        "confidence": 0,
        "status": "parsed",
    }


def hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest() == password_hash


def ensure_schema_version(document: dict[str, Any], collection_name: str = "users") -> None:
    version = document.get("schema_version")
    if version != SCHEMA_VERSION:
        raise HTTPException(
            status_code=409,
            detail=f"[{collection_name}] schema_version mismatch: expected {SCHEMA_VERSION}, got {version}",
        )


def verified_match(match_score: float, trust_score: float) -> float:
    trust = max(0.0, min(float(trust_score), 1.0))
    match = max(0.0, min(float(match_score), 100.0))
    return round(match * (0.7 + 0.3 * trust), 2)


def normalize_job(row: dict[str, Any]) -> dict[str, Any]:
    row["id"] = str(row.get("id"))
    row["skills"] = loads(row.get("skills"), [])
    row["jd"] = loads(row.get("jd"), [])
    row["jr"] = loads(row.get("jr"), [])
    row["stipendLabel"] = f"Rs {int(row.get('stipend') or 0):,}/month"
    row["type"] = row.get("job_type")
    row["postedAgo"] = "Live from database"
    row["applicants"] = "0 applicants"
    row["companyLogo"] = "".join(part[0] for part in (row.get("company") or "AX").split()[:2]).upper()
    row["companyColor"] = "#16a34a"
    row["highlights"] = [
        f"Verified match {row.get('verified_match', 0)}%",
        f"Trust score {round(float(row.get('trust_score') or 0) * 100)}%",
    ]
    return row


def normalize_user(row: dict[str, Any]) -> dict[str, Any]:
    row = dict(row)
    row.pop("password", None)
    row.pop("aadhaar_audit_hash", None)
    row["skills"] = loads(row.get("skills"), [])
    row["resume"] = loads(row.get("resume_metadata"), None)
    row["history"] = loads(row.get("history"), [])
    return row


def normalize_mongo_user(document: dict[str, Any]) -> dict[str, Any]:
    user = dict(document)
    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)
    user.pop("aadhaar_lookup", None)
    user.pop("aadhaar_secure_hash", None)
    user.pop("aadhaar_salt", None)
    return serialize_mongo(user)


def build_login_response(user: dict[str, Any]) -> dict[str, Any]:
    role = user.get("user_type", "freelancer")
    user_id = str(user["_id"])
    token = f"session:{role}:{user_id}:{secrets.token_hex(8)}"
    return {
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "userId": user_id,
        "id": user_id,
        "email": user["email"],
        "role": role,
        "full_name": user.get("full_name") or user.get("username") or user["email"].split("@")[0],
    }


async def persist_event(event_type: str, payload: dict[str, Any], user_id: str | None = None) -> dict[str, Any]:
    event = {
        "id": str(uuid.uuid4()),
        "type": event_type,
        "data": payload,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await db.execute(
        "INSERT INTO realtime_events (id, user_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?, ?)",
        (event["id"], user_id, event_type, dumps(payload), event["timestamp"]),
    )
    return event


async def publish_event(event_type: str, payload: dict[str, Any], user_id: str | None = None) -> None:
    event = await persist_event(event_type, payload, user_id)
    await websocket_manager.broadcast(event)


async def sync_missed_events(user_id: str | None, last_timestamp: str | None) -> list[dict[str, Any]]:
    if not last_timestamp:
        last_timestamp = "1970-01-01T00:00:00"
    if user_id:
        rows = await db.fetch_all(
            """
            SELECT * FROM realtime_events
            WHERE timestamp > ? AND (user_id IS NULL OR user_id = ?)
            ORDER BY timestamp ASC
            """,
            (last_timestamp, user_id),
        )
    else:
        rows = await db.fetch_all(
            "SELECT * FROM realtime_events WHERE timestamp > ? ORDER BY timestamp ASC",
            (last_timestamp,),
        )
    return [
        {
            "id": row["id"],
            "type": row["event_type"],
            "data": loads(row.get("payload"), {}),
            "user_id": row.get("user_id"),
            "timestamp": row["timestamp"],
        }
        for row in rows
    ]


async def next_job_id() -> str | int:
    columns = await db.fetch_all("PRAGMA table_info(jobs)")
    id_column = next((column for column in columns if column["name"] == "id"), {})
    if str(id_column.get("type", "")).upper() == "INTEGER":
        row = await db.fetch_one("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM jobs")
        return int(row["next_id"])
    return str(uuid.uuid4())


class RegisterPayload(BaseModel):
    email: str
    password: str
    full_name: str = ""
    username: str | None = None
    aadhaar: str | None = None
    city: str = ""
    state: str = ""
    college: str = ""
    skills: list[str] = Field(default_factory=list)
    resume_file_url: str = ""


class ChatPayload(BaseModel):
    message: str
    path: str = "/"
    history: list[dict[str, Any]] = Field(default_factory=list)
    user_id: str = ""
    context: dict[str, Any] = Field(default_factory=dict)


class MatchCalculatePayload(BaseModel):
    seekerId: str | None = None
    jobId: str


class LoginPayload(BaseModel):
    email: str
    password: str


class EmailRequest(BaseModel):
    email: str


class OtpVerifyPayload(BaseModel):
    email: str
    otp: str


class JobPayload(BaseModel):
    title: str
    company: str = "Architect-X Client"
    description: str
    location: str = "Remote"
    work_mode: str = "Remote"
    job_type: str = "Full-time"
    duration: str = "Ongoing"
    stipend: int = 0
    category: str = "Artificial Intelligence"
    skills: list[str] = Field(default_factory=list)
    jd: list[str] = Field(default_factory=list)
    jr: list[str] = Field(default_factory=list)
    trust_score: float = 0
    match_score: float = 0
    github_url: str | None = None
    client_id: str | None = None


class CandidateIngestionPayload(BaseModel):
    id: str | None = None
    email: str | None = None
    full_name: str | None = None
    github_url: str | None = None
    github_score: float = 0
    trust_score: float = 0
    skills: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)


class HybridSearchPayload(BaseModel):
    query_vector: list[float]
    salary_expected: int | None = None
    notice_period_days: int | None = None
    locations: list[str] = Field(default_factory=list)
    limit: int = 10


TITLE_SUGGESTIONS = [
    ("Python Developer", "Backend"),
    ("Python ML Engineer", "Data Science"),
    ("Machine Learning Engineer", "Machine Learning"),
    ("Data Scientist", "Data Science"),
    ("Frontend React Developer", "Frontend"),
    ("Full Stack Engineer", "Full Stack"),
    ("DevOps Engineer", "DevOps"),
    ("Product Designer", "Design"),
    ("MLOps Engineer", "Machine Learning"),
    ("AI Product Manager", "Product"),
]

SKILL_LIBRARY = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI", "MongoDB",
    "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS", "GCP", "Azure", "PyTorch",
    "TensorFlow", "Pandas", "NumPy", "Machine Learning", "Data Science", "SQL",
    "LangChain", "LangGraph", "OpenAI API", "REST APIs", "Git", "Figma",
]

RESOURCE_LINKS = {
    "python": "https://www.python.org/",
    "react": "https://react.dev/",
    "postgresql": "https://www.postgresql.org/docs/",
    "mongodb": "https://www.mongodb.com/docs/",
    "fastapi": "https://fastapi.tiangolo.com/",
    "docker": "https://docs.docker.com/",
    "pytorch": "https://pytorch.org/",
    "tensorflow": "https://www.tensorflow.org/",
    "sql": "https://www.postgresql.org/docs/current/sql.html",
}


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", (value or "").strip().lower()).strip("-")
    return cleaned or f"job-{uuid.uuid4().hex[:8]}"


def normalize_text_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [part.strip() for part in re.split(r"[\n,;]+", value) if part.strip()]
    return []


def coerce_raw_jd(raw_jd: Any, source_method: str = "manual_typed") -> dict[str, Any]:
    if isinstance(raw_jd, str):
        text = raw_jd
        payload = {}
    elif isinstance(raw_jd, dict):
        text = str(raw_jd.get("text", ""))
        payload = dict(raw_jd)
    else:
        text = ""
        payload = {}
    normalized = text.strip()
    return {
        "text": normalized,
        "metadata": payload.get("metadata", {}),
        "sourceMethod": payload.get("sourceMethod", source_method),
        "pdfUrl": payload.get("pdfUrl"),
        "characterCount": len(normalized),
        "extractedAt": datetime.utcnow().isoformat(),
    }


def extract_skills_from_text(text: str, limit: int = 10) -> list[str]:
    haystack = (text or "").lower()
    found = [skill for skill in SKILL_LIBRARY if skill.lower() in haystack]
    if not found:
        tokens = re.findall(r"[A-Za-z][A-Za-z+#.]{2,}", text or "")
        deduped: list[str] = []
        for token in tokens:
            candidate = token.strip()
            if candidate.lower() not in {item.lower() for item in deduped}:
                deduped.append(candidate)
            if len(deduped) >= limit:
                break
        return deduped
    return found[:limit]


def extract_tools_from_text(text: str, limit: int = 8) -> list[str]:
    tools = [skill for skill in extract_skills_from_text(text, limit=limit) if skill in {
        "React", "Node.js", "FastAPI", "MongoDB", "PostgreSQL", "Redis", "Docker",
        "Kubernetes", "AWS", "GCP", "Azure", "PyTorch", "TensorFlow", "LangChain",
        "LangGraph", "OpenAI API", "Git", "Figma",
    }]
    return tools[:limit]


def sanitize_jd_text(raw_jd: str) -> str:
    return re.sub(r"<[^>]*>", "", raw_jd or "").strip()


def extract_json_object(raw_text: str) -> dict[str, Any]:
    match = re.search(r"\{[\s\S]*\}", raw_text or "")
    if not match:
        raise ValueError("No valid JSON object found in AI response.")
    return json.loads(match.group(0))


def metric_is_measurable(metric: str) -> bool:
    return bool(re.search(r"[%<>\d]", metric or "")) or bool(re.search(r"\b(yes|no|binary|shipped|deployed|complete)\b", metric or "", re.I))


def _find_experience_years(text: str) -> int | None:
    match = re.search(r"(\d+)\s*\+?\s*(?:years?|yrs?)", text.lower())
    return int(match.group(1)) if match else None


def _find_education_level(text: str) -> str:
    corpus = text.lower()
    if "phd" in corpus or "doctorate" in corpus:
        return "phd"
    if "master" in corpus:
        return "master"
    if "bachelor" in corpus or "graduate" in corpus:
        return "bachelor"
    if "high school" in corpus:
        return "highschool"
    return "not_specified"


def analyze_jd_locally(sanitized: str) -> dict[str, Any]:
    title_match = re.search(r"(?im)^(?:job title|role|position)\s*[:\-]\s*(.+)$", sanitized)
    title = title_match.group(1).strip() if title_match else None
    domain = infer_domain(title or "", sanitized)
    seniority = infer_seniority("", sanitized)
    skills = extract_skills_from_text(sanitized, limit=8)
    tools = extract_tools_from_text(sanitized, limit=6)
    experience_years = _find_experience_years(sanitized)
    education_level = _find_education_level(sanitized)
    education_required = education_level not in {"none", "not_specified"}
    remote_only = bool(re.search(r"\bremote\b", sanitized, re.I)) and not bool(re.search(r"\bonsite\b", sanitized, re.I))
    collaboration = "team" if re.search(r"\bteam\b", sanitized, re.I) else "individual"
    pace = "fast_iterate" if re.search(r"\bfast|iterate|startup\b", sanitized, re.I) else "structured_process"
    persona = "Builder"
    if re.search(r"\banaly[sz]e|insight|research\b", sanitized, re.I):
        persona = "Analyst"
    if re.search(r"\boperations|process|reliability\b", sanitized, re.I):
        persona = "Operator"
    if re.search(r"\bcreative|design|brand\b", sanitized, re.I):
        persona = "Creative"
    if re.search(r"\bresearch|experiment|novel\b", sanitized, re.I):
        persona = "Researcher"

    skill_weights = []
    for index, skill in enumerate(skills):
        mentions = max(1, len(re.findall(re.escape(skill), sanitized, flags=re.I)))
        weight = min(10, max(1, 10 - index + mentions - 1))
        skill_weights.append({
            "skill": skill,
            "weight": weight,
            "isMustHave": index < 3,
            "category": "technical",
            "foundInContext": f"Mentioned in JD ({mentions} references)",
            "whyImportant": f"{skill} appears to be central to delivery in this role.",
        })

    tool_items = [
        {
            "tool": tool,
            "requirement": "required" if index < 2 else "preferred",
            "alternatives": [],
            "rationale": f"{tool} is explicitly referenced in the JD.",
        }
        for index, tool in enumerate(tools)
    ]

    top_skills = [item["skill"] for item in skill_weights[:3]]
    domain_table = [
        {
            "domain": domain,
            "coreResponsibility": f"Own the main {domain.lower()} execution for the role.",
            "successMetric": "3 shipped deliverables per cycle" if skills else "",
            "relatedSkills": top_skills,
            "estimatedEffort": "40%",
        },
        {
            "domain": "Execution",
            "coreResponsibility": "Translate requirements into working output with visible progress.",
            "successMetric": "Weekly milestone completion rate > 90%",
            "relatedSkills": top_skills,
            "estimatedEffort": "35%",
        },
        {
            "domain": "Quality",
            "coreResponsibility": "Maintain implementation quality through testing and review.",
            "successMetric": "Defect escape rate < 5%",
            "relatedSkills": top_skills,
            "estimatedEffort": "25%",
        },
    ]

    success_outcomes = [
        {
            "verb": "Build",
            "milestone": f"Build a delivery-ready first version of the {domain.lower()} workstream.",
            "relatedSkills": top_skills,
            "estimatedDays": None,
        }
    ] if top_skills else []

    missing_fields = []
    if not title:
        missing_fields.append("roleTitle")
    if experience_years is None:
        missing_fields.append("hardFilters.experienceYears")
    if education_level == "not_specified":
        missing_fields.append("hardFilters.educationLevel")

    missing_field_questions = []
    if "hardFilters.experienceYears" in missing_fields:
        missing_field_questions.append({
            "id": "mq_experience",
            "missingField": "hardFilters.experienceYears",
            "question": "The JD does not specify experience level. What experience range do you want?",
            "type": "multiple_choice",
            "options": ["0-1", "1-3", "3-5", "5+"],
            "affectsField": "hardFilters.experienceYears",
        })
    if "hardFilters.educationLevel" in missing_fields:
        missing_field_questions.append({
            "id": "mq_education",
            "missingField": "hardFilters.educationLevel",
            "question": "Should this role require a formal degree?",
            "type": "multiple_choice",
            "options": ["none", "bachelor", "master", "phd"],
            "affectsField": "hardFilters.educationLevel",
        })

    verification_questions = []
    if remote_only:
        verification_questions.append({
            "id": "vq_remote",
            "question": "I inferred this is a remote-first role. Is that correct?",
            "type": "yes_no",
            "options": ["Yes", "No"],
            "affectsField": "hardFilters.remoteOnly",
            "context": "The JD references remote work language.",
        })

    total_weight = sum(item["weight"] for item in skill_weights) or 1
    for item in skill_weights:
        item["normalizedWeight"] = round(item["weight"] / total_weight, 3)
        item["displayPercent"] = round(item["weight"] / total_weight * 100)

    return {
        "roleTitle": title or "Not specified",
        "domain": domain,
        "seniorityLevel": seniority,
        "skillWeights": skill_weights,
        "personaArchetype": {
            "selected": persona,
            "why": "Derived from the working style and responsibilities described in the JD.",
            "keyBehaviors": ["Delivers work", "Communicates clearly", "Handles responsibility"],
            "softSkillIndicators": ["Ownership", "Execution"],
        },
        "hardFilters": {
            "educationRequired": education_required,
            "educationLevel": education_level,
            "remoteOnly": remote_only,
            "toolRecencyRequired": False,
            "minimumProjects": 0,
            "experienceYears": experience_years,
            "experienceFlexibility": "flexible" if experience_years is None else "exact",
        },
        "tools": tool_items,
        "successOutcomes": success_outcomes,
        "domainTable": domain_table,
        "workContext": {
            "collaboration": collaboration,
            "pace": pace,
            "asyncLevel": "medium",
            "teamSize": None,
            "reportingStructure": None,
            "timeZoneFlexibility": "not_specified",
        },
        "codingIntensity": 70 if skills else 35,
        "verificationQuestions": verification_questions,
        "missingFields": missing_fields,
        "missingFieldQuestions": missing_field_questions,
        "extractionConfidence": {
            "overall": 74 if skills else 58,
            "skills": 80 if skills else 40,
            "tools": 75 if tools else 35,
            "metrics": 70 if domain_table else 30,
            "note": "Local analysis fallback was used." if not os.environ.get("ANTHROPIC_API_KEY") else "Some details required structured inference.",
        },
    }


def validate_analysis_payload(parsed: dict[str, Any]) -> dict[str, Any]:
    parsed["missingFields"] = parsed.get("missingFields") or []
    parsed["missingFieldQuestions"] = parsed.get("missingFieldQuestions") or []
    parsed["verificationQuestions"] = parsed.get("verificationQuestions") or []
    parsed["skillWeights"] = parsed.get("skillWeights") or []
    parsed["domainTable"] = parsed.get("domainTable") or []
    if not parsed["skillWeights"]:
        raise ValueError("AI failed to extract skills.")
    if len(parsed["domainTable"]) < 2:
        raise ValueError("AI domain table incomplete.")
    total = sum(max(1, int(item.get("weight", 1) or 1)) for item in parsed["skillWeights"]) or 1
    normalized = []
    for item in parsed["skillWeights"]:
        weight = max(1, int(item.get("weight", 1) or 1))
        normalized.append({
            **item,
            "weight": weight,
            "normalizedWeight": round(weight / total, 3),
            "displayPercent": round(weight / total * 100),
        })
    parsed["skillWeights"] = sorted(normalized, key=lambda item: item["weight"], reverse=True)
    return parsed


def normalize_skill_graph(skill_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not skill_items:
        return []
    total = sum(max(1, int(item.get("weight", 1) or 1)) for item in skill_items) or 1
    graph = []
    for item in skill_items:
        weight = max(1, int(item.get("weight", 1) or 1))
        graph.append({
            "skill": item.get("skill"),
            "weight": weight,
            "normalizedWeight": round(weight / total, 3),
            "displayPercent": round(weight / total * 100),
            "category": item.get("category") or "supporting",
            "importance": item.get("importance") or ("must_have" if item.get("isMustHave") else "preferred"),
            "isMustHave": bool(item.get("isMustHave")),
            "yearsRequired": item.get("yearsRequired"),
        })
    return sorted(graph, key=lambda item: item["normalizedWeight"], reverse=True)


def _call_anthropic_blocking(sanitized: str) -> dict[str, Any]:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    system_prompt = """
You are the Intelligence Engine for FiverrIntern Pro.
Return only raw valid JSON. Never use markdown. Never invent data.
If a field is missing, set it to null, false, or [] and add its JSON path to missingFields.
Every successMetric must be measurable.
"""
    user_message = f"""
Analyze this job description and return JSON with these keys:
roleTitle, domain, seniorityLevel, skillWeights, personaArchetype, hardFilters, tools,
successOutcomes, domainTable, workContext, codingIntensity, verificationQuestions,
missingFields, missingFieldQuestions, extractionConfidence.

[RAW JD TEXT STARTS]
{sanitized}
[RAW JD TEXT ENDS]
"""
    payload = json.dumps({
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 4096,
        "system": system_prompt.strip(),
        "messages": [{"role": "user", "content": user_message.strip()}],
    }).encode("utf-8")
    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = json.loads(response.read().decode("utf-8"))
    text_blocks = [item.get("text", "") for item in raw.get("content", []) if item.get("type") == "text"]
    if not text_blocks:
        raise ValueError("Anthropic returned no text content")
    return extract_json_object("\n".join(text_blocks))


async def analyze_jd_with_ai_or_fallback(sanitized: str) -> tuple[dict[str, Any], str]:
    try:
        parsed = await asyncio.to_thread(_call_anthropic_blocking, sanitized)
        return validate_analysis_payload(parsed), "anthropic"
    except Exception as exc:
        logger.warning("AI analysis fallback engaged: %s", exc)
        return validate_analysis_payload(analyze_jd_locally(sanitized)), "local_fallback"


def infer_domain(title: str, text: str) -> str:
    corpus = f"{title} {text}".lower()
    if "machine learning" in corpus or "ml" in corpus or "pytorch" in corpus or "tensorflow" in corpus:
        return "Machine Learning"
    if "data" in corpus or "analytics" in corpus or "sql" in corpus:
        return "Data Science"
    if "react" in corpus or "frontend" in corpus or "ui" in corpus:
        return "Frontend"
    if "devops" in corpus or "kubernetes" in corpus or "docker" in corpus:
        return "DevOps"
    if "design" in corpus or "figma" in corpus:
        return "Design"
    return "General"


def infer_seniority(experience_required: str, text: str) -> str:
    corpus = f"{experience_required} {text}".lower()
    if any(token in corpus for token in ["lead", "principal", "10+", "8 year", "senior"]):
        return "Senior"
    if any(token in corpus for token in ["5 year", "4 year", "3 year", "mid"]):
        return "Mid"
    return "Junior"


def generate_resource_link(skill: str) -> str:
    return RESOURCE_LINKS.get(skill.lower(), "https://roadmap.sh/")


def default_enhancement_data(enhancement_data: dict[str, Any] | None = None) -> dict[str, Any]:
    base = {
        "isAIEnhanced": False,
        "skillWeights": [],
        "successOutcomes": [],
        "performanceMetrics": [],
        "toolRequirements": {"strictness": "flexible", "tools": []},
        "constraints": {
            "codingIntensity": 50,
            "experienceStrictness": {"mode": "flexible", "targetYears": 1, "tolerance": 1},
            "educationRequired": False,
            "educationLevel": "none",
            "toolRecencyRequired": False,
            "minimumProjects": 0,
        },
        "personaArchetype": {"selected": "Builder", "description": "Ships work with momentum."},
        "workContext": {"collaboration": "hybrid", "pace": "hybrid", "remote": "remote", "asyncLevel": "medium"},
        "modulesCompleted": [],
        "enhancementScore": 0,
    }
    if enhancement_data:
        for key, value in enhancement_data.items():
            if isinstance(base.get(key), dict) and isinstance(value, dict):
                merged = dict(base[key])
                merged.update(value)
                base[key] = merged
            else:
                base[key] = value
    return base


def build_skill_graph(text: str, enhancement_data: dict[str, Any]) -> list[dict[str, Any]]:
    extracted = extract_skills_from_text(text)
    all_skills: dict[str, dict[str, Any]] = {}
    for skill in extracted:
        all_skills[skill.lower()] = {
            "skill": skill,
            "weight": 50,
            "category": "core",
            "importance": "preferred",
            "normalizedWeight": 0,
            "yearsRequired": 1,
            "isMustHave": False,
        }

    for item in enhancement_data.get("skillWeights", []) or []:
        skill = str(item.get("skill", "")).strip()
        if not skill:
            continue
        all_skills[skill.lower()] = {
            "skill": skill,
            "weight": int(item.get("weight", 60) or 60),
            "category": "core" if item.get("isMustHave") else "supporting",
            "importance": "must_have" if item.get("isMustHave") else "preferred",
            "normalizedWeight": 0,
            "yearsRequired": int(item.get("yearsRequired", 1) or 1),
            "isMustHave": bool(item.get("isMustHave")),
        }

    if not all_skills:
        all_skills["general execution"] = {
            "skill": "General Execution",
            "weight": 100,
            "category": "core",
            "importance": "preferred",
            "normalizedWeight": 1,
            "yearsRequired": 1,
            "isMustHave": False,
        }

    total_weight = sum(max(1, int(skill["weight"])) for skill in all_skills.values())
    skill_graph = []
    for skill in all_skills.values():
        skill["normalizedWeight"] = round(max(1, int(skill["weight"])) / total_weight, 4)
        skill_graph.append(skill)
    skill_graph.sort(key=lambda item: item["normalizedWeight"], reverse=True)
    return skill_graph


def basic_transform(raw_jd: dict[str, Any] | str, basic_details: dict[str, Any]) -> dict[str, Any]:
    normalized = coerce_raw_jd(raw_jd, "manual_typed")
    text = normalized["text"]
    title = basic_details.get("projectTitle") or basic_details.get("title") or "Untitled Role"
    domain = basic_details.get("domain") or infer_domain(title, text)
    seniority = infer_seniority(str(basic_details.get("experienceRequired", "")), text)
    skills = build_skill_graph(text, default_enhancement_data())
    top_skills = [item["skill"] for item in skills[:5]]
    domain_table = [
        {
            "domain": domain,
            "coreResponsibility": f"Own the core {domain.lower()} execution for this role.",
            "successMetric": "Deliver agreed project milestones on schedule.",
            "relatedSkills": top_skills[:3],
            "estimatedEffort": "60%",
        },
        {
            "domain": "Collaboration",
            "coreResponsibility": "Translate requirements into steady delivery with stakeholders.",
            "successMetric": "Clear weekly progress updates and predictable handoffs.",
            "relatedSkills": top_skills[1:4],
            "estimatedEffort": "25%",
        },
        {
            "domain": "Quality",
            "coreResponsibility": "Keep implementation quality high through review and testing.",
            "successMetric": "Low rework and stable release readiness.",
            "relatedSkills": top_skills[2:5],
            "estimatedEffort": "15%",
        },
    ]
    return {
        "meta": {
            "isAIEnhanced": False,
            "compiledAt": datetime.utcnow().isoformat(),
            "compilationMethod": "basic_transform",
            "compilationVersion": "2.0",
        },
        "matchScore": {
            "components": {},
            "formula": {},
            "skillWeightsNormalized": skills,
            "toolMatchLogic": "Match scoring available for AI-enhanced jobs.",
            "personaWeighting": 0,
            "thresholdForMatch": 0.7,
        },
        "gapAnalysis": [],
        "milestones": [
            {
                "phase": "Execution",
                "phaseOrder": 1,
                "description": "Ship a working first pass against the project brief.",
                "definitionOfDone": "Core deliverable is demoable.",
                "estimatedDays": 30,
                "associatedSkills": top_skills[:3],
                "keyDeliverables": ["First working version"],
            },
            {
                "phase": "Validation",
                "phaseOrder": 2,
                "description": "Validate results with stakeholders and iterate.",
                "definitionOfDone": "Feedback incorporated into a stable revision.",
                "estimatedDays": 60,
                "associatedSkills": top_skills[:3],
                "keyDeliverables": ["Reviewed revision"],
            },
            {
                "phase": "Optimization",
                "phaseOrder": 3,
                "description": "Improve quality, reliability, and handoff readiness.",
                "definitionOfDone": "Solution is documented and repeatable.",
                "estimatedDays": 90,
                "associatedSkills": top_skills[:3],
                "keyDeliverables": ["Final optimized handoff"],
            },
        ],
        "roleHeader": {
            "title": title,
            "domain": domain,
            "seniorityLevel": seniority,
            "personaArchetype": "Generalist",
            "personaColor": "#2563eb",
        },
        "skillGraph": skills,
        "domainTable": domain_table,
        "screeningQuestions": [
            {
                "question": f"Tell us about a recent project where you used {top_skills[0] if top_skills else 'your core skill'}.",
                "category": "technical",
                "whatToLookFor": "Clear ownership, concrete tradeoffs, and outcome.",
                "redFlags": ["Vague contribution"],
                "greenFlags": ["Specific scope", "Measured result"],
            }
        ],
        "eligibilityFilters": [
            {
                "filter": str(basic_details.get("experienceRequired") or "Relevant experience"),
                "requirement": "preferred",
                "autoCheckField": "experience",
            }
        ],
        "exclusionFilters": [],
        "constraintDisplay": {
            "codingIntensity": "Moderate",
            "toolStrictness": "Flexible",
            "experienceMatch": str(basic_details.get("experienceRequired") or "Flexible"),
            "workContext": str(basic_details.get("workMode") or "Flexible"),
        },
    }


def compile_dashboard(raw_jd: dict[str, Any] | str, basic_details: dict[str, Any], enhancement_data: dict[str, Any] | None, skip_ai: bool) -> tuple[dict[str, Any], dict[str, Any]]:
    normalized_raw_jd = coerce_raw_jd(raw_jd, "manual_typed")
    if skip_ai or not enhancement_data:
        return basic_transform(normalized_raw_jd, basic_details), normalized_raw_jd

    enhanced = default_enhancement_data(enhancement_data)
    enhanced["isAIEnhanced"] = True
    text = normalized_raw_jd["text"]
    title = basic_details.get("projectTitle") or basic_details.get("title") or "Untitled Role"
    domain = basic_details.get("domain") or infer_domain(title, text)
    seniority = infer_seniority(str(basic_details.get("experienceRequired", "")), text)
    skill_graph = build_skill_graph(text, enhanced)
    tools = enhanced.get("toolRequirements", {}).get("tools") or [
        {"tool": tool, "requirement": "preferred", "rationale": "Mentioned in JD"} for tool in extract_tools_from_text(text)
    ]
    outcomes = enhanced.get("successOutcomes") or []
    performance_metrics = enhanced.get("performanceMetrics") or []
    milestones = []
    for index, phase in enumerate(["Execution", "Validation", "Optimization"], start=1):
        outcome = outcomes[index - 1] if index - 1 < len(outcomes) else {}
        milestones.append({
            "phase": phase,
            "phaseOrder": index,
            "description": outcome.get("milestone") or None,
            "definitionOfDone": outcome.get("milestone") or None,
            "estimatedDays": outcome.get("estimatedDays"),
            "associatedSkills": outcome.get("relatedSkills") or [item["skill"] for item in skill_graph[:3]],
            "keyDeliverables": [outcome["milestone"]] if outcome.get("milestone") else [],
        })

    domain_table = enhanced.get("domainTable") or []

    formula_components = {
        "skillMatch": {
            "weight": 0.60,
            "skills": [
                {
                    "skill": item["skill"],
                    "normalizedWeight": item["normalizedWeight"],
                    "isMustHave": item["importance"] == "must_have",
                    "category": item["category"],
                }
                for item in skill_graph
            ],
            "logic": "Weighted skill overlap with must-have penalty",
            "mustHaveSkillsPenalty": True,
        },
        "toolMatch": {
            "weight": 0.20,
            "tools": tools,
            "strictness": enhanced.get("toolRequirements", {}).get("strictness", "flexible"),
            "logic": "Strict tools require all required matches; flexible tools score by overlap",
        },
        "personaMatch": {
            "weight": 0.10,
            "targetPersona": enhanced.get("personaArchetype", {}).get("selected", "Builder"),
            "logic": "Persona tag overlap",
        },
        "experienceMatch": {
            "weight": 0.10,
            "targetYears": int(enhanced.get("constraints", {}).get("experienceStrictness", {}).get("targetYears", 1) or 1),
            "tolerance": int(enhanced.get("constraints", {}).get("experienceStrictness", {}).get("tolerance", 1) or 1),
            "logic": "Experience within tolerance window",
        },
    }
    compiled_dashboard = {
        "meta": {
            "isAIEnhanced": True,
            "compiledAt": datetime.utcnow().isoformat(),
            "compilationMethod": "langraph_full",
            "compilationVersion": "2.0",
        },
        "matchScore": {
            "components": formula_components,
            "formula": formula_components,
            "skillWeightsNormalized": skill_graph,
            "toolMatchLogic": formula_components["toolMatch"]["logic"],
            "personaWeighting": formula_components["personaMatch"]["weight"],
            "thresholdForMatch": 0.70,
        },
        "gapAnalysis": [],
        "milestones": milestones,
        "roleHeader": {
            "title": title,
            "domain": domain,
            "seniorityLevel": seniority,
            "personaArchetype": enhanced.get("personaArchetype", {}).get("selected", "Builder"),
            "personaColor": "#2563eb",
        },
        "skillGraph": skill_graph,
        "domainTable": domain_table,
        "screeningQuestions": [
            {
                "question": f"Walk us through a project where you used {item['skill']}.",
                "category": "technical" if idx < 3 else "behavioral",
                "whatToLookFor": "Ownership, tradeoffs, and measurable outcome.",
                "redFlags": ["No direct ownership", "No measurable impact"],
                "greenFlags": ["Specific architecture choices", "Clear result"],
            }
            for idx, item in enumerate(skill_graph[:6])
        ],
        "eligibilityFilters": [
            {
                "filter": f"{basic_details.get('experienceRequired') or 'Relevant'} experience",
                "requirement": "must_have" if idx == 0 else "preferred",
                "autoCheckField": "experience" if idx == 0 else "skills",
            }
            for idx in range(2)
        ],
        "exclusionFilters": [
            {
                "filter": "Missing core must-have skills",
                "rationale": "The role depends on proven execution in the weighted skill graph.",
            }
        ],
        "constraintDisplay": {
            "codingIntensity": f"{enhanced.get('constraints', {}).get('codingIntensity', 50)}% engineering",
            "toolStrictness": enhanced.get("toolRequirements", {}).get("strictness", "flexible"),
            "experienceMatch": enhanced.get("constraints", {}).get("experienceStrictness", {}).get("mode", "flexible"),
            "workContext": f"{enhanced.get('workContext', {}).get('collaboration', 'hybrid')} / {enhanced.get('workContext', {}).get('pace', 'hybrid')}",
        },
    }
    return compiled_dashboard, normalized_raw_jd


def calculate_total_years(experience_list: list[dict[str, Any]]) -> float | None:
    if not experience_list:
        return None
    total = 0.0
    for item in experience_list:
        total += float(item.get("yearsInRole", 0) or 0)
    return total


def ensure_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def profile_skill_names(profile: dict[str, Any]) -> set[str]:
    names: set[str] = set()
    for item in ensure_list(profile.get("skills")):
        if isinstance(item, dict):
            if item.get("isFlagged", False):
                continue
            name = item.get("skill") or item.get("skillNormalized") or item.get("name")
        else:
            name = item
        if isinstance(name, str) and name.strip():
            names.add(name.strip().lower())
    return names


SEMANTIC_MATCH_EQUIVALENTS: dict[str, dict[str, float]] = {
    "data science": {
        "machine learning": 0.85,
        "ml": 0.8,
        "python": 0.5,
        "pandas": 0.75,
        "numpy": 0.75,
        "tensorflow": 0.7,
        "pytorch": 0.7,
        "scikit-learn": 0.8,
        "statistics": 0.8,
        "data analysis": 0.8,
        "opencv": 0.3,
        "langchain": 0.25,
    },
    "machine learning": {
        "data science": 0.85,
        "ml": 1.0,
        "python": 0.65,
        "tensorflow": 0.85,
        "pytorch": 0.85,
        "scikit-learn": 0.85,
        "statistics": 0.55,
        "opencv": 0.45,
    },
    "frontend": {
        "react": 0.9,
        "typescript": 0.75,
        "javascript": 0.8,
        "html": 0.65,
        "css": 0.65,
        "tailwind css": 0.55,
    },
    "backend": {
        "node.js": 0.75,
        "fastapi": 0.75,
        "django": 0.75,
        "mongodb": 0.55,
        "postgresql": 0.55,
        "sql": 0.5,
        "api": 0.5,
    },
    "devops": {
        "docker": 0.85,
        "kubernetes": 0.85,
        "aws": 0.65,
        "azure": 0.65,
        "gcp": 0.65,
        "git": 0.4,
        "ci/cd": 0.8,
    },
}

ROLE_CORE_SIGNALS: dict[str, set[str]] = {
    "data science": {"machine learning", "ml", "statistics", "data analysis", "scikit-learn", "pandas", "numpy"},
    "machine learning": {"machine learning", "ml", "tensorflow", "pytorch", "scikit-learn", "model deployment"},
    "frontend": {"react", "javascript", "typescript", "html", "css"},
    "backend": {"fastapi", "django", "node.js", "mongodb", "sql", "api"},
    "devops": {"docker", "kubernetes", "aws", "azure", "gcp", "ci/cd"},
}

GAP_ACTION_GUIDANCE: dict[str, str] = {
    "docker": "Containerize one of your apps and ship it with a simple deployment workflow.",
    "kubernetes": "Package a small service and practice deploying it on a local or managed cluster.",
    "data science": "Ship one end-to-end analysis or ML project with cleaning, modeling, and evaluation notes.",
    "machine learning": "Build a model-driven project and explain training, evaluation, and tradeoffs clearly.",
    "model deployment": "Expose an ML model through FastAPI and document how you would run it in production.",
    "statistics": "Practice hypothesis testing and metrics, then show that reasoning in a notebook or project write-up.",
}


def normalize_term(value: Any) -> str:
    return str(value or "").strip().lower()


def profile_evidence_terms(profile: dict[str, Any]) -> set[str]:
    terms = set(profile_skill_names(profile))
    ai_profile = profile.get("aiProfile") if isinstance(profile.get("aiProfile"), dict) else {}
    career = str(ai_profile.get("careerTrajectory") or "").strip().lower()
    if career:
        terms.add(career)
    for domain in ensure_list(ai_profile.get("topDomains")):
        if isinstance(domain, str) and domain.strip():
            terms.add(domain.strip().lower())
    for project in ensure_list(profile.get("projects")):
        if not isinstance(project, dict):
            continue
        for tech in ensure_list(project.get("techStack")):
            if isinstance(tech, str) and tech.strip():
                terms.add(tech.strip().lower())
        title = str(project.get("title") or "").strip().lower()
        if title:
            terms.add(title)
        description = str(project.get("description") or "").lower()
        if "machine learning" in description or "ml" in description:
            terms.add("machine learning")
        if "data science" in description:
            terms.add("data science")
        if "statistics" in description or "statistical" in description:
            terms.add("statistics")
        if "analysis" in description:
            terms.add("data analysis")
    return terms


def skill_match_strength(required_skill: str, evidence_terms: set[str]) -> float:
    normalized = normalize_term(required_skill)
    if not normalized:
        return 0.0
    if normalized in evidence_terms:
        return 1.0

    best_strength = 0.0
    for term in evidence_terms:
        if not term:
            continue
        if normalized in term or term in normalized:
            best_strength = max(best_strength, 0.65 if len(term) > 3 else 0.4)

    for equivalent, weight in SEMANTIC_MATCH_EQUIVALENTS.get(normalized, {}).items():
        if equivalent in evidence_terms:
            best_strength = max(best_strength, weight)

    return min(1.0, best_strength)


def skill_matches_requirement(required_skill: str, evidence_terms: set[str]) -> bool:
    return skill_match_strength(required_skill, evidence_terms) >= 0.5


def role_core_signals_present(compiled_dashboard: dict[str, Any], evidence_terms: set[str]) -> bool:
    role_header = compiled_dashboard.get("roleHeader") if isinstance(compiled_dashboard.get("roleHeader"), dict) else {}
    role_terms = {
        normalize_term(role_header.get("title")),
        normalize_term(role_header.get("domain")),
    }
    for role_term in role_terms:
        if not role_term:
            continue
        signals = ROLE_CORE_SIGNALS.get(role_term)
        if signals and signals.intersection(evidence_terms):
            return True
    return not any(role_terms)


def build_match_explanation(matched_skills: list[str], missing_must_haves: list[str], confidence: int) -> str:
    if not matched_skills:
        return f"{confidence}% confidence: no reliable overlap was found yet, so the score stays conservative."
    if missing_must_haves:
        return (
            f"{confidence}% confidence: you match {len(matched_skills)} requirement(s), "
            f"but core gaps remain in {', '.join(missing_must_haves[:2])}."
        )
    return f"{confidence}% confidence: your strongest evidence aligns with {', '.join(matched_skills[:3])}."


def improvement_suggestion_for_skill(skill: str) -> str:
    normalized = normalize_term(skill)
    if normalized in GAP_ACTION_GUIDANCE:
        return GAP_ACTION_GUIDANCE[normalized]
    return f"Learn {skill} fundamentals, then add one visible project bullet that proves you used it end to end."


def normalize_profile_for_matching(profile: dict[str, Any] | None) -> dict[str, Any]:
    base = profile if isinstance(profile, dict) else {}
    raw_skills = ensure_list(base.get("skills"))
    normalized_skills = []
    for item in raw_skills:
        if isinstance(item, dict):
            skill_name = item.get("skill") or item.get("skillNormalized") or item.get("name") or ""
            normalized_skills.append({
                **item,
                "skill": skill_name,
                "skillNormalized": item.get("skillNormalized") or skill_name,
                "yearsOfExperience": item.get("yearsOfExperience", 1),
                "proficiency": item.get("proficiency", "intermediate"),
                "endorsements": item.get("endorsements", 0),
            })
        elif isinstance(item, str) and item.strip():
            normalized_skills.append({
                "skill": item.strip(),
                "skillNormalized": item.strip(),
                "yearsOfExperience": 1,
                "proficiency": "intermediate",
                "endorsements": 0,
            })

    identity = base.get("identity") if isinstance(base.get("identity"), dict) else {}
    ai_profile = base.get("aiProfile") if isinstance(base.get("aiProfile"), dict) else {}
    persona_tags = ensure_list(base.get("personaTags")) or ([ai_profile.get("personaArchetype")] if ai_profile.get("personaArchetype") else [])

    return {
        **base,
        "skills": normalized_skills,
        "projects": ensure_list(base.get("projects")),
        "experience": ensure_list(base.get("experience")),
        "education": ensure_list(base.get("education")),
        "personaTags": [tag for tag in persona_tags if isinstance(tag, str) and tag],
        "identity": identity,
        "aiProfile": ai_profile,
    }


async def get_mongo_seeker_profile(user_id: str) -> dict[str, Any] | None:
    mongo_db = await get_db()
    seeker = await mongo_db.seekers.find_one({"userId": user_id}, {"_id": 0})
    if not seeker:
        return None
    normalized = normalize_profile_for_matching(seeker)
    normalized["userId"] = user_id
    normalized["matchingProfile"] = calculate_profile_completeness(normalized)
    return normalized


def build_compiled_dashboard_from_project(project: dict[str, Any]) -> dict[str, Any]:
    skills_required = ensure_list(project.get("skills_required"))
    normalized_weights = round(1 / max(1, len(skills_required)), 3)
    skill_graph = [
        {
            "skill": str(skill),
            "weight": normalized_weights,
            "normalizedWeight": normalized_weights,
            "displayPercent": round(normalized_weights * 100),
            "category": "core",
            "importance": "must_have" if index < 3 else "preferred",
            "isMustHave": index < 3,
            "yearsRequired": 0,
        }
        for index, skill in enumerate(skills_required)
        if str(skill).strip()
    ]
    return {
        "meta": {
            "isAIEnhanced": True,
            "compiledAt": datetime.utcnow().isoformat(),
            "compilationMethod": "project_skills_fallback",
            "compilationVersion": "fallback-v1",
        },
        "roleHeader": {
            "title": project.get("title", "Open project"),
            "domain": "Project",
            "seniorityLevel": "Student",
            "personaArchetype": None,
            "personaColor": "#3b82f6",
        },
        "matchScore": {
            "components": {
                "skillMatch": {
                    "weight": 0.7,
                    "skills": [
                        {
                            "skill": item["skill"],
                            "normalizedWeight": item["normalizedWeight"],
                            "isMustHave": item["isMustHave"],
                            "category": item["category"],
                        }
                        for item in skill_graph
                    ],
                },
                "toolMatch": {"weight": 0.15, "tools": [], "strictness": "flexible"},
                "personaMatch": {"weight": 0.05, "targetPersona": None},
                "experienceMatch": {"weight": 0.1, "targetYears": 0, "tolerance": 1},
            }
        },
        "skillGraph": skill_graph,
        "domainTable": [],
        "milestones": [],
        "screeningQuestions": [],
        "eligibilityFilters": [],
        "exclusionFilters": [],
        "tools": [],
        "projectFallback": True,
    }


def identify_missing_fields(profile: dict[str, Any]) -> list[str]:
    missing = []
    if len(ensure_list(profile.get("skills"))) < 3:
        missing.append("skills")
    if len(ensure_list(profile.get("projects"))) < 1:
        missing.append("projects")
    if len(ensure_list(profile.get("experience"))) < 1:
        missing.append("experience")
    return missing


def calculate_profile_completeness(profile: dict[str, Any]) -> dict[str, Any]:
    completeness = 0
    if len(ensure_list(profile.get("skills"))) >= 5:
        completeness += 30
    elif len(ensure_list(profile.get("skills"))) >= 3:
        completeness += 20
    if len(ensure_list(profile.get("projects"))) >= 3:
        completeness += 30
    elif len(ensure_list(profile.get("projects"))) >= 1:
        completeness += 15
    if len(ensure_list(profile.get("experience"))) >= 2:
        completeness += 20
    elif len(ensure_list(profile.get("experience"))) >= 1:
        completeness += 10
    if len(ensure_list(profile.get("education"))) >= 1:
        completeness += 10
    if len(ensure_list(profile.get("personaTags"))) >= 1:
        completeness += 10
    percentage = round(completeness)
    return {
        "percentage": percentage,
        "missingFields": identify_missing_fields(profile),
        "warning": "Complete your profile for better matches" if percentage < 70 else None,
    }


def calculate_match_score(profile: dict[str, Any], compiled_dashboard: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    profile = normalize_profile_for_matching(profile)
    if not compiled_dashboard.get("meta", {}).get("isAIEnhanced"):
        return 0.0, {
            "matchEnabled": False,
            "reason": "Match score available only for AI-enhanced jobs",
            "missing": [],
            "missingMustHaves": [],
            "confidence": 0,
            "explanation": "This job has not been enhanced enough to calculate a reliable match yet.",
        }

    if not profile.get("skills"):
        return 0.0, {
            "matchEnabled": True,
            "reason": "Insufficient skill data - add more verified skills for a stronger match",
            "missing": identify_missing_fields(profile),
            "missingMustHaves": [],
            "confidence": 20,
            "explanation": "Upload or verify more skills before relying on this score.",
        }
    if not profile.get("projects") and not profile.get("experience"):
        return 0.15, {
            "matchEnabled": True,
            "reason": "Add at least one project or work experience to calculate a stronger match",
            "missing": identify_missing_fields(profile),
            "missingMustHaves": [],
            "confidence": 30,
            "explanation": "Skills are present, but experience evidence is still too thin for a confident match.",
        }

    components = compiled_dashboard.get("matchScore", {}).get("components", {})
    skill_component = components.get("skillMatch", {})
    tool_component = components.get("toolMatch", {})
    persona_component = components.get("personaMatch", {})
    experience_component = components.get("experienceMatch", {})

    evidence_terms = profile_evidence_terms(profile)
    must_haves = [item for item in skill_component.get("skills", []) if item.get("isMustHave")]
    match_strengths: dict[str, float] = {}
    weighted_matches: list[str] = []
    for item in skill_component.get("skills", []):
        skill_name = item.get("skill", "")
        strength = skill_match_strength(skill_name, evidence_terms)
        match_strengths[skill_name] = strength
        if strength >= 0.5:
            weighted_matches.append(skill_name)
    missing_must_haves = [item["skill"] for item in must_haves if match_strengths.get(item["skill"], 0.0) < 0.5]
    missing_skills = [item.get("skill", "") for item in skill_component.get("skills", []) if match_strengths.get(item.get("skill", ""), 0.0) < 0.5]
    skill_score = 0.0
    for item in skill_component.get("skills", []):
        strength = match_strengths.get(item.get("skill", ""), 0.0)
        skill_score += float(item.get("normalizedWeight", 0) or 0) * strength
    skill_score = min(1.0, skill_score)

    required_tools = [item for item in tool_component.get("tools", []) if item.get("requirement") == "required"]
    profile_skills = profile_skill_names(profile)
    tool_set = profile_skills
    
    missing_tools = []
    if tool_component.get("strictness") == "strict":
        tool_score = 1.0 if all(item.get("tool", "").lower() in tool_set for item in required_tools) else 0.0
        missing_tools = [item.get("tool", "") for item in required_tools if item.get("tool", "").lower() not in tool_set]
    else:
        tool_items = tool_component.get("tools", [])
        matched_tools = sum(1 for item in tool_items if item.get("tool", "").lower() in tool_set)
        tool_score = matched_tools / max(1, len(tool_items))
        missing_tools = [item.get("tool", "") for item in tool_items if item.get("tool", "").lower() not in tool_set]
        
    # Combine missing skills and tools for the intelligence engine
    all_missing_skills = missing_skills + missing_tools

    persona_tags = set(ensure_list(profile.get("personaTags")))
    persona_target = persona_component.get("targetPersona")
    persona_score = 1.0 if persona_target in persona_tags else (0.5 if persona_tags else 0.0)

    total_years = calculate_total_years(ensure_list(profile.get("experience")))
    target_year_value = experience_component.get("targetYears", 1)
    if isinstance(target_year_value, str):
        match = re.search(r"(\d+(?:\.\d+)?)", target_year_value)
        target_years = float(match.group(1)) if match else 1.0
    else:
        target_years = float(target_year_value or 1)
    tolerance = float(experience_component.get("tolerance", 1) or 1)
    experience_score = 0.0 if total_years is None else (1.0 if abs(total_years - target_years) <= tolerance else 0.0)

    final_score = (
        skill_score * float(skill_component.get("weight", 0.6) or 0.6) +
        tool_score * float(tool_component.get("weight", 0.2) or 0.2) +
        persona_score * float(persona_component.get("weight", 0.1) or 0.1) +
        experience_score * float(experience_component.get("weight", 0.1) or 0.1)
    )

    core_coverage = 1.0
    if must_haves:
        core_coverage = sum(match_strengths.get(item.get("skill", ""), 0.0) for item in must_haves) / max(1, len(must_haves))
    if must_haves and core_coverage < 0.5:
        final_score = min(final_score, 0.6)
    if not role_core_signals_present(compiled_dashboard, evidence_terms):
        final_score = min(final_score, 0.55)

    final_score = max(0.0, min(1.0, final_score))
    confidence = max(
        20,
        min(
            95,
            round(
                calculate_profile_completeness(profile).get("percentage", 0) * 0.45 +
                core_coverage * 35 +
                (skill_score * 100) * 0.2
            ),
        ),
    )
    explanation = build_match_explanation(weighted_matches, missing_must_haves, confidence)
    logger.info(f"Skills used: {sorted(evidence_terms)}")
    logger.info(f"Matched: {weighted_matches}")
    logger.info(f"Score: {round(final_score * 100)}")

    return final_score, {
        "matchEnabled": True,
        "reason": "Missing required must-have skills" if missing_must_haves else "Match calculated from cleaned skills and project evidence",
        "missing": all_missing_skills,
        "missingMustHaves": missing_must_haves,
        "matchedSkills": weighted_matches,
        "coreScore": round(skill_score * 100),
        "supportScore": round(tool_score * 100),
        "coreCoverage": round(core_coverage * 100),
        "confidence": confidence,
        "explanation": explanation,
        "warning": "This score is based on partial semantic overlap." if core_coverage < 0.75 else None,
    }


def calculate_gaps(profile: dict[str, Any], compiled_dashboard: dict[str, Any]) -> list[dict[str, Any]]:
    profile = normalize_profile_for_matching(profile)
    evidence_terms = profile_evidence_terms(profile)
    gaps = []
    for item in compiled_dashboard.get("skillGraph", []):
        skill_name = item.get("skill", "")
        strength = skill_match_strength(skill_name, evidence_terms)
        if item.get("importance") == "must_have" and strength < 0.5:
            gaps.append({
                "skill": skill_name,
                "importance": "must_have",
                "gap": "Missing core requirement",
                "improvementSuggestion": improvement_suggestion_for_skill(skill_name),
                "resourceLink": generate_resource_link(skill_name),
                "timeToLearn": "2-4 weeks",
                "matchStrength": round(strength * 100),
            })
    return gaps


def normalize_job_post_row(row: dict[str, Any], include_raw_jd: bool = False) -> dict[str, Any]:
    item = dict(row)
    item["basicDetails"] = loads(item.get("basic_details"), {})
    item["rawJD"] = loads(item.get("raw_jd"), {})
    item["enhancementData"] = loads(item.get("enhancement_data"), None)
    item["compiledDashboard"] = loads(item.get("compiled_dashboard"), {})
    item["keywords"] = loads(item.get("keywords"), [])
    item["isAIEnhanced"] = bool(item.get("is_ai_enhanced"))
    item["jobSource"] = item.get("job_source", "manual")
    return {
        "_id": item["id"],
        "id": item["id"],
        "postedBy": item.get("posted_by"),
        "status": item.get("status"),
        "basicDetails": item["basicDetails"],
        "jdMethod": item.get("jd_method"),
        "enhancementData": item["enhancementData"],
        "compiledDashboard": item["compiledDashboard"],
        "visibility": item.get("visibility"),
        "viewCount": item.get("view_count", 0),
        "applicantCount": item.get("applicant_count", 0),
        "keywords": item["keywords"],
        "seoSlug": item.get("seo_slug"),
        "shareableLink": item.get("shareable_link"),
        "isAIEnhanced": bool(item.get("is_ai_enhanced")),
        "jobSource": item.get("job_source", "manual"),
        "createdAt": item.get("created_at"),
        "updatedAt": item.get("updated_at"),
        "publishedAt": item.get("published_at"),
        "expiresAt": item.get("expires_at"),
    }
    if include_raw_jd:
        response["rawJD"] = item["rawJD"]
    return response


async def ensure_freelancer_profile(user_id: str) -> dict[str, Any] | None:
    mongo_profile = await get_mongo_seeker_profile(user_id)
    if mongo_profile:
        await db.execute(
            """
            INSERT OR REPLACE INTO freelancer_profiles (
                user_id, resume, skills, projects, experience, education, persona_tags,
                preferred_work_style, preferred_pace, matching_profile, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                user_id,
                dumps(mongo_profile.get("resumeData", {})),
                dumps(mongo_profile.get("skills", [])),
                dumps(mongo_profile.get("projects", [])),
                dumps(mongo_profile.get("experience", [])),
                dumps(mongo_profile.get("education", [])),
                dumps(mongo_profile.get("personaTags", [])),
                mongo_profile.get("preferredWorkStyle", "hybrid"),
                mongo_profile.get("preferredPace", "hybrid"),
                dumps(mongo_profile.get("matchingProfile", {})),
            ),
        )
        return mongo_profile

    profile_row = await db.fetch_one("SELECT * FROM freelancer_profiles WHERE user_id = ?", (user_id,))
    if profile_row:
        return {
            "userId": profile_row["user_id"],
            "resume": loads(profile_row.get("resume"), {}),
            "skills": loads(profile_row.get("skills"), []),
            "projects": loads(profile_row.get("projects"), []),
            "experience": loads(profile_row.get("experience"), []),
            "education": loads(profile_row.get("education"), []),
            "personaTags": loads(profile_row.get("persona_tags"), []),
            "preferredWorkStyle": profile_row.get("preferred_work_style"),
            "preferredPace": profile_row.get("preferred_pace"),
            "matchingProfile": loads(profile_row.get("matching_profile"), {}),
        }

    mongo_db = await get_db()
    user = await mongo_db.users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
    if not user:
        return None

    skills = [
        {
            "skill": skill,
            "yearsOfExperience": 1,
            "proficiency": "intermediate",
            "endorsements": 0,
            "lastUsedDate": datetime.utcnow().date().isoformat(),
        }
        for skill in user.get("skills", [])
    ]
    resume = user.get("resume_metadata") or {}
    profile = {
        "userId": user_id,
        "resume": resume if isinstance(resume, dict) else {},
        "skills": skills,
        "projects": [],
        "experience": [],
        "education": [{"institution": user.get("college"), "degree": "", "field": "", "graduationYear": None}] if user.get("college") else [],
        "personaTags": [],
        "preferredWorkStyle": "hybrid",
        "preferredPace": "hybrid",
    }
    profile["matchingProfile"] = calculate_profile_completeness(profile)
    await db.execute(
        """
        INSERT OR REPLACE INTO freelancer_profiles (
            user_id, resume, skills, projects, experience, education, persona_tags,
            preferred_work_style, preferred_pace, matching_profile, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (
            user_id,
            dumps(profile["resume"]),
            dumps(profile["skills"]),
            dumps(profile["projects"]),
            dumps(profile["experience"]),
            dumps(profile["education"]),
            dumps(profile["personaTags"]),
            profile["preferredWorkStyle"],
            profile["preferredPace"],
            dumps(profile["matchingProfile"]),
        ),
    )
    return profile


def build_eligibility_filters_from_hard_filters(hard_filters: dict[str, Any]) -> list[dict[str, Any]]:
    filters = []
    if hard_filters.get("educationRequired"):
        filters.append({
            "filter": f"{hard_filters.get('educationLevel') or 'bachelor'} degree required",
            "requirement": "must_have",
            "autoCheckField": "education",
        })
    if hard_filters.get("experienceYears") is not None:
        filters.append({
            "filter": f"{hard_filters.get('experienceYears')} years experience required",
            "requirement": "must_have",
            "autoCheckField": "experience",
        })
    if hard_filters.get("toolRecencyRequired"):
        filters.append({
            "filter": "Tools used within the last 2 years",
            "requirement": "must_have",
            "autoCheckField": "skills",
        })
    return filters


def build_compiled_dashboard_from_ai(basic_details: dict[str, Any], raw_jd: str, enhancement_data: dict[str, Any], ai_analysis: dict[str, Any]) -> dict[str, Any]:
    domain_table = enhancement_data.get("domainTable") or ai_analysis.get("domainTable") or []
    if not domain_table:
        raise HTTPException(status_code=400, detail="Domain table missing - cannot publish incomplete JD")
    if any(not metric_is_measurable(item.get("successMetric", "")) for item in domain_table):
        raise HTTPException(status_code=400, detail="All success metrics must be measurable")

    skill_graph = normalize_skill_graph([
        {
            "skill": item.get("skill"),
            "weight": item.get("weight"),
            "normalizedWeight": item.get("normalizedWeight"),
            "displayPercent": item.get("displayPercent"),
            "category": "core" if item.get("isMustHave") else "supporting",
            "importance": "must_have" if item.get("isMustHave") else "preferred",
            "isMustHave": bool(item.get("isMustHave")),
            "yearsRequired": item.get("yearsRequired"),
        }
        for item in (enhancement_data.get("skillWeights") or ai_analysis.get("skillWeights") or [])
        if item.get("skill")
    ])
    if not skill_graph:
        raise HTTPException(status_code=400, detail="Skill graph missing - cannot publish incomplete JD")

    tools = enhancement_data.get("tools") or ai_analysis.get("tools") or []
    work_context = enhancement_data.get("workContext") or ai_analysis.get("workContext") or {}
    hard_filters = enhancement_data.get("hardFilters") or ai_analysis.get("hardFilters") or {}
    persona = (enhancement_data.get("personaArchetype") or ai_analysis.get("personaArchetype") or {}).get("selected")

    formula_components = {
        "skillMatch": {
            "weight": 0.60,
            "skills": [
                {
                    "skill": item["skill"],
                    "normalizedWeight": item["normalizedWeight"],
                    "isMustHave": item["importance"] == "must_have",
                    "category": item["category"],
                }
                for item in skill_graph
            ],
            "logic": "Weighted skill overlap across recruiter-defined requirements",
            "mustHaveSkillsPenalty": True,
        },
        "toolMatch": {
            "weight": 0.20,
            "tools": tools,
            "strictness": "flexible",
            "logic": "Tool overlap against required and preferred stack items",
        },
        "personaMatch": {
            "weight": 0.10,
            "targetPersona": persona,
            "logic": "Persona overlap based on recruiter-selected archetype",
        },
        "experienceMatch": {
            "weight": 0.10,
            "targetYears": hard_filters.get("experienceYears"),
            "tolerance": 1 if hard_filters.get("experienceFlexibility") == "flexible" else 0,
            "logic": "Experience compared to recruiter-specified range",
        },
    }

    milestones = []
    for index, outcome in enumerate(ai_analysis.get("successOutcomes") or [], start=1):
        milestones.append({
            "phase": "Execution" if index == 1 else "Validation" if index == 2 else "Optimization",
            "phaseOrder": index,
            "description": f"{outcome.get('verb')}: {outcome.get('milestone')}" if outcome.get("verb") and outcome.get("milestone") else outcome.get("milestone"),
            "definitionOfDone": outcome.get("milestone"),
            "estimatedDays": outcome.get("estimatedDays"),
            "associatedSkills": outcome.get("relatedSkills") or [],
            "keyDeliverables": [outcome.get("milestone")] if outcome.get("milestone") else [],
        })

    return {
        "meta": {
            "isAIEnhanced": True,
            "compiledAt": datetime.utcnow().isoformat(),
            "compilationMethod": "ai_analyze_pipeline",
            "compilationVersion": "3.0",
        },
        "roleHeader": {
            "title": basic_details.get("projectTitle") or ai_analysis.get("roleTitle"),
            "domain": ai_analysis.get("domain"),
            "seniorityLevel": ai_analysis.get("seniorityLevel"),
            "personaArchetype": persona,
            "personaColor": {
                "Builder": "#3b82f6",
                "Analyst": "#8b5cf6",
                "Operator": "#f59e0b",
                "Researcher": "#10b981",
                "Creative": "#ec4899",
            }.get(persona, "#6b7280"),
        },
        "matchScore": {
            "components": formula_components,
            "formula": formula_components,
            "skillWeightsNormalized": skill_graph,
            "toolMatchLogic": formula_components["toolMatch"]["logic"],
            "personaWeighting": formula_components["personaMatch"]["weight"],
            "thresholdForMatch": 0.70,
        },
        "gapAnalysis": [],
        "skillGraph": skill_graph,
        "domainTable": domain_table,
        "milestones": milestones,
        "screeningQuestions": [],
        "eligibilityFilters": build_eligibility_filters_from_hard_filters(hard_filters),
        "exclusionFilters": [],
        "constraintDisplay": {
            "codingIntensity": f"{enhancement_data.get('codingIntensity')}% Engineering" if enhancement_data.get("codingIntensity") is not None else None,
            "toolStrictness": "Flexible",
            "experienceMatch": hard_filters.get("experienceFlexibility"),
            "workContext": f"{work_context.get('collaboration')} / {work_context.get('pace')}" if work_context else None,
        },
        "tools": tools,
        "workContext": work_context,
    }


@app.get("/api/autocomplete/titles")
async def autocomplete_titles(q: str = ""):
    query = q.strip().lower()
    if len(query) < 2:
        return []
    matches = []
    for title, category in TITLE_SUGGESTIONS:
        if query in title.lower():
            matches.append({"title": title, "category": category, "frequency": 1000 - len(matches) * 73})
    return matches[:8]


@app.post("/api/jd/parse-pdf")
async def parse_jd_pdf(file: UploadFile = File(...)):
    if file.content_type not in {"application/pdf"}:
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10MB")
    text = extract_pdf(content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")
    sanitized = " ".join(text.split())
    extracted_skills = extract_skills_from_text(sanitized)
    extracted_tools = extract_tools_from_text(sanitized)
    return {
        "success": True,
        "text": sanitized,
        "extractedSkills": extracted_skills,
        "extractedTools": extracted_tools,
        "pageCount": max(1, text.count("\n\n") + 1),
        "pdfUrl": None,
    }


@app.post("/api/jd/analyze")
async def analyze_jd(payload: dict[str, Any]):
    raw_jd = payload.get("rawJD")
    if not isinstance(raw_jd, str):
        raise HTTPException(status_code=400, detail="rawJD text is required")
    sanitized = sanitize_jd_text(raw_jd)
    if len(sanitized) < 150:
        raise HTTPException(status_code=400, detail="JD must be at least 150 characters")
    if len(sanitized) > 8000:
        raise HTTPException(status_code=400, detail="JD exceeds 8000 character limit")
    try:
        analysis, provider = await analyze_jd_with_ai_or_fallback(sanitized)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("JD analysis failed")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {exc}") from exc
    return {
        "success": True,
        "analysis": analysis,
        "provider": provider,
        "totalQuestions": len(analysis.get("verificationQuestions") or []) + len(analysis.get("missingFieldQuestions") or []),
        "hasGaps": bool(analysis.get("missingFields")),
    }


@app.post("/api/jd/compile")
async def compile_jd(payload: dict[str, Any]):
    basic_details = payload.get("basicDetails") or {}
    raw_jd = payload.get("rawJD") or payload.get("raw_jd") or {}
    enhancement_data = payload.get("enhancementData")
    skip_ai = bool(payload.get("skipAI")) or not enhancement_data
    compiled_dashboard, normalized_raw_jd = compile_dashboard(raw_jd, basic_details, enhancement_data, skip_ai)
    return {
        "success": True,
        "compiledDashboard": compiled_dashboard,
        "rawJD": normalized_raw_jd,
        "enhancementData": None if skip_ai else default_enhancement_data(enhancement_data),
        "isAIEnhanced": compiled_dashboard.get("meta", {}).get("isAIEnhanced", False),
    }


@app.post("/api/jobs/publish")
async def publish_ai_job(payload: dict[str, Any]):
    posted_by = str(payload.get("postedBy") or "").strip()
    if not posted_by:
        raise HTTPException(status_code=400, detail="postedBy is required")
    basic_details = payload.get("basicDetails") or {}
    raw_jd = sanitize_jd_text(str(payload.get("rawJD") or ""))
    enhancement_data = payload.get("enhancementData") or {}
    ai_analysis = payload.get("aiAnalysis") or {}
    if not raw_jd:
        raise HTTPException(status_code=400, detail="rawJD is required")
    if ai_analysis.get("missingFields"):
        raise HTTPException(status_code=400, detail="Resolve all missing fields in Step 4 before publishing")
    compiled_dashboard = build_compiled_dashboard_from_ai(basic_details, raw_jd, enhancement_data, ai_analysis)

    job_id = str(uuid.uuid4())
    seo_slug = slugify(f"{basic_details.get('projectTitle') or ai_analysis.get('roleTitle') or 'job'}-{datetime.utcnow().year}")
    expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat()
    keywords = [item["skill"] for item in compiled_dashboard.get("skillGraph", [])[:12]]
    await db.execute(
        """
        INSERT INTO job_posts (
            id, posted_by, status, basic_details, jd_method, raw_jd, enhancement_data,
            compiled_dashboard, visibility, view_count, applicant_count, keywords,
            seo_slug, shareable_link, is_ai_enhanced, job_source, created_at,
            updated_at, published_at, expires_at
        ) VALUES (?, ?, 'published', ?, ?, ?, ?, ?, 'public', 0, 0, ?, ?, ?, 1, 'ai',
                  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
        """,
        (
            job_id,
            posted_by,
            dumps(basic_details),
            payload.get("jdMethod") or "ai_chatbot",
            dumps(coerce_raw_jd(raw_jd, "ai_chatbot_refined")),
            dumps(enhancement_data),
            dumps(compiled_dashboard),
            dumps(keywords),
            seo_slug,
            f"/jobs/{job_id}",
            datetime.utcnow().isoformat(),
            expires_at,
        ),
    )
    row = await db.fetch_one("SELECT * FROM job_posts WHERE id = ?", (job_id,))
    return {
        "success": True,
        "jobId": job_id,
        "job": normalize_job_post_row(row or {}, include_raw_jd=True),
        "shareableLink": f"/jobs/{job_id}",
        "compiledDashboard": compiled_dashboard,
        "message": "Job published successfully",
    }


@app.post("/api/job-posts")
async def create_or_publish_job_post(payload: dict[str, Any]):
    job_id = payload.get("jobPostId") or str(uuid.uuid4())
    posted_by = str(payload.get("postedBy") or payload.get("clientId") or "").strip()
    if not posted_by:
        raise HTTPException(status_code=400, detail="postedBy is required")
    basic_details = payload.get("basicDetails") or {}
    compiled_dashboard = payload.get("compiledDashboard") or {}
    enhancement_data = payload.get("enhancementData")
    raw_jd = coerce_raw_jd(payload.get("rawJD") or {}, "manual_typed")
    jd_method = payload.get("jdMethod") or "manual_text"
    status_value = payload.get("status") or "draft"
    is_ai_enhanced = 1 if compiled_dashboard.get("meta", {}).get("isAIEnhanced") else 0
    title = basic_details.get("projectTitle") or basic_details.get("title") or "untitled-role"
    seo_slug = slugify(f"{title}-{datetime.utcnow().year}")
    shareable_link = f"/freelancer/jobs/{job_id}"
    expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat() if status_value == "published" else None
    keywords = extract_skills_from_text(raw_jd.get("text", ""), limit=12)
    await db.execute(
        """
        INSERT OR REPLACE INTO job_posts (
            id, posted_by, status, basic_details, jd_method, raw_jd, enhancement_data,
            compiled_dashboard, visibility, view_count, applicant_count, keywords,
            seo_slug, shareable_link, is_ai_enhanced, job_source, created_at,
            updated_at, published_at, expires_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT view_count FROM job_posts WHERE id = ?), 0),
            COALESCE((SELECT applicant_count FROM job_posts WHERE id = ?), 0), ?, ?, ?, ?, ?, 
            COALESCE((SELECT created_at FROM job_posts WHERE id = ?), CURRENT_TIMESTAMP),
            CURRENT_TIMESTAMP, ?, ?
        )
        """,
        (
            job_id,
            posted_by,
            status_value,
            dumps(basic_details),
            jd_method,
            dumps(raw_jd),
            dumps(enhancement_data) if enhancement_data is not None else None,
            dumps(compiled_dashboard),
            payload.get("visibility", "public"),
            job_id,
            job_id,
            dumps(keywords),
            seo_slug,
            shareable_link,
            is_ai_enhanced,
            payload.get("jobSource") or ("ai" if is_ai_enhanced else "manual"),
            job_id,
            datetime.utcnow().isoformat() if status_value == "published" else None,
            expires_at,
        ),
    )
    row = await db.fetch_one("SELECT * FROM job_posts WHERE id = ?", (job_id,))
    return {"success": True, "job": normalize_job_post_row(row or {}, include_raw_jd=True)}


@app.get("/api/job-posts/{job_id}")
async def get_job_post(job_id: str):
    row = await db.fetch_one("SELECT * FROM job_posts WHERE id = ?", (job_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Job post not found")
    return {"success": True, "job": normalize_job_post_row(row, include_raw_jd=True)}


@app.get("/api/freelancer/profile")
async def get_freelancer_profile(userId: str):
    profile = await ensure_freelancer_profile(userId)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")
    profile["matchingProfile"] = calculate_profile_completeness(profile)
    return {"success": True, "data": profile}


@app.get("/api/freelancer/jobs/ai-jobs")
async def get_ai_jobs_for_freelancer(userId: str, page: int = 1, limit: int = 20, domain: str | None = None):
    offset = max(0, page - 1) * limit
    profile = await ensure_freelancer_profile(userId)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")
    rows = await db.fetch_all(
        """
        SELECT * FROM job_posts
        WHERE status = 'published' AND is_ai_enhanced = 1
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT ? OFFSET ?
        """,
        (limit, offset),
    )
    jobs = []
    for row in rows:
        job = normalize_job_post_row(row)
        if domain and job.get("compiledDashboard", {}).get("roleHeader", {}).get("domain") != domain:
            continue
        match_score, meta = calculate_match_score(profile, job.get("compiledDashboard", {}))
        jobs.append({
            **job,
            "matchScoreValue": match_score,
            "matchPercentage": round((match_score or 0) * 100) if match_score is not None else 0,
            "matchMeta": meta,
        })
    return {"success": True, "total": len(jobs), "page": page, "limit": limit, "jobs": jobs}


@app.get("/api/freelancer/jobs/{job_id}")
async def get_ai_job_detail(job_id: str, userId: str):
    row = await db.fetch_one("SELECT * FROM job_posts WHERE id = ? AND status = 'published'", (job_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    job = normalize_job_post_row(row)
    profile = await ensure_freelancer_profile(userId)
    if not profile:
        return {
            "error": "profile_not_found",
            "message": "Please create your freelancer profile first.",
        }
    completeness = calculate_profile_completeness(profile)
    match_score, meta = calculate_match_score(profile, job.get("compiledDashboard", {}))
    gaps = calculate_gaps(profile, job.get("compiledDashboard", {}))
    await db.execute("UPDATE job_posts SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (job_id,))
    return {
        "success": True,
        "job": {**job, "isAIEnhanced": job.get("isAIEnhanced", False)},
        "freelancer": {
            "matchPercentage": round((match_score or 0) * 100) if match_score is not None else 0,
            "matchScore": match_score,
            "gaps": gaps,
            "completenessOfProfile": completeness,
            "shippedProjects": len([project for project in profile.get("projects", []) if project.get("isShipped")]),
            "totalProjects": len(profile.get("projects", [])),
            "matchMeta": meta,
        },
    }


@app.get("/api/health")
async def health_check():
    await db.fetch_one("SELECT 1 AS ok")
    mongo_db = await get_db()
    await mongo_db.command("ping")
    return {
        "status": "healthy" if app.state.redis_enabled else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "downloads_root": DOWNLOADS_ROOT,
        "mongodb_change_streams": mongo_runtime.enabled,
        "redis_enabled": app.state.redis_enabled,
        "schema_version": SCHEMA_VERSION,
    }


@app.post("/api/chat")
async def global_chat(payload: ChatPayload):
    logger.info("[CHAT] message=%s path=%s user_id=%s", payload.message, payload.path, payload.user_id)
    try:
        message = payload.message.strip()
        if not message:
            return {"reply": "Tell me what you want help with, and I will guide you from there."}

        context = payload.context if isinstance(payload.context, dict) else {}
        if context.get("job_title"):
            reply = f"I can help with {context['job_title']}. Start by checking your strongest matching skills and one gap you can close next."
        elif "resume" in message.lower():
            reply = "Your resume flows into seeker profile creation. Upload it, review the parsed profile, and I can help explain strengths, gaps, and next improvements."
        elif "match" in message.lower():
            reply = "Match scores use your stored seeker profile plus the selected job requirements. If a score looks wrong, inspect skills, projects, and experience coverage first."
        else:
            reply = f"You said: {message}. I can help with resume parsing, job matching, project fit, and interview preparation."
        logger.info("[CHAT] reply=%s", reply)
        return {"reply": reply}
    except Exception as exc:
        logger.exception("[CHAT] fallback error")
        return {"reply": f"I hit a temporary issue while processing that request, but I am still online. Error: {exc}"}


@app.post("/api/match/calculate")
async def calculate_match(payload: MatchCalculatePayload, request: Request):
    # Resolve seekerId: prefer explicit payload, fallback to bearer token
    seeker_id = payload.seekerId
    if not seeker_id:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.removeprefix("Bearer ").strip()
        from .routes.auth import extract_subject_from_token
        seeker_id = extract_subject_from_token(token) or ""
    logger.info("[MATCH] payload seekerId=%s jobId=%s", seeker_id, payload.jobId)
    mongo_db = await get_db()
    # Try seekers collection first (by userId field), then by _id in users
    seeker = await mongo_db.seekers.find_one({"userId": seeker_id})
    if not seeker and seeker_id:
        from bson import ObjectId as _ObjId
        if _ObjId.is_valid(seeker_id):
            seeker = await mongo_db.seekers.find_one({"_id": _ObjId(seeker_id)})
    # Fallback: use the user document directly from the users collection
    if not seeker and seeker_id:
        from bson import ObjectId as _ObjId
        user_doc = None
        if _ObjId.is_valid(seeker_id):
            user_doc = await mongo_db.users.find_one({"_id": _ObjId(seeker_id)})
        if not user_doc:
            user_doc = await mongo_db.users.find_one({"email": seeker_id})
        seeker = user_doc
    seeker_serialized = serialize_mongo(seeker) if seeker else None
    logger.info("[MATCH] seeker fetched=%s", json.dumps(seeker_serialized, default=str)[:800] if seeker_serialized else "null")
    if not seeker_serialized:
        raise HTTPException(status_code=404, detail="Seeker not found")

    normalized_profile = normalize_profile_for_matching(seeker_serialized)
    logger.info("[MATCH] Seeker skills: %s", [item.get("skill") for item in normalized_profile.get("skills", [])])

    job_row = await db.fetch_one("SELECT * FROM job_posts WHERE id = ?", (payload.jobId,))
    project_row = None if job_row else await db.fetch_one("SELECT * FROM projects WHERE id = ?", (payload.jobId,))

    if job_row:
        job = normalize_job_post_row(job_row)
        compiled_dashboard = job.get("compiledDashboard", {})
        job_payload = {
            "id": job["id"],
            "title": job.get("basicDetails", {}).get("projectTitle") or "Job",
            "compiledDashboard": compiled_dashboard,
        }
    elif project_row:
        project = dict(project_row)
        project["skills_required"] = loads(project.get("skills_required"), []) if isinstance(project.get("skills_required"), str) else ensure_list(project.get("skills_required"))
        compiled_dashboard = build_compiled_dashboard_from_project(project)
        job_payload = {
            "id": project["id"],
            "title": project.get("title", "Project"),
            "compiledDashboard": compiled_dashboard,
        }
    else:
        raise HTTPException(status_code=404, detail="Job not found")

    logger.info("[MATCH] job fetched=%s", json.dumps(job_payload, default=str)[:800])

    if not compiled_dashboard:
        return {
            "status": "waiting_for_data",
            "reason": "job_not_loaded",
            "totalScore": 0,
            "matchedSkills": [],
            "gaps": [],
            "strengths": [],
            "explanation": "Job requirements are not available yet.",
        }

    match_score, meta = calculate_match_score(normalized_profile, compiled_dashboard)
    gaps = calculate_gaps(normalized_profile, compiled_dashboard)
    matched_skills = meta.get("matchedSkills", [])

    # BUILD INTELLIGENCE FROM MATCH RESULT
    try:
        from .match_engine import build_intelligence
        match_result = {
            "totalScore": round((match_score or 0) * 100),
            "matched": matched_skills,
            "missing": meta.get("missing", []),
            "missingMustHaves": meta.get("missingMustHaves", []),
            "coreScore": meta.get("coreScore", 0),
            "supportScore": meta.get("supportScore", 0),
        }
        role_data = {
            "normalizedTitle": job_payload.get("title", "this role"),
        }
        intelligence = build_intelligence(seeker_serialized, job_payload, match_result, role_data)
    except Exception as e:
        logger.error(f"Intelligence building failed: {e}")
        intelligence = {
            "weaknesses": [],
            "insights": [],
            "suggestions": [],
            "interviewQuestions": [],
            "confidence": 0.5,
            "explanation": "Match calculated successfully",
            "decision": "BORDERLINE",
            "scoreBreakdown": {}
        }

    result = {
        "status": "ok",
        "seekerId": payload.seekerId,
        "jobId": payload.jobId,
        # Core score fields
        "totalScore": round((match_score or 0) * 100),
        "confidence": intelligence.get("confidence", 0.5),
        "decision": intelligence.get("decision", "BORDERLINE"),
        "explanation": intelligence.get("explanation", "Match calculated successfully"),
        # Skill breakdown
        "matchedSkills": matched_skills,
        "matched": matched_skills,
        "gaps": gaps,
        "missing": meta.get("missing", []),
        "missingMustHaves": meta.get("missingMustHaves", []),
        "missingCore": meta.get("missingMustHaves", []),
        "missingSupport": meta.get("missing", []),
        "strongSkills": matched_skills[:3],
        "strengths": [f"Strong: {skill}" for skill in matched_skills[:3]],
        # Score breakdown
        "scoreBreakdown": intelligence.get("scoreBreakdown", {}),
        # Intelligence fields
        "weaknesses": intelligence.get("weaknesses", []),
        "insights": intelligence.get("insights", []),
        "suggestions": intelligence.get("suggestions", []),
        "interviewQuestions": intelligence.get("interviewQuestions", []),
        # Meta
        "detectedRole": job_payload.get("title"),
        "capApplied": meta.get("capApplied", False),
        "warning": "Score based on partial profile data" if intelligence.get("confidence", 1.0) < 0.6 else None,
        "matchMeta": meta,
        "job": job_payload,
        "seeker": {
            "userId": normalized_profile.get("userId") or payload.seekerId,
            "skills": normalized_profile.get("skills", []),
            "projects": normalized_profile.get("projects", []),
            "experience": normalized_profile.get("experience", []),
        },
    }
    logger.info("[MATCH] result=%s", json.dumps(result, default=str)[:800])
    return result


# ============================================================================
# CHATBOT ROUTES
# ============================================================================

class ChatPayload(BaseModel):
    message: str
    jobId: Optional[str] = None
    path: str = "/"
    history: list[dict[str, Any]] = Field(default_factory=list)
    user_id: str = ""
    context: dict[str, Any] = Field(default_factory=dict)


@app.post("/api/chat")
async def chat(payload: ChatPayload, current_user: dict = Depends(get_current_user)):
    """
    Career intelligence chatbot endpoint
    Combines seeker profile, job context, match results, and dataset knowledge
    """
    try:
        mongo_db = await get_db()
        
        message = payload.message.strip()
        if not message:
            return {"reply": "Please type a message."}
        
        job_id = payload.jobId
        user_id = current_user.get("id") or current_user.get("userId")
        
        from .chat_engine import run_chat

        result = await run_chat(
            message=message,
            user_id=user_id,
            job_id=job_id,
            db=mongo_db,
            path=payload.path,
            history=payload.history,
            context=payload.context,
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return {
            "reply": "I ran into an issue. Please try again in a moment.",
            "intent": "general",
            "error": str(e)
        }


@app.delete("/api/chat/clear")
async def clear_chat(current_user: dict = Depends(get_current_user)):
    """
    Clear chat history for the current user
    """
    try:
        user_id = current_user.get("id") or current_user.get("userId")
        from .chat_engine import clear_chat_history
        logger.info(f"Chat history cleared for user {user_id}")
        return await clear_chat_history(user_id)
    except Exception as e:
        logger.error(f"Error clearing chat history: {e}")
        return {"error": str(e)}


@app.get("/test-db")
async def test_db():
    try:
        mongo_db = await get_db()
        await mongo_db.command("ping")
        return {"status": "MongoDB connected", "schema_version": SCHEMA_VERSION}
    except Exception as exc:
        logger.exception("MongoDB ping failed")
        return {"error": str(exc)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                message = {"type": raw}

            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
            elif message.get("type") == "sync":
                missed = await sync_missed_events(
                    message.get("user_id"),
                    message.get("last_seen_timestamp"),
                )
                await websocket.send_json({
                    "type": "SYNC_MISSED_EVENTS",
                    "data": missed,
                    "timestamp": datetime.utcnow().isoformat(),
                })
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception:
        websocket_manager.disconnect(websocket)


@app.get("/api/sync/missed")
async def get_missed_events(last_seen_timestamp: str | None = None, user_id: str | None = None):
    return {"success": True, "data": await sync_missed_events(user_id, last_seen_timestamp)}


@app.get("/api/auth/check-aadhaar")
async def check_aadhaar(aadhaar: str):
    mongo_db = await get_db()
    lookup_hash = aadhaar_lookup(aadhaar)
    found = await mongo_db.users.find_one({"aadhaar_lookup": lookup_hash}, {"_id": 1})
    return {"available": found is None}


@app.get("/auth/check-aadhaar")
async def check_aadhaar_short(aadhaar: str):
    return await check_aadhaar(aadhaar)


@app.post("/api/auth/register-v2", status_code=status.HTTP_201_CREATED)
async def register_v2(payload: RegisterPayload):
    mongo_db = await get_db()
    email = payload.email.strip().lower()
    logger.info("[REGISTER_V2] Registering or updating user %s", email)
    existing = await mongo_db.users.find_one({"email": email}, {"_id": 1, "history": 1})

    aadhaar_data = None
    aadhaar_last_four = None
    if payload.aadhaar:
        aadhaar_data = build_aadhaar_payload(payload.aadhaar)
        aadhaar_last_four = aadhaar_data["last_four"]
        existing_identity = await mongo_db.users.find_one(
            {"aadhaar_lookup": aadhaar_data["lookup_hash"]},
            {"_id": 1},
        )
        if existing_identity and (not existing or existing_identity["_id"] != existing["_id"]):
            raise HTTPException(status_code=409, detail="Identity already registered")

    full_name = (payload.full_name or payload.username or email.split("@")[0]).strip()
    resume_metadata = loads(payload.resume_file_url, None) if isinstance(payload.resume_file_url, str) else None
    if not isinstance(resume_metadata, dict) and payload.resume_file_url:
        resume_metadata = {
            "file_id": payload.resume_file_url,
            "filename": os.path.basename(payload.resume_file_url),
            "uploaded_at": datetime.utcnow().isoformat(),
        }

    now = datetime.now(timezone.utc)
    history = existing.get("history", []) if existing and isinstance(existing.get("history"), list) else []
    history.append(
        {
            "changed_at": now.isoformat(),
            "field": "registration_sync",
            "old_value": {"email": email} if existing else None,
            "new_value": {"email": email, "aadhaar_last_four": aadhaar_last_four},
            "reason": "User registration upsert",
        }
    )
    user_doc = {
        "email": email,
        "username": payload.username or email.split("@")[0],
        "password_hash": hash_password(payload.password),
        "user_type": "freelancer",
        "full_name": full_name,
        "city": payload.city,
        "state": payload.state,
        "college": payload.college,
        "skills": payload.skills,
        "resume_file_url": payload.resume_file_url,
        "resume_metadata": resume_metadata,
        "schema_version": SCHEMA_VERSION,
        "updated_at": now,
        "history": history,
    }
    if aadhaar_data:
        user_doc["aadhaar_lookup"] = aadhaar_data["lookup_hash"]
        user_doc["aadhaar_secure_hash"] = aadhaar_data["secure_hash"]
        user_doc["aadhaar_salt"] = aadhaar_data["salt"]
        user_doc["aadhaar_last_four"] = aadhaar_data["last_four"]

    try:
        stored_user = await mongo_db.users.find_one_and_update(
            {"email": email},
            {
                "$set": user_doc,
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except Exception as exc:
        logger.exception("Registration failed for %s", email)
        if "duplicate" in str(exc).lower():
            raise HTTPException(status_code=409, detail="Email or identity already registered") from exc
        raise

    if stored_user is None:
        raise HTTPException(status_code=500, detail="Registration failed")
    ensure_schema_version(stored_user)
    logger.info("[REGISTER_V2] MongoDB record synced %s", str(stored_user["_id"]))
    await publish_event("USER_UPDATE", normalize_mongo_user(stored_user), str(stored_user["_id"]))
    return {
        "success": True,
        "status": "success",
        "message": "Profile synced successfully",
        "user_id": str(stored_user["_id"]),
        "data": {"id": str(stored_user["_id"]), "email": stored_user["email"]},
    }


@app.post("/api/auth/register-freelancer", status_code=status.HTTP_201_CREATED)
async def register_freelancer(payload: RegisterPayload):
    return await register_v2(payload)


@app.post("/api/auth/register-client", status_code=status.HTTP_201_CREATED)
async def register_client(payload: RegisterPayload):
    mongo_db = await get_db()
    email = payload.email.strip().lower()
    existing = await mongo_db.users.find_one({"email": email}, {"_id": 1})
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    now = datetime.now(timezone.utc)
    user_doc = {
        "email": email,
        "username": payload.username or email.split("@")[0],
        "password_hash": hash_password(payload.password),
        "user_type": "client",
        "full_name": (payload.full_name or payload.username or email.split("@")[0]).strip(),
        "schema_version": SCHEMA_VERSION,
        "created_at": now,
        "updated_at": now,
        "history": [
            {
                "changed_at": now.isoformat(),
                "field": "registration",
                "old_value": None,
                "new_value": {"email": email},
                "reason": "Client registration",
            }
        ],
    }
    try:
        result = await mongo_db.users.insert_one(user_doc)
    except Exception as exc:
        logger.exception("Client registration failed for %s", email)
        if "duplicate" in str(exc).lower():
            raise HTTPException(status_code=409, detail="Email already registered") from exc
        raise

    created = await mongo_db.users.find_one({"_id": result.inserted_id})
    if created is None:
        raise HTTPException(status_code=500, detail="Registration failed")
    ensure_schema_version(created)
    await publish_event("USER_UPDATE", normalize_mongo_user(created), str(created["_id"]))
    return {"success": True, "data": {"id": str(created["_id"]), "email": created["email"]}}


@app.post("/api/auth/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    try:
        print(f"DEBUG: Attempting to save resume for file: {file.filename}")
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file selected")
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")

        resume_metadata = None
        # 1) Store file (best-effort, never crash endpoint)
        try:
            resume_metadata = await mongo_runtime.upload_resume(file.filename, content)
            if resume_metadata is None:
                resume_dir = os.path.join(DOWNLOADS_ROOT, "resumes")
                os.makedirs(resume_dir, exist_ok=True)
                file_id = str(uuid.uuid4())
                file_path = os.path.join(resume_dir, f"{file_id}_{file.filename}")
                with open(file_path, "wb") as handle:
                    handle.write(content)
                resume_metadata = {
                    "file_id": file_id,
                    "filename": file.filename,
                    "uploaded_at": datetime.utcnow().isoformat(),
                    "local_path": file_path,
                }
        except Exception as e:
            print("ERROR:", str(e))
            import traceback

            traceback.print_exc()

        # 2) Parse (crash-proof basic decode + fallback)
        try:
            enriched = seeker_intelligence_service.parse_resume(file.filename or "", content)
            parsed = enriched["parsed"]
            prefill_data = enriched["prefillData"]
            confidence_payload = enriched["confidence"]
            text = prefill_data.get("resumeData", {}).get("rawExtractedText", "")
            if not text.strip():
                raise HTTPException(
                    status_code=422,
                    detail="Could not extract text from this PDF. Please upload a text-based PDF resume.",
                )
            parsed["status"] = "parsed"
            parsed["filename"] = file.filename
            parsed["text_length"] = len(text)
            parsed["uploaded"] = True
        except HTTPException:
            raise
        except Exception as e:
            print("Resume parse error:", e)
            parsed = {
                "skills": [],
                "full_name": "",
                "email": "",
                "college": "",
                "city": "",
                "state": "",
                "projects": [],
                "status": "fallback_used",
                "filename": file.filename,
                "uploaded": True,
            }
            prefill_data = {
                "identity": {"name": "", "email": "", "location": {"city": "", "state": "", "country": "India"}, "github": ""},
                "skills": [],
                "projects": [],
                "experience": [],
                "education": [],
                "aiProfile": {"profileCompleteness": 0, "personaArchetype": "", "careerTrajectory": "", "seniorityLevel": "", "topDomains": []},
                "resumeData": {"rawExtractedText": "", "extractionMethod": "fallback", "extractionConfidence": 0, "parsingErrors": ["resume_parse_failed"], "extractedAt": datetime.utcnow().isoformat()},
                "confidence": {"overall": 0, "strong_fields": [], "review_fields": [], "missing_fields": ["skills", "projects", "experience"]},
            }
            confidence_payload = {"overall": 0, "strong_fields": [], "review_fields": [], "missing_fields": ["skills", "projects", "experience"]}

        return {
            "success": True,
            "file_url": json.dumps(resume_metadata) if resume_metadata else "",
            "resume": resume_metadata,
            "prefillData": prefill_data,
            "confidence": confidence_payload,
            "parsed": parsed,
            "data": parsed,
        }

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", str(e))
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal Error: {str(e)}",
        )


@app.get("/api/jobs")
async def get_jobs():
    rows = await db.fetch_all("SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC")
    return {"success": True, "data": [normalize_job(row) for row in rows]}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    row = await db.fetch_one("SELECT * FROM jobs WHERE id = ? AND status = 'open'", (job_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"success": True, "data": normalize_job(row)}


@app.post("/api/jobs", status_code=status.HTTP_201_CREATED)
async def create_job(payload: JobPayload):
    job_id = await next_job_id()
    score = verified_match(payload.match_score, payload.trust_score)
    trace_id = str(uuid.uuid4())
    async with db.transaction() as conn:
        await conn.execute(
            """
            INSERT INTO jobs (
                id, client_id, title, company, description, location, work_mode, job_type,
                duration, stipend, category, skills, jd, jr, trust_score, match_score,
                verified_match, github_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job_id,
                payload.client_id,
                payload.title,
                payload.company,
                payload.description,
                payload.location,
                payload.work_mode,
                payload.job_type,
                payload.duration,
                payload.stipend,
                payload.category,
                dumps(payload.skills),
                dumps(payload.jd),
                dumps(payload.jr),
                payload.trust_score,
                payload.match_score,
                score,
                payload.github_url,
            ),
        )
        await conn.execute(
            """
            INSERT INTO decision_traces (
                id, match_id, vector_score, cross_encoder_score, langgraph_path, reasoning_log, evidence_mapping
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                trace_id,
                str(job_id),
                float(payload.match_score),
                score,
                dumps(["Ingestor", "Matcher", "GapAnalyzer"]),
                dumps([
                    f"Matched role '{payload.title}' against required skills.",
                    f"Verified score combined match score {payload.match_score} with trust score {payload.trust_score}.",
                ]),
                dumps({
                    "skills": payload.skills,
                    "requirements": payload.jr,
                    "job_description": payload.jd,
                }),
            ),
        )
        await conn.execute(
            "INSERT INTO audit_logs (id, entity_type, entity_id, action, payload) VALUES (?, 'job', ?, 'CREATE_JOB', ?)",
            (str(uuid.uuid4()), str(job_id), dumps({"title": payload.title, "client_id": payload.client_id})),
        )
    row = await db.fetch_one("SELECT * FROM jobs WHERE id = ?", (job_id,))
    await publish_event("JOB_MATCH_UPDATE", normalize_job(row), payload.client_id)
    return {"success": True, "data": normalize_job(row)}


@app.post("/api/jobs/post", status_code=status.HTTP_201_CREATED)
async def create_weighted_job(payload: JobPayload):
    return await create_job(payload)


@app.patch("/api/jobs/{job_id}/github")
async def update_job_from_github(job_id: str, payload: dict[str, Any]):
    trust_score = float(payload.get("trust_score", payload.get("github_trust_score", 0)))
    match_score = float(payload.get("match_score", 0))
    score = verified_match(match_score, trust_score)
    updated = await db.execute(
        "UPDATE jobs SET trust_score = ?, match_score = ?, verified_match = ?, github_url = COALESCE(?, github_url) WHERE id = ?",
        (trust_score, match_score, score, payload.get("github_url"), job_id),
    )
    if updated == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    row = await db.fetch_one("SELECT * FROM jobs WHERE id = ?", (job_id,))
    await publish_event("JOB_MATCH_UPDATE", normalize_job(row), row.get("client_id"))
    return {"success": True, "data": normalize_job(row)}


@app.post("/api/n8n/candidates", status_code=status.HTTP_201_CREATED)
async def ingest_candidate(payload: CandidateIngestionPayload):
    candidate_id = payload.id or str(uuid.uuid4())
    await db.execute(
        """
        INSERT INTO candidates (
            id, email, full_name, github_url, github_score, trust_score, skills, raw_payload, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET
            full_name = excluded.full_name,
            github_url = excluded.github_url,
            github_score = excluded.github_score,
            trust_score = excluded.trust_score,
            skills = excluded.skills,
            raw_payload = excluded.raw_payload,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            candidate_id,
            payload.email,
            payload.full_name,
            payload.github_url,
            payload.github_score,
            payload.trust_score,
            dumps(payload.skills),
            json.dumps(payload.payload),
        ),
    )
    row = await db.fetch_one("SELECT * FROM candidates WHERE email = ? OR id = ?", (payload.email, candidate_id))
    row["skills"] = loads(row.get("skills"), [])
    row["raw_payload"] = loads(row.get("raw_payload"), {})
    await publish_event("USER_UPDATE", row, candidate_id)
    return {"success": True, "data": row}


@app.get("/api/match/{match_id}/trace")
async def get_match_trace(match_id: str):
    row = await db.fetch_one("SELECT * FROM decision_traces WHERE match_id = ?", (match_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Decision trace not found for this match")
    trace = {
        "id": row["id"],
        "match_id": row["match_id"],
        "vector_score": row["vector_score"],
        "cross_encoder_score": row["cross_encoder_score"],
        "langgraph_path": loads(row.get("langgraph_path"), []),
        "reasoning_log": loads(row.get("reasoning_log"), []),
        "evidence_mapping": loads(row.get("evidence_mapping"), {}),
        "created_at": row["created_at"],
    }
    explanation = " -> ".join(trace["langgraph_path"])
    return {
        "success": True,
        "data": {
            **trace,
            "human_readable_explanation": f"Decision flowed through {explanation}. Final verified score: {trace['cross_encoder_score']}.",
            "node_by_node_reasoning": [
                {"node": node, "reason": trace["reasoning_log"][idx] if idx < len(trace["reasoning_log"]) else "No additional note"}
                for idx, node in enumerate(trace["langgraph_path"])
            ],
        },
    }


@app.post("/api/search/hybrid-vector")
async def hybrid_vector_search(payload: HybridSearchPayload):
    if not mongo_runtime.enabled:
        raise HTTPException(status_code=503, detail="MongoDB vector search requires MONGODB_URI")
    filters: dict[str, Any] = {}
    if payload.salary_expected is not None:
        filters["salary_expected"] = {"$lte": payload.salary_expected}
    if payload.notice_period_days is not None:
        filters["notice_period_days"] = {"$lte": payload.notice_period_days}
    if payload.locations:
        filters["location"] = {"$in": payload.locations}
    if not filters:
        raise HTTPException(status_code=400, detail="Metadata filters are required for vector search")
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": payload.query_vector,
                "numCandidates": 100,
                "limit": payload.limit,
                "filter": filters,
            }
        }
    ]
    results = await mongo_runtime.db.candidates.aggregate(pipeline).to_list(length=payload.limit)
    return {"success": True, "data": serialize_mongo(results)}


@app.get("/api/intelligence/pulse")
async def market_pulse():
    rows = await db.fetch_all(
        """
        SELECT json_each.value AS skill, COUNT(*) AS count
        FROM jobs, json_each(jobs.skills)
        WHERE jobs.status = 'open'
        GROUP BY json_each.value
        ORDER BY count DESC
        LIMIT 10
        """
    )
    return {"success": True, "trending": rows}
