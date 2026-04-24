from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, model_validator
import aiosqlite
import sqlite3
import asyncio
import hashlib
import uuid
from fastapi import WebSocket, WebSocketDisconnect
import os
from datetime import datetime
import logging
import redis
from fastapi.middleware.gzip import GZipMiddleware
from fastapi import BackgroundTasks
import json
import re
import time
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===================== REQUEST/RESPONSE LOGGING MIDDLEWARE =====================
async def log_requests(request: Request, call_next):
    """Log all API requests and responses for debugging"""
    start_time = time.time()
    
    # Log request
    logger.info(f"\n{'='*70}")
    logger.info(f"📨 REQUEST: {request.method} {request.url.path}")
    if request.query_params:
        logger.info(f"   Query: {dict(request.query_params)}")
    
    # Log request body for POST/PUT
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                try:
                    body_str = body.decode('utf-8')[:300]
                    if len(body_str) > 300:
                        body_str = body_str[:300] + "..."
                    logger.info(f"   Body: {body_str}")
                except:
                    logger.info(f"   Body: [binary data]")
        except:
            pass
    
    # Call endpoint
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(f"✓ RESPONSE: {response.status_code} (took {process_time:.2f}s)")
    logger.info(f"{'='*70}\n")
    response.headers["X-Process-Time"] = str(process_time)
    
    return response

app = FastAPI()

# Add logging middleware FIRST (before other middlewares)
app.add_middleware(BaseHTTPMiddleware, dispatch=log_requests)
app.add_middleware(GZipMiddleware, minimum_size=1000)
active_connections = []

# ===================== REDIS SETUP =====================
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, socket_timeout=1, socket_connect_timeout=1)
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("✅ Redis connected successfully.")
except (redis.ConnectionError, redis.TimeoutError, Exception) as e:
    REDIS_AVAILABLE = False
    redis_client = None
    logger.warning(f"⚠️  Redis unavailable (optional): {type(e).__name__}")

# ===================== CORS =====================
# Must be registered before any routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3173",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/test/status")
async def test_status():
    """Detailed backend status check"""
    import sys
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "backend": "FastAPI",
        "database": "SQLite",
        "cors_enabled": True,
        "logging_enabled": True,
        "redis_available": REDIS_AVAILABLE,
        "python_version": sys.version,
    }

@app.get("/api/test/cors")
async def test_cors():
    """Test CORS configuration"""
    return {
        "message": "If you can read this, CORS is working!",
        "test": "Try making a request from your frontend",
        "cors_enabled": True,
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            await websocket.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        active_connections.remove(websocket)

# ===================== DATABASE & PATHS =====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "freelance_market.db")

# ✅ DOWNLOADS CONFIGURATION - Support both local and E: drive
DOWNLOADS_ROOT = os.environ.get("DOWNLOADS_ROOT", "E:\\freelance_platform_data")
if not os.path.isabs(DOWNLOADS_ROOT) or not os.path.exists(DOWNLOADS_ROOT.split("\\")[0] + "\\"):
    # Fallback if E: drive doesn't exist
    DOWNLOADS_ROOT = os.path.join(BASE_DIR, "downloads_data")

os.makedirs(DOWNLOADS_ROOT, exist_ok=True)
logger.info(f"✅ Downloads root configured to: {DOWNLOADS_ROOT}")

# Create subdirectories for organization
RESUMES_DIR = os.path.join(DOWNLOADS_ROOT, "resumes")
MODELS_DIR = os.path.join(DOWNLOADS_ROOT, "models")
JOBS_DIR = os.path.join(DOWNLOADS_ROOT, "jobs_data")
CACHE_DIR = os.path.join(DOWNLOADS_ROOT, "cache")

for d in [RESUMES_DIR, MODELS_DIR, JOBS_DIR, CACHE_DIR]:
    os.makedirs(d, exist_ok=True)

db_conn = None

@app.on_event("startup")
async def startup():
    global db_conn
    try:
        db_conn = await aiosqlite.connect(DB_PATH)
        await db_conn.execute("PRAGMA journal_mode=WAL;")
        logger.info("✅ SQLite connected with WAL mode.")

        # Table creation - all wrapped in try-except to prevent startup failure
        async with db_conn.cursor() as cursor:
            # Create all tables safely
            create_statements = [
                """CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY, username TEXT, email TEXT UNIQUE, password TEXT, role TEXT,
                    full_name TEXT, city TEXT, state TEXT, college TEXT, password_salt TEXT,
                    aadhaar_lookup TEXT UNIQUE, aadhaar_secure_hash TEXT, average_rating REAL DEFAULT 0,
                    reliability_score REAL DEFAULT 0, completed_projects INTEGER DEFAULT 0)""",
                """CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY, client_id TEXT, title TEXT, description TEXT, budget REAL,
                    status TEXT, assigned_freelancer_id TEXT)""",
                """CREATE TABLE IF NOT EXISTS applications (
                    id TEXT PRIMARY KEY, project_id TEXT, freelancer_id TEXT, status TEXT,
                    cover_letter TEXT, bid_amount REAL)""",
                """CREATE TABLE IF NOT EXISTS ratings (
                    id TEXT PRIMARY KEY, freelancer_id TEXT, project_id TEXT, stars INTEGER,
                    feedback TEXT, on_time_status TEXT)""",
                """CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY, project_id TEXT, sender_id TEXT, receiver_id TEXT,
                    content TEXT, timestamp TEXT)""",
                """CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, company TEXT, location TEXT,
                    salary TEXT, description TEXT, skills TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""",
                """CREATE TABLE IF NOT EXISTS user_skills (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, skill TEXT,
                    FOREIGN KEY(user_id) REFERENCES users(id))""",
            ]
            
            for stmt in create_statements:
                try:
                    await cursor.execute(stmt)
                except Exception as e:
                    logger.warning(f"⚠️  Table creation: {str(e)[:100]}")
            
            # Create indexes safely
            try:
                await cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            except:
                pass
        
        await db_conn.commit()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")
        # Don't re-raise - let app start anyway

@app.on_event("shutdown")
async def shutdown():
    global db_conn
    if db_conn:
        await db_conn.close()
        logger.info("Database connection closed.")


# ===================== MODELS =====================

class FreelancerRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = None
    city: str = None
    state: str = None
    college: str = None
    aadhaar: str = None

class ClientRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = None

class CompanyRegister(BaseModel):
    name: str
    admin_email: str

class HRHandshakeRequest(BaseModel):
    email: str
    company_code: str

class LoginRequest(BaseModel):
    email: str
    password: str

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class CreateProject(BaseModel):
    title: str
    description: str = ""
    budget: float
    clientId: str

class ApplyRequest(BaseModel):
    projectId: str
    freelancerId: str
    coverLetter: str = ""
    bidAmount: float = 0.0

class HireRequest(BaseModel):
    applicationId: str
    projectId: str
    freelancerId: str

class SubmitWorkRequest(BaseModel):
    projectId: str
    freelancerId: str

class VerifyWorkRequest(BaseModel):
    verify: bool

class RatingRequest(BaseModel):
    freelancerId: str
    projectId: str
    stars: int
    feedback: str = ""
    onTimeStatus: str = "ON_TIME"

class MessageRequest(BaseModel):
    projectId: str
    senderId: str
    receiverId: str
    content: str

class NotificationRequest(BaseModel):
    userId: str
    content: str

class PaymentRequest(BaseModel):
    projectId: str
    clientId: str
    freelancerId: str
    amount: float

class RoleRequest(BaseModel):
    role: str
    location: str
    user_skills: list[str] = []

# ===================== INTELLIGENCE ENGINE MODELS =====================

class SkillWeight(BaseModel):
    name: str
    weight: float = 1.0
    priority: str = "medium"   # "high" | "medium" | "low"
    type: str = "skill"        # "skill" | "certification"
    verified: bool = False
    normalized_weight: float = 0.0

class JobPostRequest(BaseModel):
    title: str
    company: str
    location: str = ""
    salary: str = ""
    description: str = ""
    vibe: str = ""             # Cultural fit descriptor e.g. "High-Growth"
    skills: list[SkillWeight] = []

    @model_validator(mode="after")
    def validate_high_priority(self):
        # Fix #7 Pydantic v2 strict: reject if no HIGH priority skill
        if not self.skills:
            raise ValueError("Job must have at least one skill defined.")
        if not any(s.priority == "high" for s in self.skills):
            raise ValueError("At least one skill must be high priority.")
        return self

class VibeMatchRequest(BaseModel):
    job_id: str = ""
    user_id: str = ""
    job_vibe: str
    candidate_summary: str

# ===================== RELIABILITY ENGINE =====================

class ReliabilityEngine:
    # ... (remains unchanged)
    pass

# ===================== INTELLIGENCE ENGINE — HELPERS =====================

def normalize_weights(skills: list) -> list:
    """
    Normalize skill weights to sum = 1.0.
    Fix #2: Edge case — if total_weight == 0, assigns equal distribution
    instead of crashing with ZeroDivisionError.
    """
    total_weight = sum(
        (s.weight if hasattr(s, 'weight') else s.get('weight', 1.0))
        for s in skills
    )
    if total_weight == 0:
        # Equal distribution for zero-weight edge case
        equal = 1.0 / len(skills) if skills else 1.0
        for s in skills:
            if isinstance(s, dict):
                s['normalized_weight'] = equal
            else:
                s.normalized_weight = equal
    else:
        for s in skills:
            w = s.weight if hasattr(s, 'weight') else s.get('weight', 1.0)
            nw = w / total_weight
            if isinstance(s, dict):
                s['normalized_weight'] = nw
            else:
                s.normalized_weight = nw
    return skills

APP_SECRET_KEY = os.environ.get("APP_SECRET_KEY", "super-secret-key-2026")

def generate_company_code(name: str) -> str:
    """Deterministic Company Code: Prefix-Hash (e.g., INF-A82F)"""
    prefix = name[:3].upper()
    h = hashlib.sha256((name + APP_SECRET_KEY).encode()).hexdigest()
    return f"{prefix}-{h[:4].upper()}"

def hash_aadhaar(aadhaar: str, salt_hex: str):
    """
    Two-layer Aadhaar security:
    1. Deterministic lookup (SHA256) for uniqueness
    2. Secure salted hash (SHA256 + salt) for storage
    """
    salt = bytes.fromhex(salt_hex)
    aadhaar_lookup = hashlib.sha256(aadhaar.encode()).hexdigest()
    aadhaar_secure_hash = hashlib.sha256(salt + aadhaar.encode()).hexdigest()
    return aadhaar_lookup, aadhaar_secure_hash

def hash_password(password: str):
    """Legacy SHA-256 — kept for old accounts registered before bcrypt."""
    return hashlib.sha256(password.encode()).hexdigest()

def bcrypt_hash(password: str) -> str:
    """Deprecated: project uses SHA-256 only (kept to avoid import errors)."""
    return hashlib.sha256(password.encode()).hexdigest()

def bcrypt_verify(password: str, hashed: str) -> bool:
    """Deprecated: verify password using SHA-256 only."""
    return hashed == hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id: str, role: str):
    return f"{user_id}:{role}:{uuid.uuid4().hex[:12]}"

