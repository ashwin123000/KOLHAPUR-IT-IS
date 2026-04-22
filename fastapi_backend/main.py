import hashlib
import hmac
import json
import os
import time
import uuid
from datetime import datetime
from typing import Any

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

from .database import db, dumps, init_db, loads
from .mongodb_realtime import mongo_runtime, serialize_mongo


DOWNLOADS_ROOT = os.environ.get("DOWNLOADS_ROOT", os.path.join(os.path.dirname(__file__), "..", "downloads_data"))
AADHAAR_PEPPER = os.environ.get("AADHAAR_PEPPER", "architect-x-local-pepper-change-me")


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
    print(f"{request.method} {request.url.path} -> {response.status_code} ({process_time:.2f}s)")
    return response


app = FastAPI(title="Architect-X Raw Connection API", version="2.0.0")
app.add_middleware(BaseHTTPMiddleware, dispatch=log_requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
async def startup() -> None:
    os.makedirs(DOWNLOADS_ROOT, exist_ok=True)
    await init_db()
    await mongo_runtime.connect()
    mongo_runtime.start_watchers(websocket_manager.broadcast)


@app.on_event("shutdown")
async def shutdown() -> None:
    await mongo_runtime.close()


def aadhaar_hashes(aadhaar: str) -> tuple[str, str]:
    digits = "".join(ch for ch in aadhaar if ch.isdigit())
    if len(digits) != 12:
        raise HTTPException(status_code=400, detail="Aadhaar must contain exactly 12 digits")
    lookup = hmac.new(AADHAAR_PEPPER.encode(), digits.encode(), hashlib.sha256).hexdigest()
    audit = hashlib.sha256(f"{digits}:{AADHAAR_PEPPER}".encode()).hexdigest()
    return lookup, audit


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


class LoginPayload(BaseModel):
    email: str
    password: str


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


@app.get("/api/health")
async def health_check():
    await db.fetch_one("SELECT 1 AS ok")
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "downloads_root": DOWNLOADS_ROOT,
        "mongodb_change_streams": mongo_runtime.enabled,
    }


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
    lookup, _ = aadhaar_hashes(aadhaar)
    found = await db.fetch_one("SELECT id FROM users WHERE aadhaar_lookup = ?", (lookup,))
    return {"available": found is None}