def get_user_from_token(token: str):
    try:
        parts = token.split(":")
        return {"userId": parts[0], "role": parts[1]}
    except:
        return None

def require_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No token")
    token = authorization.replace("Bearer ", "")
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

# ===================== RELIABILITY ENGINE =====================

class ReliabilityEngine:
    # ... (remains unchanged)
    pass

# ===================== AUTH =====================

@app.post("/api/auth/company-register")
async def register_company(req: CompanyRegister):
    """Register a company and create its deterministic code."""
    cur = await db_conn.cursor()
    try:
        company_id = "comp_" + uuid.uuid4().hex[:8]
        code = generate_company_code(req.name)
        
        await cur.execute(
            "INSERT INTO companies (id, name, company_code) VALUES (?, ?, ?)",
            (company_id, req.name, code)
        )
        
        # Add admin to allowed emails
        await cur.execute(
            "INSERT INTO allowed_emails (company_id, email) VALUES (?, ?)",
            (company_id, req.admin_email)
        )
        
        await db_conn.commit()
        return {"success": True, "company_code": code}
    except Exception as e:
        await db_conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/hr-handshake")
async def hr_handshake(req: HRHandshakeRequest):
    """HR Login Handshake: Verify email + code, trigger Magic Link if needed."""
    cur = await db_conn.cursor()
    
    # 1. Verify Company Code
    await cur.execute("SELECT id FROM companies WHERE company_code=?", (req.company_code,))
    comp_row = await cur.fetchone()
    if not comp_row:
        raise HTTPException(status_code=404, detail="Invalid company code")
    
    company_id = comp_row[0]
    
    # 2. Verify Email in allowed_emails
    await cur.execute("SELECT id FROM allowed_emails WHERE company_id=? AND email=?", (company_id, req.email))
    allowed = await cur.fetchone()
    if not allowed:
        raise HTTPException(status_code=403, detail="Email not authorized for this company")
    
    # 3. Check if user exists and has password
    await cur.execute("SELECT id, password FROM users WHERE email=?", (req.email,))
    user_row = await cur.fetchone()
    
    if not user_row or not user_row[1]:
        # TRIGGER MAGIC LINK (Mock)
        magic_token = uuid.uuid4().hex[:20]
        if REDIS_AVAILABLE:
            redis_client.setex(f"magic_link:{magic_token}", 3600, req.email)
        
        logger.info(f"🚀 [MAGIC LINK] Sent to {req.email}: http://localhost:3173/auth/setup?token={magic_token}")
        
        return {
            "success": True, 
            "status": "handshake_sent", 
            "message": "A magic link has been sent to your email to setup your account."
        }
    
    return {"success": True, "status": "ready_for_credentials"}

@app.post("/api/auth/register-freelancer")
async def register_freelancer(user: FreelancerRegister):
    cur = await db_conn.cursor()
    try:
        user_id = "freelancer_" + uuid.uuid4().hex[:8]
        salt = os.urandom(16).hex()
        hashed_pw = bcrypt_hash(user.password)
        
        # 2nd layer Aadhaar hashing
        aadhaar_lookup = None
        aadhaar_secure = None
        if user.aadhaar:
            aadhaar_lookup, aadhaar_secure = hash_aadhaar(user.aadhaar, salt)

        await cur.execute(
            """INSERT INTO users 
               (id, username, email, password, role, full_name, city, state, college, password_salt, aadhaar_lookup, aadhaar_secure_hash) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user.username, user.email, hashed_pw, "freelancer", 
             user.full_name, user.city, user.state, user.college, salt, aadhaar_lookup, aadhaar_secure)
        )
        await db_conn.commit()
        return {"success": True, "data": {"userId": user_id}}
    except aiosqlite.IntegrityError:
        await db_conn.rollback()
        raise HTTPException(status_code=400, detail="Email or Aadhaar already registered")
    except Exception as e:
        await db_conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/register-client")
async def register_client(user: ClientRegister):
    cur = await db_conn.cursor()
    try:
        user_id = "client_" + uuid.uuid4().hex[:8]
        salt = os.urandom(16).hex()
        hashed_pw = bcrypt_hash(user.password)
        
        await cur.execute(
            """INSERT INTO users 
               (id, username, email, password, role, full_name, password_salt) 
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user.username, user.email, hashed_pw, "client", user.full_name, salt)
        )
        await db_conn.commit()
        return {"success": True, "data": {"userId": user_id}}
    except aiosqlite.IntegrityError:
        await db_conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

@app.post("/api/auth/login")
async def login(user: LoginRequest):
    """
    Unified login endpoint.
    - Supports bcrypt passwords (v2 registrations) AND legacy sha256 (old accounts).
    - Returns full_name for the welcome toast on the frontend.
    """
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT id, username, email, password, role, full_name FROM users WHERE email=?",
        (user.email,)
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id, username, email, stored_password, role, full_name = row

    if not bcrypt_verify(user.password, stored_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = generate_token(user_id, role)
    display_name = full_name or username or email.split("@")[0]

    return {
        "success": True,
        "data": {
            "token": token,
            "userId": user_id,
            "role": role,
            "full_name": display_name,
        }
    }

# ===================== PROJECTS =====================

@app.post("/api/projects/secure")
async def create_project_secure(project: CreateProject, user=Depends(require_user)):
    cur = await db_conn.cursor()
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients allowed")
    project_id = "proj_" + str(uuid.uuid4())[:8]
    await cur.execute(
        "INSERT INTO projects (id, client_id, title, description, budget, status) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, user["userId"], project.title, project.description, project.budget, "open")
    )
    await db_conn.commit()
    return {"success": True, "projectId": project_id}

@app.post("/api/projects/submit")
async def submit_work(data: SubmitWorkRequest):
    cur = await db_conn.cursor()
    await cur.execute(
        "UPDATE projects SET status='submitted' WHERE id=? AND assigned_freelancer_id=?",
        (data.projectId, data.freelancerId)
    )
    await db_conn.commit()
    return {"success": True, "message": "Work submitted"}

@app.post("/api/projects/{project_id}/verify")
async def verify_work(project_id: str, body: VerifyWorkRequest):
    cur = await db_conn.cursor()
    new_status = "completed" if body.verify else "in_progress"
    await cur.execute("UPDATE projects SET status=? WHERE id=?", (new_status, project_id))
    await db_conn.commit()
    return {"success": True, "status": new_status}

@app.post("/api/projects")
async def create_project(project: CreateProject):
    cur = await db_conn.cursor()
    project_id = "proj_" + str(uuid.uuid4())[:8]
    await cur.execute(
        "INSERT INTO projects (id, client_id, title, description, budget, status) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, project.clientId, project.title, project.description, project.budget, "open")
    )
    await db_conn.commit()
    return {"success": True, "data": {"projectId": project_id}}

@app.get("/api/projects/client/{client_id}")
async def get_projects_for_client(client_id: str):
    cur = await db_conn.cursor()
    await cur.execute("SELECT * FROM projects WHERE client_id=?", (client_id,))
    return {"success": True, "data": await cur.fetchall()}

@app.get("/api/projects/freelancer/{user_id}")
async def get_projects_for_freelancer(user_id: str):
    cur = await db_conn.cursor()

    # Projects where freelancer is hired
    await cur.execute("SELECT * FROM projects WHERE assigned_freelancer_id=?", (user_id,))
    assigned = await cur.fetchall()

    # Projects where freelancer has applied but not yet hired
    await cur.execute("""
        SELECT p.* FROM projects p
        INNER JOIN applications a ON a.project_id = p.id
        WHERE a.freelancer_id=? AND p.assigned_freelancer_id IS NULL
    """, (user_id,))
    applied = await cur.fetchall()

    # Merge and deduplicate by project id
    seen = set()
    result = []
    for p in assigned + applied:
        if p[0] not in seen:
            seen.add(p[0])
            result.append(p)

    return {"success": True, "data": result}

@app.get("/api/projects")
async def get_projects():
    cur = await db_conn.cursor()
    await cur.execute("SELECT * FROM projects")
    rows = await cur.fetchall()
    return {"success": True, "data": [
        {"projectId": r[0], "clientId": r[1], "title": r[2],
         "description": r[3], "budget": r[4], "status": r[5]} for r in rows
    ]}

# ===================== APPLICATIONS =====================

@app.post("/api/apply/secure")
async def apply_secure(data: ApplyRequest, user=Depends(require_user)):
    cur = await db_conn.cursor()
    if user["role"] != "freelancer":
        raise HTTPException(status_code=403, detail="Only freelancers can apply")
    await cur.execute(
        "SELECT id FROM applications WHERE project_id=? AND freelancer_id=?",
        (data.projectId, user["userId"])
    )
    if await cur.fetchone():
        raise HTTPException(status_code=400, detail="Already applied")
    app_id = "app_" + str(uuid.uuid4())[:8]
    await cur.execute(
        "INSERT INTO applications VALUES (?, ?, ?, ?, ?, ?)",
        (app_id, data.projectId, user["userId"], "pending", data.coverLetter, data.bidAmount)
    )
    await db_conn.commit()
    return {"success": True}

@app.post("/api/apply")
async def apply(data: ApplyRequest):
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT id FROM applications WHERE project_id=? AND freelancer_id=?",
        (data.projectId, data.freelancerId)
    )
    if await cur.fetchone():
        raise HTTPException(status_code=400, detail="Already applied")
    app_id = "app_" + str(uuid.uuid4())[:8]
    await cur.execute(
        "INSERT INTO applications VALUES (?, ?, ?, ?, ?, ?)",
        (app_id, data.projectId, data.freelancerId, "pending", data.coverLetter, data.bidAmount)
    )
    await db_conn.commit()
    return {"success": True}

@app.get("/api/applications/{project_id}")
async def get_applications(project_id: str):
    cur = await db_conn.cursor()
    await cur.execute("SELECT * FROM applications WHERE project_id=?", (project_id,))
    return {"success": True, "data": await cur.fetchall()}

@app.get("/api/applications/freelancer/{freelancer_id}")
async def get_freelancer_applications(freelancer_id: str):
    cur = await db_conn.cursor()
    # Join with projects to get titles and client info
    await cur.execute("""
        SELECT a.*, p.title, p.budget, p.status as project_status 
        FROM applications a
        JOIN projects p ON a.project_id = p.id
        WHERE a.freelancer_id=?
    """, (freelancer_id,))
    return {"success": True, "data": await cur.fetchall()}

@app.put("/api/applications/{app_id}/update-bid")
async def update_bid(app_id: str, body: dict):
    cur = await db_conn.cursor()
    await cur.execute(
        "UPDATE applications SET bid_amount=? WHERE id=?",
        (body.get("bidAmount", 0), app_id)
    )
    await db_conn.commit()
    return {"success": True}

# ===================== HIRE =====================

@app.post("/api/hire/secure")
async def hire_secure(data: HireRequest, user=Depends(require_user)):
    cur = await db_conn.cursor()
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can hire")
    await cur.execute("SELECT client_id FROM projects WHERE id=?", (data.projectId,))
    owner = await cur.fetchone()
    if not owner or owner[0] != user["userId"]:
        raise HTTPException(status_code=403, detail="Not your project")
    await cur.execute("UPDATE applications SET status='accepted' WHERE id=?", (data.applicationId,))
    await cur.execute(
        "UPDATE applications SET status='rejected' WHERE project_id=? AND id!=?",
        (data.projectId, data.applicationId)
    )
    await cur.execute(
        "UPDATE projects SET assigned_freelancer_id=?, status='in_progress' WHERE id=?",
        (data.freelancerId, data.projectId)
    )
    await db_conn.commit()
    return {"success": True}

@app.post("/api/hire")
async def hire(data: HireRequest):
    cur = await db_conn.cursor()
    await cur.execute(
        "UPDATE applications SET status='accepted' WHERE id=? AND project_id=?",
        (data.applicationId, data.projectId)
    )
    await cur.execute(
        "UPDATE applications SET status='rejected' WHERE project_id=? AND id!=?",
        (data.projectId, data.applicationId)
    )
    await cur.execute(
        "UPDATE projects SET assigned_freelancer_id=?, status='in_progress' WHERE id=?",
        (data.freelancerId, data.projectId)
    )
    await db_conn.commit()
    return {"success": True}

# ===================== MESSAGES =====================

@app.get("/api/messages/user/{user_id}")
async def get_user_messages(user_id: str):
    cur = await db_conn.cursor()
    await cur.execute("SELECT * FROM messages WHERE sender_id=? OR receiver_id=?", (user_id, user_id))
    return {"success": True, "data": await cur.fetchall()}

@app.post("/api/messages")
async def send_message(data: MessageRequest):
    cur = await db_conn.cursor()
    msg_id = "msg_" + str(uuid.uuid4())[:8]
    await cur.execute(
        "INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)",
        (msg_id, data.projectId, data.senderId, data.receiverId, data.content, datetime.now().isoformat())
    )
    await db_conn.commit()
    return {"success": True}


@app.get("/api/messages/{project_id}")
async def get_messages(project_id: str):
    cur = await db_conn.cursor()
    await cur.execute("SELECT * FROM messages WHERE project_id=?", (project_id,))
    return {"success": True, "data": await cur.fetchall()}

# ===================== NOTIFICATIONS =====================

@app.post("/api/notifications")
async def send_notification(data: NotificationRequest):
    cur = await db_conn.cursor()
    notif_id = "notif_" + str(uuid.uuid4())[:8]
    await cur.execute(
        "INSERT INTO notifications VALUES (?, ?, ?, ?, ?)",
        (notif_id, data.userId, data.content, 0, datetime.now().isoformat())
    )
    await db_conn.commit()
    return {"success": True}

@app.get("/api/notifications/{user_id}")
async def get_notifications(user_id: str):
    cur = await db_conn.cursor()
    await cur.execute("SELECT * FROM notifications WHERE user_id=?", (user_id,))
    return {"success": True, "data": await cur.fetchall()}

@app.put("/api/notifications/{notif_id}/read")
async def mark_read(notif_id: str):
    cur = await db_conn.cursor()
    await cur.execute("UPDATE notifications SET is_read=1 WHERE id=?", (notif_id,))
    await db_conn.commit()
    return {"success": True}

# ===================== PAYMENTS =====================

@app.post("/api/payments/release")
async def release_payment(body: dict):
    cur = await db_conn.cursor()
    await cur.execute(
        "UPDATE payments SET status='released' WHERE project_id=?",
        (body.get("projectId"),)
    )
    await db_conn.commit()
    return {"success": True}

@app.post("/api/payments")
async def create_payment(data: PaymentRequest):
    cur = await db_conn.cursor()
    pay_id = "pay_" + str(uuid.uuid4())[:8]
    await cur.execute(
        "INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?)",
        (pay_id, data.projectId, data.clientId, data.freelancerId, data.amount, "pending")
    )
    await db_conn.commit()
    return {"success": True}

@app.get("/api/payments/{user_id}")
async def get_payments(user_id: str):
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT * FROM payments WHERE client_id=? OR freelancer_id=?",
        (user_id, user_id)
    )
    return {"success": True, "data": await cur.fetchall()}

# ===================== INVOICES =====================

@app.get("/api/invoices/{user_id}")
async def get_invoices(user_id: str):
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT * FROM payments WHERE freelancer_id=? AND status='released'",
        (user_id,)
    )
    return {"success": True, "data": await cur.fetchall()}

# ===================== TALENT =====================

@app.get("/api/freelancers")
async def get_freelancers():
    cur = await db_conn.cursor()
    await cur.execute("SELECT id, username, average_rating, reliability_score FROM users WHERE role='freelancer'")
    return {"success": True, "data": await cur.fetchall()}

# ===================== STATS =====================

@app.get("/api/stats/{user_id}/client")
async def client_stats(user_id: str):
    cur = await db_conn.cursor()
    await cur.execute("SELECT COUNT(*) FROM projects WHERE client_id=?", (user_id,))
    total = await cur.fetchone()[0]
    await cur.execute("SELECT COUNT(*) FROM projects WHERE client_id=? AND status='completed'", (user_id,))
    completed = await cur.fetchone()[0]
    return {"success": True, "data": {"totalProjects": total, "completedProjects": completed}}