@app.post("/api/auth/register-v2", status_code=status.HTTP_201_CREATED)
async def register_v2(payload: RegisterPayload):
    aadhaar_lookup = None
    aadhaar_audit_hash = None
    aadhaar_last_four = None
    if payload.aadhaar:
        aadhaar_lookup, aadhaar_audit_hash = aadhaar_hashes(payload.aadhaar)
        aadhaar_last_four = "".join(ch for ch in payload.aadhaar if ch.isdigit())[-4:]
        found = await db.fetch_one("SELECT id FROM users WHERE aadhaar_lookup = ?", (aadhaar_lookup,))
        if found:
            raise HTTPException(status_code=409, detail="Identity already registered")

    user_id = str(uuid.uuid4())
    resume_metadata = loads(payload.resume_file_url, None) if isinstance(payload.resume_file_url, str) else None
    if not isinstance(resume_metadata, dict) and payload.resume_file_url:
        resume_metadata = {"file_id": payload.resume_file_url, "filename": os.path.basename(payload.resume_file_url), "uploaded_at": datetime.utcnow().isoformat()}
    try:
        async with db.transaction() as conn:
            await conn.execute(
            """
            INSERT INTO users (
                id, email, username, password, user_type, full_name, city, state,
                college, skills, resume_file_url, resume_metadata, aadhaar_lookup, aadhaar_audit_hash, history
            ) VALUES (?, ?, ?, ?, 'freelancer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    user_id,
                    payload.email,
                    payload.username or payload.email.split("@")[0],
                    payload.password,
                    payload.full_name,
                    payload.city,
                    payload.state,
                    payload.college,
                    dumps(payload.skills),
                    payload.resume_file_url,
                    dumps(resume_metadata) if resume_metadata else None,
                    aadhaar_lookup,
                    aadhaar_audit_hash,
                    dumps([{
                        "changed_at": datetime.utcnow().isoformat(),
                        "field": "registration",
                        "old_value": None,
                        "new_value": {"email": payload.email, "aadhaar_last_four": aadhaar_last_four},
                        "reason": "User registration",
                    }]),
                ),
            )
            await conn.execute(
                "INSERT INTO audit_logs (id, entity_type, entity_id, action, payload) VALUES (?, 'user', ?, 'REGISTER', ?)",
                (str(uuid.uuid4()), user_id, dumps({"email": payload.email, "aadhaar_last_four": aadhaar_last_four})),
            )
    except Exception as exc:
        message = str(exc)
        if "UNIQUE constraint failed" in message:
            raise HTTPException(status_code=409, detail="Email, username, or identity already registered") from exc
        raise

    row = await db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    await publish_event("USER_UPDATE", normalize_user(row), user_id)
    return {"success": True, "data": {"id": user_id, "email": payload.email}}


@app.post("/api/auth/register-freelancer", status_code=status.HTTP_201_CREATED)
async def register_freelancer(payload: RegisterPayload):
    return await register_v2(payload)


@app.post("/api/auth/register-client", status_code=status.HTTP_201_CREATED)
async def register_client(payload: RegisterPayload):
    user_id = str(uuid.uuid4())
    try:
        async with db.transaction() as conn:
            await conn.execute(
                "INSERT INTO users (id, email, username, password, user_type, full_name, history) VALUES (?, ?, ?, ?, 'client', ?, ?)",
                (
                    user_id,
                    payload.email,
                    payload.username or payload.email.split("@")[0],
                    payload.password,
                    payload.full_name,
                    dumps([{
                        "changed_at": datetime.utcnow().isoformat(),
                        "field": "registration",
                        "old_value": None,
                        "new_value": {"email": payload.email},
                        "reason": "Client registration",
                    }]),
                ),
            )
            await conn.execute(
                "INSERT INTO audit_logs (id, entity_type, entity_id, action, payload) VALUES (?, 'user', ?, 'REGISTER_CLIENT', ?)",
                (str(uuid.uuid4()), user_id, dumps({"email": payload.email})),
            )
    except Exception as exc:
        if "UNIQUE constraint failed" in str(exc):
            raise HTTPException(status_code=409, detail="Email or username already registered") from exc
        raise
    row = await db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    await publish_event("USER_UPDATE", normalize_user(row), user_id)
    return {"success": True, "data": {"id": user_id, "email": payload.email}}


@app.post("/api/auth/login")
async def login(payload: LoginPayload):
    user = await db.fetch_one(
        "SELECT id, email, user_type, full_name FROM users WHERE email = ? AND password = ?",
        (payload.email, payload.password),
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"success": True, "data": user}


@app.post("/api/auth/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are accepted")
    content = await file.read()
    resume_metadata = await mongo_runtime.upload_resume(file.filename, content)
    if resume_metadata is None:
        resume_dir = os.path.join(DOWNLOADS_ROOT, "resumes")
        os.makedirs(resume_dir, exist_ok=True)
        file_id = str(uuid.uuid4())
        file_path = os.path.join(resume_dir, f"{file_id}.pdf")
        with open(file_path, "wb") as handle:
            handle.write(content)
        resume_metadata = {
            "file_id": file_id,
            "filename": file.filename,
            "uploaded_at": datetime.utcnow().isoformat(),
            "storage": "local-dev",
        }
    return {
        "success": True,
        "file_url": dumps(resume_metadata),
        "resume": resume_metadata,
        "parsed": {
            "full_name": "",
            "email": "",
            "college": "",
            "city": "",
            "state": "",
            "skills": [],
            "confidence": 0,
            "low_confidence_fields": [],
        },
    }


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


@app.get("/api/projects")
async def get_projects():
    rows = await db.fetch_all("SELECT * FROM projects WHERE status = 'open' ORDER BY created_at DESC")
    return {"success": True, "data": rows}