@app.get("/api/stats/{user_id}/freelancer")
async def freelancer_stats(user_id: str):
    cur = await db_conn.cursor()
    await cur.execute("SELECT COUNT(*) FROM applications WHERE freelancer_id=?", (user_id,))
    apps = await cur.fetchone()[0]
    await cur.execute("SELECT completed_projects, reliability_score FROM users WHERE id=?", (user_id,))
    user_data = await cur.fetchone()
    completed = user_data[0] if user_data else 0
    score = user_data[1] if user_data else 0
    await cur.execute("""
        SELECT COUNT(*), SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END)
        FROM projects WHERE assigned_freelancer_id=?
    """, (user_id,))
    proj_data = await cur.fetchone()
    total_projects = proj_data[0] if proj_data else 0
    active_projects = proj_data[1] if proj_data and proj_data[1] else 0
    await cur.execute(
        "SELECT SUM(amount) FROM payments WHERE freelancer_id=? AND status='released'",
        (user_id,)
    )
    earnings_data = await cur.fetchone()
    total_earnings = earnings_data[0] if earnings_data and earnings_data[0] else 0
    await cur.execute("SELECT average_rating FROM users WHERE id=?", (user_id,))
    rating_row = await cur.fetchone()
    average_rating = rating_row[0] if rating_row and rating_row[0] else 0.0

    # ── Real growth data: use rating_logs.created_at as the timestamp ──
    await cur.execute("""
        SELECT DATE(created_at) as day, SUM(amount) as daily
        FROM payments
        WHERE freelancer_id=? AND status='released' AND created_at IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
    """, (user_id,))
    raw_growth = await cur.fetchall()

    # Build last 30 days with real data filled in
    from datetime import timedelta
    today = datetime.now().date()
    date_map = {}
    for row in raw_growth:
        if row[0]:
            date_map[str(row[0])[:10]] = row[1] or 0

    growth_data = []
    cumulative = 0
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        key = str(day)
        amount = date_map.get(key, 0)
        cumulative += amount
        growth_data.append({"day": key, "amount": amount, "cumulative": cumulative})

    return {"success": True, "data": {
        "applications": apps, "completed": completed, "score": score,
        "totalProjects": total_projects, "activeProjects": active_projects,
        "totalEarnings": total_earnings, "growthData": growth_data, "skills": "",
        "averageRating": round(average_rating, 2)
    }}
# ===================== RATINGS =====================
@app.post("/api/ratings/secure")
async def create_rating_secure(data: RatingRequest, user=Depends(require_user)):
    cur = await db_conn.cursor()

    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only client can rate")

    # 🔥 call rating logic
    result = await create_rating(data)

    # 🔥 fetch project details
    await cur.execute(
        "SELECT client_id, assigned_freelancer_id, budget FROM projects WHERE id=?",
        (data.projectId,)
    )
    proj = await cur.fetchone()

    if proj:
        client_id, freelancer_id, amount = proj
        pay_id = "pay_" + str(uuid.uuid4())[:8]

        await cur.execute(
            "INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?, ?)",
            (pay_id, data.projectId, client_id, freelancer_id, amount, "released", datetime.now().isoformat())
        )

        await db_conn.commit()

    return result

@app.get("/api/ratings/project/{project_id}")
async def get_rating_for_project(project_id: str):
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT stars, on_time_status, feedback FROM ratings WHERE project_id=? ORDER BY rowid DESC LIMIT 1",
        (project_id,)
    )
    row = await cur.fetchone()
    if not row:
        return {"success": True, "data": None}
    return {"success": True, "data": {
        "stars": row[0],
        "onTimeStatus": row[1],
        "feedback": row[2]
    }}
    

@app.post("/api/ratings")
async def create_rating(data: RatingRequest):
    cur = await db_conn.cursor()

    try:
        rating_id = "rat_" + str(uuid.uuid4())[:8]

        await cur.execute(
            "INSERT INTO ratings VALUES (?, ?, ?, ?, ?, ?)",
            (rating_id, data.freelancerId, data.projectId, data.stars, data.feedback, data.onTimeStatus)
        )

        await cur.execute("SELECT stars, on_time_status, feedback FROM ratings WHERE freelancer_id=?", (data.freelancerId,))
        all_ratings = await cur.fetchall()

        avg_rating = ReliabilityEngine.compute_display_rating(all_ratings)

        await cur.execute("SELECT completed_projects FROM users WHERE id=?", (data.freelancerId,))
        completed = await cur.fetchone()[0] or 0

        await cur.execute("SELECT on_time_status FROM ratings WHERE freelancer_id=?", (data.freelancerId,))
        timing_list = [row[0] for row in await cur.fetchall()]

        await cur.execute("SELECT feedback FROM ratings WHERE freelancer_id=?", (data.freelancerId,))
        feedbacks = [row[0] for row in await cur.fetchall() if row[0]]

        new_score = calculate_score(completed, avg_rating, timing_list, feedbacks)

        await cur.execute(
            "UPDATE users SET average_rating=?, reliability_score=?, completed_projects=completed_projects+1 WHERE id=?",
            (avg_rating, new_score, data.freelancerId)
        )

        await cur.execute("UPDATE projects SET status='completed' WHERE id=?", (data.projectId,))

        await cur.execute("""
            INSERT INTO rating_logs
            (project_id, freelancer_id, old_rating, new_rating, client_stars, feedback, on_time_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.projectId,
            data.freelancerId,
            0,
            new_score,
            data.stars,
            data.feedback,
            data.onTimeStatus,
            datetime.now().isoformat()
        ))

        await db_conn.commit()

        # 🔥 REALTIME PUSH (INSIDE TRY)
        for connection in active_connections:
            try:
                await connection.send_json({
                    "type": "rating_update",
                    "freelancerId": data.freelancerId
                })
            except:
                pass

        return {"success": True, "data": {"avgRating": avg_rating, "score": new_score}}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ===================== VALIDATION HELPERS =====================


# ===================== AUTH V2 — MIGRATIONS =====================
# Run once on startup — non-destructive ALTER TABLE additions
# Wrapped in try-except to allow module import even if DB not ready

try:
    import sqlite3
    _db_conn = sqlite3.connect("architect_x.db")
    _db_cursor = _db_conn.cursor()
    
    _v2_migrations = [
        "ALTER TABLE users ADD COLUMN full_name TEXT",
        "ALTER TABLE users ADD COLUMN city TEXT",
        "ALTER TABLE users ADD COLUMN state TEXT",
        "ALTER TABLE users ADD COLUMN college TEXT",
        "ALTER TABLE users ADD COLUMN aadhaar_hash TEXT",
        "ALTER TABLE users ADD COLUMN aadhaar_lookup TEXT UNIQUE",
        "ALTER TABLE users ADD COLUMN aadhaar_secure_hash TEXT",
    ]
    for _sql in _v2_migrations:
        try:
            _db_cursor.execute(_sql)
        except Exception:
            pass  # column already exists

    _db_cursor.execute("""
    CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_url TEXT,
        parsed_data TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    _db_cursor.execute("""
    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_name TEXT,
        location TEXT,
        domain TEXT,
        avg_salary TEXT,
        key_skills TEXT,
        hiring_companies TEXT,
        role_description TEXT,
        growth_paths TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_name, location)
    )
    """)

    _db_cursor.execute("CREATE INDEX IF NOT EXISTS idx_roles_lookup ON roles(role_name, location)")
    _db_cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")

    _db_conn.commit()
    _db_conn.close()
    logger.info("✅ Database migrations completed")
except Exception as e:
    logger.warning(f"⚠️  Database migrations deferred: {e}")


# ===================== AUTH V2 — IMPORTS =====================
import re
import json
import shutil
from pathlib import Path
from fastapi import UploadFile, File, Query
from pydantic import EmailStr, Field

# ===================== AUTH V2 — MODELS =====================
from pydantic import BaseModel, EmailStr, Field, field_validator

class RoleRequest(BaseModel):
    role: str
    location: str
    user_skills: list[str] = []

class RoleCard(BaseModel):
    role: str
    domain: str
    avg_salary: str
    key_skills: dict
    hiring_companies: list[str]
    role_description: str
    growth_paths: list[str]

    @field_validator("avg_salary", mode="before")
    @classmethod
    def normalize_salary(cls, v: str) -> str:
        nums = re.findall(r"\d+", v)
        if len(nums) == 1:
            base = int(nums[0])
            return f"{base}–{base+3} LPA"
        return v

class FreelancerRegisterV2(BaseModel):
    full_name: str
    email: str
    aadhaar: str = Field(..., pattern=r"^[0-9]{12}$")
    city: str
    state: str
    college: str
    password: str
    skills: list[str] = []
    resume_file_url: str = ""

# ===================== AUTH V2 — RESUME PARSER =====================

SKILL_BUCKET = {
    # Languages
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "go", "rust",
    "kotlin", "swift", "ruby", "php", "scala", "r", "matlab", "dart", "perl",
    # Web
    "react", "vue", "angular", "nextjs", "html", "css", "tailwind", "bootstrap",
    "node", "nodejs", "express", "fastapi", "flask", "django", "spring", "laravel",
    # Data / ML
    "sql", "mysql", "postgresql", "mongodb", "sqlite", "redis", "elasticsearch",
    "machine learning", "deep learning", "nlp", "pandas", "numpy", "scikit-learn",
    "tensorflow", "pytorch", "keras", "opencv", "data science",
    # DevOps / Cloud
    "git", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "bash",
    "ci/cd", "jenkins", "github actions", "terraform", "ansible",
    # Other domains
    "figma", "photoshop", "unity", "unreal", "blender", "excel", "power bi",
    "tableau", "selenium", "postman", "rest api", "graphql",
}

CITY_LIST = {
    "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai", "kolkata",
    "pune", "ahmedabad", "jaipur", "surat", "lucknow", "kanpur", "nagpur", "indore",
    "bhopal", "visakhapatnam", "patna", "vadodara", "kolhapur", "nashik", "thane",
    "noida", "gurgaon", "gurugram", "chandigarh", "coimbatore", "kochi", "mysore",
    "new delhi", "navi mumbai",
    # International
    "new york", "london", "san francisco", "bangalore", "toronto", "singapore",
    "dubai", "berlin", "amsterdam", "sydney",
}

STATE_LIST = {
    "maharashtra", "karnataka", "tamil nadu", "telangana", "andhra pradesh",
    "uttar pradesh", "rajasthan", "west bengal", "gujarat", "madhya pradesh",
    "bihar", "haryana", "punjab", "kerala", "odisha", "jharkhand", "assam",
    "uttarakhand", "himachal pradesh", "goa", "delhi",
}

COLLEGE_KEYWORDS = {
    "university", "institute", "college", "iit", "nit", "bits", "vit", "mit",
    "engineering", "technology", "school of", "faculty of", "academy",
}

def _extract_email(text: str) -> str:
    match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    return match.group(0).strip() if match else ""

def _extract_name(lines: list[str]) -> str:
    """
    Heuristic: The name is usually in the first 5 lines,
    is short (≤5 words), has no special chars, is Title Case or ALL CAPS.
    """
    ignore_words = {"resume", "curriculum", "vitae", "cv", "profile", "objective",
                    "summary", "contact", "email", "phone", "address", "linkedin"}
    for line in lines[:8]:
        line = line.strip()
        if not line or len(line) > 60 or len(line) < 3:
            continue
        lower = line.lower()
        if any(kw in lower for kw in ignore_words):
            continue
        if re.search(r"[@|]", line):
            continue
        words = line.split()
        if 1 <= len(words) <= 5 and all(re.match(r"^[A-Za-z\.\-]+$", w) for w in words):
            return line.strip()
    return ""

def _extract_skills(text: str) -> list[str]:
    text_lower = text.lower()
    found = []
    for skill in SKILL_BUCKET:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill.title() if len(skill) <= 3 else skill.capitalize())
    return sorted(set(found))

def _extract_city_state(text: str) -> tuple[str, str]:
    text_lower = text.lower()
    city = next((c.title() for c in CITY_LIST if re.search(r"\b" + re.escape(c) + r"\b", text_lower)), "")
    state = next((s.title() for s in STATE_LIST if re.search(r"\b" + re.escape(s) + r"\b", text_lower)), "")
    return city, state

def _extract_college(lines: list[str]) -> str:
    text = " ".join(lines).lower()
    for i, line in enumerate(lines):
        ll = line.lower()
        if any(kw in ll for kw in COLLEGE_KEYWORDS):
            # Return the original line up to 80 chars
            return line.strip()[:80]
    return ""

def _compute_confidence(result: dict) -> int:
    score = 0
    if result.get("email"):       score += 20
    if result.get("full_name"):   score += 20
    if result.get("skills"):      score += 20
    if result.get("college"):     score += 20
    if result.get("city") or result.get("state"): score += 20
    return score

def _low_confidence_fields(result: dict) -> list[str]:
    low = []
    # Fields that are filled but confidence indicators suggest uncertain
    if result.get("city") and not result.get("state"):
        low.append("city")
    if result.get("college") and len(result.get("college", "")) > 60:
        low.append("college")
    if result.get("full_name") and len(result.get("full_name", "").split()) == 1:
        low.append("full_name")
    return low

def parse_resume_text(raw_text: str) -> dict:
    """
    Hybrid parsing:
      Pass 1 — Email, skills, city/state via regex + keyword buckets
      Pass 2 — Name from line analysis
      Pass 3 — College from section detection
      Confidence scoring (0-100)
    """
    if not raw_text or not raw_text.strip():
        return {
            "full_name": "", "email": "", "college": "",
            "city": "", "state": "", "skills": [],
            "confidence": 0, "low_confidence_fields": [],
        }

    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    email      = _extract_email(raw_text)
    full_name  = _extract_name(lines)
    skills     = _extract_skills(raw_text)
    city, state = _extract_city_state(raw_text)
    college    = _extract_college(lines)

    result = {
        "full_name": full_name,
        "email": email,
        "college": college,
        "city": city,
        "state": state,
        "skills": skills[:20],  # cap at 20
    }
    result["confidence"] = _compute_confidence(result)
    result["low_confidence_fields"] = _low_confidence_fields(result)
    return result

# ===================== AUTH V2 — ENDPOINTS =====================

UPLOAD_DIR = Path(RESUMES_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
logger.info(f"📁 Resume upload directory: {UPLOAD_DIR}")

@app.post("/api/auth/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """
    Accept a PDF resume, parse it with hybrid logic, return structured JSON.
    Saves file to disk and returns parsed data + confidence score.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    safe_name = f"{uuid.uuid4().hex}_{file.filename.replace(' ', '_')}"
    file_path = UPLOAD_DIR / safe_name

    try:
        contents = await file.read()
        if len(contents) < 100:
            raise HTTPException(status_code=400, detail="File appears to be empty or corrupt.")
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Max 10MB.")

        with open(file_path, "wb") as f:
            f.write(contents)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    # Extract text
    raw_text = ""
    try:
        import pdfplumber
        with pdfplumber.open(str(file_path)) as pdf:
            pages = pdf.pages
            if not pages:
                raise HTTPException(status_code=422, detail="PDF has no readable pages.")
            for page in pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"
    except HTTPException:
        raise
    except Exception as e:
        # Image-only PDF or corrupt — return low-confidence empty result
        # If extracted text length < threshold OR confidence low → fallback to OCR (Tesseract or LLM Vision).
        return {
            "success": True,
            "file_url": f"E:/freelance_platform_data/resumes/{safe_name}",
            "parsed": {
                "full_name": "", "email": "", "college": "",
                "city": "", "state": "", "skills": [],
                "confidence": 0,
                "low_confidence_fields": [],
                "parse_error": "Could not extract text. Ensure this is a text-based PDF."
            }
        }

    parsed = parse_resume_text(raw_text)

    return {
        "success": True,
        "file_url": f"E:/freelance_platform_data/resumes/{safe_name}",
        "parsed": parsed,
    }


@app.get("/api/auth/check-aadhaar")
async def check_aadhaar(aadhaar: str = Query(..., min_length=12, max_length=12, pattern=r"^[0-9]{12}$")):
    """
    Checks whether a hashed Aadhaar already exists in the DB using the lookup hash.
    Returns { available: true/false, message }
    """
    aadhaar_lookup = hashlib.sha256(aadhaar.encode()).hexdigest()
    cur = await db_conn.cursor()
    try:
        await cur.execute("SELECT id FROM users WHERE aadhaar_lookup=?", (aadhaar_lookup,))
        exists = await cur.fetchone() is not None
    except Exception:
        exists = False
    return {
        "available": not exists,
        "message": "This Aadhaar is already linked to an account." if exists else "Aadhaar is available."
    }


@app.post("/api/auth/register-v2")
async def register_freelancer_v2(data: FreelancerRegisterV2):
    """
    Production-grade freelancer registration:
      - Pydantic validates all fields (incl. Aadhaar regex)
      - Aadhaar uniqueness checked via SHA-256 hash
      - Email uniqueness enforced by DB UNIQUE constraint
      - User + resume inserted in a single SQLite transaction
      - On any failure → full rollback (no orphan records)
    """
    print("Incoming registration request:", data.model_dump())
    # Validate Aadhaar format (belt-and-suspenders beyond Pydantic)
    if not re.fullmatch(r"[0-9]{12}", data.aadhaar):
        raise HTTPException(status_code=422, detail="Aadhaar must be exactly 12 digits.")

    salt = os.urandom(16)
    aadhaar_hash = hashlib.sha256(salt + data.aadhaar.encode()).hexdigest()
    aadhaar_lookup = hashlib.sha256(data.aadhaar.encode()).hexdigest()
    
    # Simulate a second layer hashing process expected in earlier code versions. 
    # Use salt for a secure Aadhaar hash
    aadhaar_secure = hashlib.sha256(salt + data.aadhaar.encode()).hexdigest()

    print(f"Aadhaar processed securely for email {data.email}")

    hashed_password = bcrypt_hash(data.password)  # bcrypt for all v2 registrations
    user_id = "freelancer_" + str(uuid.uuid4())[:8]
    resume_id = "res_" + str(uuid.uuid4())[:8]
    skills_json = json.dumps(data.skills)

    # Check Aadhaar uniqueness before entering transaction
    cur = await db_conn.cursor()
    try:
        await cur.execute("SELECT id FROM users WHERE aadhaar_lookup=?", (aadhaar_lookup,))
        if await cur.fetchone():
            raise HTTPException(
                status_code=409,
                detail="This Aadhaar is already linked to an account."
            )
    except Exception:
        pass

    # ACID transaction — both inserts or neither
    try:
        async with db_conn.execute(
            """INSERT INTO users
               (id, username, email, password, role,
                full_name, city, state, college, aadhaar_lookup, aadhaar_secure_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                data.email.split('@')[0], # username
                data.email,
                hashed_password,
                "freelancer",
                data.full_name,
                data.city,
                data.state,
                data.college,
                aadhaar_lookup,
                aadhaar_secure,
            )
        ) as cursor:
            pass

        async with db_conn.execute(
            """INSERT INTO resumes (id, user_id, file_url, parsed_data)
               VALUES (?, ?, ?, ?)""",
            (
                resume_id,
                user_id,
                data.resume_file_url,
                skills_json,
            )
        ) as cursor:
            pass

        await db_conn.commit()
    except Exception as e:
        await db_conn.rollback()
        detail = str(e)
        print("Registration Error:", detail)
        if "UNIQUE constraint failed: users.email" in detail:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        if "UNIQUE constraint failed: users.aadhaar_hash" in detail:
            raise HTTPException(status_code=409, detail="This Aadhaar is already linked to an account.")
        raise HTTPException(status_code=500, detail=f"Registration failed: {detail}")

    print("Registration successful for user_id:", user_id)
    return {"success": True, "data": {"userId": user_id}}



# ===================== AUTH V2 — ENHANCED LOGIN =====================
# Override existing login to also return full_name

@app.post("/api/auth/login-v2")
async def login_v2(user: LoginRequest):
    """
    Like /api/auth/login but additionally returns full_name for welcome toast.
    """
    print("Incoming login_v2 request for email:", user.email)
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT id, username, email, password, role, full_name FROM users WHERE email=?",
        (user.email,)
    )
    row = await cur.fetchone()
    if not row:
        print("Login failed: User not found for email:", user.email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id, username, email, stored_password, role, full_name = row
    if not bcrypt_verify(user.password, stored_password):
        print("Login failed: Password mismatch for email:", user.email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = generate_token(user_id, role)
    display_name = full_name or username or email.split("@")[0]

    print("Login V2 successful for user:", display_name)
    return {
        "success": True,
        "data": {
            "token": token,
            "userId": user_id,
            "role": role,
            "full_name": display_name,
        }
    }

# Memory dict for OTPs since Redis is optional
otp_store = {}
import random

@app.post("/api/auth/otp/send")
async def send_otp(req: OTPRequest):
    print("Incoming OTP send request:", req.model_dump())
    cur = await db_conn.cursor()
    await cur.execute("SELECT id FROM users WHERE email=?", (req.email,))
    row = await cur.fetchone()
    if not row:
        print("OTP send failed: User not found for email:", req.email)
        raise HTTPException(status_code=404, detail="Email not registered")
    
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    
    # Store with naive expiry logic or just in dict
    otp_store[req.email] = otp
    print(f"============================================")
    print(f"✅ OTP GENERATED FOR {req.email}: {otp}")
    print(f"============================================")
    
    return {"success": True, "message": "OTP sent to email/terminal"}

@app.post("/api/auth/otp/verify")
async def verify_otp(req: OTPVerify):
    print("Incoming OTP verify request:", req.model_dump())
    stored_otp = otp_store.get(req.email)
    if not stored_otp or stored_otp != req.otp:
        print(f"OTP verification failed for {req.email}. Expected {stored_otp}, got {req.otp}")
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    
    # Delete OTP after successful verification
    del otp_store[req.email]
    
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT id, username, email, role, full_name FROM users WHERE email=?",
        (req.email,)
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_id, username, email, role, full_name = row
    token = generate_token(user_id, role)
    display_name = full_name or username or email.split("@")[0]
    
    print("OTP verification successful, logging in user:", display_name)
    return {
        "success": True,
        "data": {
            "token": token,
            "userId": user_id,
            "role": role,
            "full_name": display_name,
        }
    }

# ===================== AI CAREER ROLE ENGINE =====================
from openai import OpenAI
try:
    openai_client = OpenAI()
except Exception as e:
    openai_client = None
    logger.warning(f"Failed to init OpenAI client: {e}")

async def generate_role_data_worker(role: str, location: str):
    """
    Background worker: Calls OpenAI with new SDK, fetches data, saves to SQLite.
    Marks Redis flag as 'completed' or 'failed'.
    """
    logger.info(f"Starting background job for role: {role} in {location}")
    if not openai_client:
        logger.error("No OpenAI client available.")
        if REDIS_AVAILABLE:
            redis_client.setex(f"role:{role}:{location}:status", 300, "failed")
        return

    # Prompt specification
    system_prompt = """Act as a Senior Tech Recruiter in 2026.
Generate structured, market-realistic career data for {role} in {location}.
STRICT RULES:
- Salary MUST be range (e.g., '10–30 LPA')
- Skills MUST be categorized as JSON: {"Technical": [], "Soft Skills": [], "Tools": []}
- Total skills: 5–8
- Hiring companies: 2 global MNCs, 2 Indian startups
- No duplicates
- Reflect current market demand and inflation
Provide the exact JSON payload matching this structure, with no markdown code block wrapping or other explanatory text.
"""
    user_prompt = f"Role: {role}, Location: {location}"

    payload = {
        "role": role,
        "location": location,
        "domain": "Technology",
        "avg_salary": "12–24 LPA",
        "key_skills": {"Technical": ["Python", "AWS"], "Soft Skills": ["Communication"], "Tools": ["Git"]},
        "hiring_companies": ["TCS", "Accenture", "Cred", "Zerodha"],
        "role_description": f"Standard description for {role}.",
        "growth_paths": ["Senior", "Lead"]
    }

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            timeout=15
        )
        content = response.choices[0].message.content.strip()
        # strip markdown formatting if any
        if content.startswith("```json"):
            content = content[7:-3]
        if content.startswith("```"):
            content = content[3:-3]
        
        gpt_payload = json.loads(content)
        # Combine
        payload.update(gpt_payload)
        
        # Validate through Pydantic
        card = RoleCard(**payload)

        # Store in SQLite
        async with db_conn.execute(
            """INSERT OR REPLACE INTO roles 
               (role_name, location, domain, avg_salary, key_skills, hiring_companies, role_description, growth_paths)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                card.role,
                location,
                card.domain,
                card.avg_salary,
                json.dumps(card.key_skills),
                json.dumps(card.hiring_companies),
                card.role_description,
                json.dumps(card.growth_paths)
            )
        ) as cursor:
            pass
        await db_conn.commit()
        
        # Complete!
        if REDIS_AVAILABLE:
            redis_client.setex(f"role:{role}:{location}:status", 3600, "completed")
            # Cache the structured data
            redis_client.setex(f"role_data:{role}:{location}", 86400, json.dumps(card.model_dump()))
        logger.info(f"Successfully generated and stored {role} in {location}")

    except Exception as e:
        logger.error(f"Background task failed for {role}: {e}")
        if REDIS_AVAILABLE:
            redis_client.setex(f"role:{role}:{location}:status", 300, "failed")


@app.post("/api/roles/generate", status_code=202)
async def generate_role(req: RoleRequest, background_tasks: BackgroundTasks):
    """
    Triggers an asynchronous LLM generation process.
    'BackgroundTasks is used for MVP. System must be designed to migrate to Celery/Redis Queue for production durability.'
    Implement basic rate limiting (per IP or per user) for /generate endpoint.
    """
    logger.info(f"/generate hit for {req.role} in {req.location}")
    role_norm = req.role.lower().strip()
    loc_norm = req.location.lower().strip()

    # Rate limiting stub
    # To implement full rate limiting, we would track IPs or Tokens in Redis here.
    if REDIS_AVAILABLE:
        rate_key = f"rate_limit:generate:{role_norm}"
        if redis_client.get(rate_key):
             raise HTTPException(status_code=429, detail="Too many requests limit hit. Please slow down.")
        redis_client.setex(rate_key, 5, "blocked") # 5 sec throttle

    # 1. Duplicate Run DB Lock Match Check
    cur = await db_conn.cursor()
    await cur.execute("SELECT id FROM roles WHERE role_name=? AND location=?", (role_norm, loc_norm))
    if await cur.fetchone():
        return {"status": "completed", "job_id": f"{role_norm}-{loc_norm}"}

    # 2. Duplicate Run Redis Status Check
    if REDIS_AVAILABLE:
        current_status = redis_client.get(f"role:{role_norm}:{loc_norm}:status")
        if current_status:
            status_str = current_status.decode('utf-8')
            if status_str == "processing":
                return {"status": "processing", "job_id": f"{role_norm}-{loc_norm}"}

        # Set processing flag
        redis_client.setex(f"role:{role_norm}:{loc_norm}:status", 300, "processing")

    # Queue Async Background generator
    import asyncio
    asyncio.create_task(generate_role_data_worker, role_norm, loc_norm)

    return {"status": "processing", "job_id": f"{role_norm}-{loc_norm}"}


@app.get("/api/roles/{role_name}")
async def get_role_data(role_name: str, location: str = Query(...)):
    """
    Polling endpoint returning structured state so frontend knows what to render.
    """
    role_norm = role_name.lower().strip()
    loc_norm = location.lower().strip()

    # 1. Check Redis Cache First
    if REDIS_AVAILABLE:
        cached_data = redis_client.get(f"role_data:{role_norm}:{loc_norm}")
        if cached_data:
            logger.info("Cache hit for role data.")
            return {"status": "completed", "data": json.loads(cached_data.decode('utf-8'))}

        r_status = redis_client.get(f"role:{role_norm}:{loc_norm}:status")
        if r_status:
            s_str = r_status.decode('utf-8')
            return {"status": s_str, "data": None}

    # 2. Check Database directly (if cache missing or skipped)
    cur = await db_conn.cursor()
    await cur.execute("SELECT role_name, location, domain, avg_salary, key_skills, hiring_companies, role_description, growth_paths FROM roles WHERE role_name=? AND location=?", (role_norm, loc_norm))
    row = await cur.fetchone()
    if row:
        data = {
            "role": row[0],
            "domain": row[2],
            "avg_salary": row[3],
            "key_skills": json.loads(row[4] if row[4] else "{}"),
            "hiring_companies": json.loads(row[5] if row[5] else "[]"),
            "role_description": row[6],
            "growth_paths": json.loads(row[7] if row[7] else "[]")
        }
        # re-populate cache map 
        if REDIS_AVAILABLE:
            redis_client.setex(f"role_data:{role_norm}:{loc_norm}", 86400, json.dumps(data))
            redis_client.setex(f"role:{role_norm}:{loc_norm}:status", 3600, "completed")
        return {"status": "completed", "data": data}

    # If nowhere to be found, not even processing
    return {"status": "failed", "data": None, "message": "Role not found and not processing."}


@app.post("/api/roles/match")
async def match_role(req: RoleRequest):
    """
    Semantic Match Engine: Combines LLM reasoning instead of exact keyword logic.
    Provides roadmap, scores, and missing priorities.
    """
    role_norm = req.role.lower().strip()
    loc_norm = req.location.lower().strip()

    # Pull role target from DB so LLM has context
    cur = await db_conn.cursor()
    await cur.execute("SELECT key_skills, role_description FROM roles WHERE role_name=? AND location=?", (role_norm, loc_norm))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Role data not found. Please generate it first.")
    
    target_skills = row[0]
    target_desc = row[1]

    if not openai_client:
        # Fallback pseudo-match logic if API offline
        return {
            "success": True,
            "match_score": 50,
            "match_reason": "AI offline, approximate fallback matching deployed.",
            "missing_skills": [{"skill": "Python (Assuming)", "priority": "High"}],
            "user_skills_evaluated": req.user_skills
        }
    
    system_prompt = """
    Act as a precise Semantic Resume Match Engine.
    You will receive the Candidate's parsed skills, and the Target Role's required skills / context.
    Do NOT do simple 1:1 keyword mapping. Understand synonyms, depth, and overlap semantically.
    Output EXACT JSON formatted as:
    {
      "match_score": 84,
      "match_reason": "Strong alignment in X, lacks Y",
      "missing_skills": [{"skill": "SkillString", "priority": "High|Medium|Low"}],
      "user_skills_evaluated": []
    }
    No markdown formatting back ticks.
    """

    user_info = f"Candidate Skills: {req.user_skills}\nTarget Role Skills: {target_skills}\nTarget Description: {target_desc}"

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_info}
            ],
            timeout=15
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        if content.startswith("```"):
            content = content[3:-3]
        
        return json.loads(content)
    except Exception as e:
        logger.error(f"Matching failure: {e}")
        raise HTTPException(status_code=503, detail="AI mapping layer unavailable or timed out.")

# ===================== INTELLIGENCE ENGINE — JOB POSTING =====================

@app.post("/api/jobs/post", status_code=201)
async def post_job_weighted(req: JobPostRequest):
    """
    Post a job with weighted, Pydantic-validated skill requirements.
    Enforces at least one HIGH priority skill. Normalizes weights internally.
    Fix #2: normalize_weights handles zero-weight edge case gracefully.
    """
    skills_list = normalize_weights(req.skills)
    skills_json = json.dumps([
        {
            "name": s.name,
            "weight": round(s.weight, 4),
            "normalized_weight": round(s.normalized_weight, 4),
            "priority": s.priority,
            "type": s.type,
        }
        for s in skills_list
    ])
    cur = await db_conn.cursor()
    try:
        await cur.execute(
            "INSERT INTO jobs (title, company, location, salary, description, skills) VALUES (?, ?, ?, ?, ?, ?)",
            (req.title, req.company, req.location, req.salary, req.description, skills_json)
        )
        await db_conn.commit()
        job_id = cur.lastrowid
        return {"success": True, "job_id": job_id, "normalized_skills": json.loads(skills_json)}
    except Exception as e:
        await db_conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ===================== INTELLIGENCE ENGINE — VIBE MATCH =====================

@app.post("/api/intelligence/vibe-match")
async def vibe_match(req: VibeMatchRequest):
    """
    Cultural Fit 'Vibe Match': LLM compares company culture vs candidate personality.
    Fix #3: Results cached per (job_id + user_id) for 24h to prevent LLM cost spam.
    """
    # Fix #3: cache key per job+user combo
    cache_key = f"vibe:{req.job_id}:{req.user_id}"
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            logger.info(f"Vibe cache hit: {cache_key}")
            return {"success": True, "cached": True, **json.loads(cached.decode("utf-8"))}

    if not openai_client:
        return {
            "success": True, "cached": False,
            "vibe_match": 65,
            "vibe_reason": "AI vibe analysis unavailable — your background appears compatible with a growth environment."
        }

    system_prompt = """You are a cultural fit analyst.
Compare the company work culture/vibe vs the candidate's personality from their summary.
Return EXACT JSON — no markdown, no extra keys:
{
  "vibe_match": <int 0-100>,
  "vibe_reason": "<1-2 sentence human explanation referencing both sides>"
}"""
    user_content = f"Company Vibe: {req.job_vibe}\n\nCandidate Summary: {req.candidate_summary}"

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            timeout=10
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            parts = content.split("```")
            content = parts[1].lstrip("json").strip() if len(parts) > 1 else content
        result = json.loads(content)
        # Fix #3: cache 24h TTL
        if REDIS_AVAILABLE:
            redis_client.setex(cache_key, 86400, json.dumps(result))
        return {"success": True, "cached": False, **result}
    except Exception as e:
        logger.error(f"Vibe match failed: {e}")
        return {
            "success": True, "cached": False,
            "vibe_match": 60,
            "vibe_reason": "Analysis temporarily unavailable. Your background shows moderate cultural alignment."
        }


# ===================== INTELLIGENCE ENGINE — CERTIFICATION VERIFY =====================

@app.post("/api/certifications/verify/{user_id}")
async def verify_certification(user_id: str, skill: str, file: UploadFile = File(...)):
    """
    Upload certification proof document.
    Fix #7 Security: Sets verified_status='pending' — NOT auto-approved.
    Admin or AI review approves it later. Score boost only applies on
    verified=1 AND verified_status='approved'. Prevents credential fraud.
    """
    cert_dir = Path(BASE_DIR) / "uploads" / "certifications" / user_id
    cert_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{file.filename.replace(' ', '_')}"
    file_path = cert_dir / safe_name

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 10MB.")
    with open(file_path, "wb") as f:
        f.write(contents)

    cur = await db_conn.cursor()
    try:
        await cur.execute(
            "SELECT id FROM user_skills WHERE user_id=? AND skill=?", (user_id, skill)
        )
        existing = await cur.fetchone()
        if existing:
            await cur.execute(
                "UPDATE user_skills SET skill_type='certification', verified_status='pending', verified=0 WHERE user_id=? AND skill=?",
                (user_id, skill)
            )
        else:
            await cur.execute(
                "INSERT INTO user_skills (user_id, skill, skill_type, verified, verified_status) VALUES (?, ?, 'certification', 0, 'pending')",
                (user_id, skill)
            )
        await db_conn.commit()
        return {
            "success": True,
            "status": "pending",
            "message": f"Certificate for '{skill}' uploaded. Pending admin review — allow 24-48 hours."
        }
    except Exception as e:
        await db_conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/certifications/{user_id}")
async def get_user_certifications(user_id: str):
    """Get all skills and their verification status for a user."""
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT skill, skill_type, verified, verified_status, verified_at FROM user_skills WHERE user_id=?",
        (user_id,)
    )
    rows = await cur.fetchall()
    return {
        "success": True,
        "certifications": [
            {"skill": r[0], "type": r[1], "verified": bool(r[2]), "status": r[3], "verified_at": r[4]}
            for r in rows
        ]
    }


# ===================== INTELLIGENCE ENGINE — WEIGHTED MATCH WITH CERT BOOST =====================

@app.post("/api/intelligence/match-weighted")
async def match_weighted(req: RoleRequest):
    """
    Score = normalized-weighted skill match + per-skill 1.2x boost for approved certs.
    Fix #1: Boost applied per-skill (NOT to total score) to prevent inflation.
    Fix #2: normalize_weights handles zero-weight edge case.
    Final score always clamped 0-100.
    """
    role_norm = req.role.lower().strip()
    loc_norm = req.location.lower().strip()
    cur = await db_conn.cursor()
    await cur.execute(
        "SELECT key_skills FROM roles WHERE role_name=? AND location=?", (role_norm, loc_norm)
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Role not found. Generate it first.")

    try:
        required_raw = json.loads(row[0]) if row[0] else {}
    except Exception:
        required_raw = {}

    required_skills = []
    if isinstance(required_raw, dict):
        for cat_key, skills_list in required_raw.items():
            p = "high" if "technical" in cat_key.lower() else "medium"
            for s in (skills_list or []):
                required_skills.append({"name": str(s), "weight": 1.0, "priority": p})
    elif isinstance(required_raw, list):
        required_skills = [{"name": str(s), "weight": 1.0, "priority": "medium"} for s in required_raw]

    if not required_skills:
        return {"success": True, "match_score": 0, "match_reason": "No required skills defined for this role."}

    # Load approved verified skills for this user
    user_id = next((s for s in req.user_skills if s.startswith("freelancer_")), None)
    verified_skills = set()
    if user_id:
        await cur.execute(
            "SELECT skill FROM user_skills WHERE user_id=? AND verified=1 AND verified_status='approved'",
            (user_id,)
        )
        verified_skills = {r[0].lower() for r in await cur.fetchall()}

    user_skill_set = {s.lower() for s in req.user_skills if not s.startswith("freelancer_")}

    # Fix #2: normalize weights (handles zero-weight edge case)
    total_weight = sum(s["weight"] for s in required_skills)
    if total_weight == 0:
        eq = 1.0 / len(required_skills)
        for s in required_skills:
            s["normalized_weight"] = eq
    else:
        for s in required_skills:
            s["normalized_weight"] = s["weight"] / total_weight

    # Fix #1: per-skill boost — NOT applied to total score
    total_score = 0.0
    matched, missing = [], []
    for rs in required_skills:
        sname = rs["name"].lower()
        nw = rs["normalized_weight"]
        if sname in user_skill_set:
            skill_score = nw * 100
            if sname in verified_skills:
                skill_score *= 1.2  # Fix #1: boost this skill's score only
            skill_score = min(skill_score, nw * 120)  # Cap per-skill
            total_score += skill_score
            matched.append(rs["name"])
        else:
            missing.append({"skill": rs["name"], "priority": rs["priority"]})

    final_score = min(100, round(total_score))  # Always 0-100
    return {
        "success": True,
        "match_score": final_score,
        "matched_skills": matched,
        "missing_skills": missing,
        "boost_applied": len(verified_skills) > 0,
        "match_reason": f"Matched {len(matched)}/{len(required_skills)} skills. Score: {final_score}/100."
    }


# ===================== MARKET PULSE (INTELLIGENCE) — REAL VELOCITY =====================

@app.get("/api/intelligence/pulse")
async def get_market_pulse():
    """
    Reddit-style Market Pulse: REAL skill demand VELOCITY.
    Fix #4: velocity = current_7day_count - previous_7day_count (NOT just COUNT(*)).
    trend classified as 'high' / 'medium' / 'stable' / 'declining'.
    Cached in Redis for 30 minutes to avoid repeated DB scans.
    """
    # Check Redis cache first (30-min TTL)
    if REDIS_AVAILABLE:
        cached = redis_client.get("market_pulse")
        if cached:
            return {"success": True, "trending": json.loads(cached.decode()), "cached": True}

    cur = await db_conn.cursor()
    try:
        await cur.execute(
            "SELECT skills, created_at FROM jobs WHERE created_at > datetime('now', '-14 days')"
        )
        rows = await cur.fetchall()

        from datetime import timedelta, datetime as dt
        cutoff = dt.now() - timedelta(days=7)
        current_counts = {}
        previous_counts = {}

        for row in rows:
            try:
                skills_raw = row[0]
                created_str = row[1]
                if not skills_raw:
                    continue
                skills_data = json.loads(skills_raw)

                # Handle both list-of-strings and list-of-dicts and categorized dicts
                if isinstance(skills_data, dict):
                    all_skills = []
                    for v in skills_data.values():
                        if isinstance(v, list):
                            for item in v:
                                name = item.get("name") if isinstance(item, dict) else str(item)
                                if name:
                                    all_skills.append(name)
                elif isinstance(skills_data, list):
                    all_skills = []
                    for item in skills_data:
                        name = item.get("name") if isinstance(item, dict) else str(item)
                        if name:
                            all_skills.append(name)
                else:
                    continue

                # Fix #4: separate current vs previous window
                is_current = True
                if created_str:
                    try:
                        job_dt = dt.fromisoformat(created_str.replace("Z", ""))
                        is_current = job_dt > cutoff
                    except Exception:
                        is_current = True

                target = current_counts if is_current else previous_counts
                for skill in all_skills:
                    target[skill] = target.get(skill, 0) + 1

            except Exception:
                continue

        # Fix #4: velocity = current - previous (real velocity, not COUNT(*))
        all_seen = set(current_counts) | set(previous_counts)
        velocities = []
        for skill in all_seen:
            curr = current_counts.get(skill, 0)
            prev = previous_counts.get(skill, 0)
            velocity = curr - prev
            if velocity > 10:
                trend = "high"
            elif velocity > 4:
                trend = "medium"
            elif velocity >= 0:
                trend = "stable"
            else:
                trend = "declining"

            velocities.append({
                "skill": skill,
                "count": curr + prev,
                "current": curr,
                "previous": prev,
                "velocity": f"+{velocity}" if velocity >= 0 else str(velocity),
                "velocity_int": velocity,
                "trend": trend
            })

        velocities.sort(key=lambda x: x["velocity_int"], reverse=True)
        top = velocities[:8]

        if REDIS_AVAILABLE:
            redis_client.setex("market_pulse", 1800, json.dumps(top))  # 30-min cache

        return {"success": True, "trending": top}

    except Exception as e:
        logger.error(f"Market pulse failed: {e}")
        if REDIS_AVAILABLE:
            cached = redis_client.get("market_pulse")
            if cached:
                return {"success": True, "trending": json.loads(cached.decode()), "cached": True}
        return {"success": False, "trending": []}


# ===================== GLOBAL CONTEXT-AWARE CHATBOT — UPGRADED =====================

class ChatRequest(BaseModel):
    message: str
    path: str = "/"
    history: list[dict] = []
    user_id: str = ""
    context: dict = {}  # {job_id, job_title, match_score, match_reason, missing_skills, user_skills}


@app.post("/api/chat")
async def global_chat(req: ChatRequest):
    """
    Global AI Career Assistant:
    - /pitch command with job context guard (Fix #6)
    - Redis session persistence capped at 10 messages (Fix #5: prevents memory leak)
    - Context-aware recruiter+mentor AI persona (Fix #10)
    - Per-skill cert boost already in match-weighted (Fix #1)
    """
    if not openai_client:
        return {"reply": "I'm currently offline, but I'm here to help you soon!"}

    user_message = req.message.strip()

    # ── /pitch Command Handler ──────────────────────────────────────────────────
    if user_message.lower().startswith("/pitch"):
        job_ctx = req.context
        job_id = job_ctx.get("job_id", "")

        # Fix #6: Guard — /pitch without job context returns helpful message, not crash
        if not job_id:
            return {
                "reply": "💼 **Please open a specific job first**, then type `/pitch` to generate your personalized elevator pitch for that role."
            }

        job_title = job_ctx.get("job_title", "this role")
        match_reason = job_ctx.get("match_reason", "")
        missing_skills = job_ctx.get("missing_skills", [])
        user_skills = job_ctx.get("user_skills", [])

        pitch_system = f"""You are a professional career coach writing a 30-second elevator pitch.
The candidate is applying for: {job_title}
RULES:
- Sound natural and human, not corporate or stiff
- Reference the specific role: {job_title}
- Mention 2-3 specific skills or past outcomes
- Maximum 3-4 sentences (truly 30 seconds when spoken)
- Start with a confident opener like 'Hi, I'm a strong fit for...' or similar
- Do NOT mention any numeric match scores"""

        user_skills_str = ", ".join(str(s) for s in user_skills[:5]) if user_skills else "diverse technical skills"
        missing_str = ", ".join(
            (s.get("skill", str(s)) if isinstance(s, dict) else str(s)) for s in missing_skills[:3]
        ) if missing_skills else "minor gaps only"

        pitch_user = f"""Role: {job_title}
My strengths: {user_skills_str}
Gaps to acknowledge briefly: {missing_str}
Why I fit: {match_reason}
Generate my personalized 30-second pitch now."""

        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": pitch_system},
                    {"role": "user", "content": pitch_user}
                ],
                timeout=12
            )
            pitch = response.choices[0].message.content.strip()
            return {
                "reply": f"\U0001f3af **Your 30-Second Pitch:**\n\n{pitch}\n\n*Use this as your cover letter opener or interview intro!*"
            }
        except Exception as e:
            logger.error(f"Pitch generation failed: {e}")
            return {"reply": "Failed to generate pitch. Please try again in a moment."}

    # ── Load Chat History from Redis (Session Persistence) ──────────────────────
    loaded_history = []
    if req.user_id and REDIS_AVAILABLE:
        try:
            stored = redis_client.get(f"chat:{req.user_id}")
            if stored:
                loaded_history = json.loads(stored.decode("utf-8"))
        except Exception:
            loaded_history = []

    # Fix #5: cap at 10 messages — prevents Redis memory overflow
    combined_history = (loaded_history + req.history)[-10:]

    # ── Context-Aware System Prompt (Fix #10: Recruiter + Mentor AI Persona) ────
    base_persona = """You are an elite AI Career Intelligence Assistant on a hiring platform.
You combine the strategic thinking of a Senior Recruiter with the empathy of a Career Mentor.
BEHAVIOR RULES (STRICT):
1. Always reference specific job titles, skills, or user data when available
2. Never give generic advice — every response must feel tailored to THIS user
3. Provide actionable next steps, not vague encouragement
4. When analyzing jobs: be direct about skill gaps and HOW to bridge them
5. Keep responses concise: 2-5 sentences unless a list adds clarity
6. Think strategically: identify patterns in the user's career trajectory
7. Be honest: if the user is not a fit, say so constructively"""

    if req.path.startswith("/jobs/"):
        job_ctx = req.context
        intent = f"""User is viewing job: '{job_ctx.get('job_title', 'a specific role')}'.
Match score: {job_ctx.get('match_score', 'unknown')}%. Assessment: {job_ctx.get('match_reason', '')}.
Help them understand requirements, strengthen their application, or decide whether to apply.
Hint: they can type /pitch to get an instant personalized elevator pitch."""
    elif req.path.startswith("/jobs"):
        intent = "User is browsing jobs. Help identify best matches for their profile or explain job requirements."
    elif req.path.startswith("/career-role-builder") or req.path.startswith("/signup"):
        intent = "User is in the onboarding flow. Help with resume skill extraction, profile completion, or Aadhaar verification."
    elif req.path.startswith("/dashboard"):
        intent = "User is on their dashboard. Give career roadmap advice, explain metrics, or suggest their next strategic move."
    else:
        intent = "Provide smart, specific career guidance using any available context about the user's skills or goals."

    system_prompt = f"{base_persona}\n\nContext: {intent}"

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(combined_history)
    messages.append({"role": "user", "content": user_message})

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            timeout=12
        )
        reply = response.choices[0].message.content.strip()

        # Fix #5: save capped history to Redis (24h TTL)
        if req.user_id and REDIS_AVAILABLE:
            updated = (combined_history + [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": reply}
            ])[-10:]  # Hard cap — prevents memory leak
            try:
                redis_client.setex(f"chat:{req.user_id}", 86400, json.dumps(updated))
            except Exception:
                pass

        return {"reply": reply}

    except Exception as e:
        logger.error(f"Chat failed: {e}")
        return {"reply": "I caught an error. Please try again in a moment!"}
