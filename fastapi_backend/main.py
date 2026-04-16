from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import hashlib
import uuid
from fastapi import WebSocket, WebSocketDisconnect
import os
from datetime import datetime

app = FastAPI()
active_connections = []

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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            await websocket.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        active_connections.remove(websocket)

# ===================== DATABASE =====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "freelance_market.db")

conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cursor = conn.cursor()

def get_cursor():
    return conn.cursor()

# ===================== TABLES =====================

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    title TEXT,
    description TEXT,
    budget REAL,
    status TEXT
)
""")

try:
    cursor.execute("ALTER TABLE projects ADD COLUMN assigned_freelancer_id TEXT")
except:
    pass

cursor.execute("""
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    freelancer_id TEXT,
    status TEXT,
    cover_letter TEXT,
    bid_amount REAL
)
""")

try:
    cursor.execute("ALTER TABLE users ADD COLUMN average_rating REAL DEFAULT 0")
except:
    pass

try:
    cursor.execute("ALTER TABLE users ADD COLUMN reliability_score REAL DEFAULT 0")
except:
    pass

try:
    cursor.execute("ALTER TABLE users ADD COLUMN completed_projects INTEGER DEFAULT 0")
except:
    pass

try:
    cursor.execute("ALTER TABLE payments ADD COLUMN created_at TEXT")
    conn.commit()
except:
    pass

cursor.execute("""
CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    freelancer_id TEXT,
    project_id TEXT,
    stars INTEGER,
    feedback TEXT,
    on_time_status TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS rating_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    freelancer_id TEXT,
    old_rating REAL,
    new_rating REAL,
    client_stars INTEGER,
    feedback TEXT,
    on_time_status TEXT,
    created_at TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    sender_id TEXT,
    receiver_id TEXT,
    content TEXT,
    timestamp TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    content TEXT,
    is_read INTEGER,
    timestamp TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    client_id TEXT,
    freelancer_id TEXT,
    amount REAL,
    status TEXT
)
""")

conn.commit()

# ===================== MODELS =====================

class FreelancerRegister(BaseModel):
    username: str
    email: str
    password: str

class ClientRegister(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

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

# ===================== HELPERS =====================

def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id: str, role: str):
    return f"{user_id}:{role}:token123"

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

class ReliabilityEngine:
    POSITIVE_WORDS = {
        "excellent", "amazing", "outstanding", "great", "good", "fantastic",
        "superb", "brilliant", "professional", "quality", "perfect", "best",
        "impressive", "reliable", "recommended", "satisfied", "happy",
        "efficient", "skilled", "talented", "fast", "clear", "delivered"
    }
    NEGATIVE_WORDS = {
        "bad", "terrible", "horrible", "poor", "awful", "disappointing",
        "unprofessional", "delayed", "slow", "wrong", "failed", "incomplete",
        "sloppy", "careless", "mediocre", "frustrating", "avoid", "worse",
        "useless", "waste", "refund", "ghosted", "disappeared", "ignored"
    }

    def __init__(self, completed: int, avg_rating: float, timing_list: list, feedbacks: list):
        self.completed = completed
        self.avg_rating = avg_rating
        self.timing_list = timing_list
        self.feedbacks = feedbacks

    def _star_score(self) -> float:
        # Stars: 1=0pts, 2=5pts, 3=12pts, 4=20pts, 5=30pts
        mapping = {1: 0, 2: 5, 3: 12, 4: 20, 5: 30}
        return mapping.get(round(self.avg_rating), 0)

    def _timing_score(self) -> float:
        score = 0.0
        for status in self.timing_list:
            if status == "BEFORE":
                score += 10
            elif status == "ON_TIME":
                score += 4
            elif status == "LATE":
                score -= 15
        # Cap timing contribution between -30 and +30
        return max(-30, min(30, score))

    def _experience_score(self) -> float:
        # +2 per completed project, max 20
        return min(self.completed * 2.0, 20.0)

    def _sentiment_score(self) -> float:
        score = 0.0
        for feedback in self.feedbacks:
            words = set(feedback.lower().split())
            positives = len(words & self.POSITIVE_WORDS)
            negatives = len(words & self.NEGATIVE_WORDS)
            score += (positives * 2.0) - (negatives * 4.0)
        # Cap sentiment between -20 and +20
        return max(-20, min(20, score))
    
    @staticmethod
    def compute_display_rating(all_ratings: list) -> float:
        """
        Computes a 0-5 display rating based on:
        1. Stars given
        2. On time / late / before
        3. Sentiment of feedback words
        """
        POSITIVE_WORDS = {
            "excellent", "amazing", "outstanding", "great", "good", "fantastic",
            "superb", "brilliant", "professional", "quality", "perfect", "best",
            "impressive", "reliable", "recommended", "satisfied", "happy",
            "efficient", "skilled", "talented", "fast", "clear", "delivered"
        }
        NEGATIVE_WORDS = {
            "bad", "terrible", "horrible", "poor", "awful", "disappointing",
            "unprofessional", "delayed", "slow", "wrong", "failed", "incomplete",
            "sloppy", "careless", "mediocre", "frustrating", "avoid", "worse",
            "useless", "waste", "refund", "ghosted", "disappeared", "ignored"
        }

        if not all_ratings:
            return 0.0

        total_score = 0.0

        for stars, timing, feedback in all_ratings:
            # 1. Stars contribute 60% of weight (stars/5 * 3.0 max)
            star_contribution = (stars / 5.0) * 3.0

            # 2. Timing contributes 25% of weight
            timing_map = {
                "BEFORE":  0.5,   # early = bonus
                "ON_TIME": 0.25,  # on time = small bonus
                "LATE":   -0.75,  # late = penalty
            }
            timing_contribution = timing_map.get(timing, 0.0)

            # 3. Sentiment contributes 15% of weight
            sentiment = 0.0
            if feedback:
                words = set(feedback.lower().split())
                positives = len(words & POSITIVE_WORDS)
                negatives = len(words & NEGATIVE_WORDS)
                sentiment = min(0.3, positives * 0.1) - min(0.5, negatives * 0.15)

            total_score += star_contribution + timing_contribution + sentiment

        # Average across all ratings, clamped to 0-5
        raw = total_score / len(all_ratings)
        return round(max(0.0, min(5.0, raw)), 2)

    
    def compute(self) -> float:
        base = 10.0
        star = self._star_score()        # max 30
        timing = self._timing_score()    # -30 to +30
        experience = self._experience_score()  # max 20
        sentiment = self._sentiment_score()    # -20 to +20

        total = base + star + timing + experience + sentiment
        return round(max(0, min(100, total)), 2)


def calculate_score(completed, avg_rating, timing_list, feedbacks=None):
    engine = ReliabilityEngine(
        completed=completed,
        avg_rating=avg_rating,
        timing_list=timing_list,
        feedbacks=feedbacks or []
    )
    return engine.compute()

# ===================== AUTH =====================

@app.post("/api/auth/register-freelancer")
def register_freelancer(user: FreelancerRegister):
    cur = get_cursor()
    try:
        user_id = "freelancer_" + str(uuid.uuid4())[:8]
        hashed = hash_password(user.password)
        cur.execute(
            "INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)",
            (user_id, user.username, user.email, hashed, "freelancer")
        )
        conn.commit()
        return {"success": True, "data": {"userId": user_id}}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already exists")

@app.post("/api/auth/register-client")
def register_client(user: ClientRegister):
    cur = get_cursor()
    try:
        user_id = "client_" + str(uuid.uuid4())[:8]
        hashed = hash_password(user.password)
        cur.execute(
            "INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)",
            (user_id, user.username, user.email, hashed, "client")
        )
        conn.commit()
        return {"success": True, "data": {"userId": user_id}}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already exists")

@app.post("/api/auth/login")
def login(user: LoginRequest):
    cur = get_cursor()
    cur.execute("SELECT * FROM users WHERE email=?", (user.email,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id, username, email, stored_password, role = row[:5]
    if stored_password != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = generate_token(user_id, role)
    return {"success": True, "data": {"token": token, "userId": user_id, "role": role}}

# ===================== PROJECTS =====================

@app.post("/api/projects/secure")
def create_project_secure(project: CreateProject, user=Depends(require_user)):
    cur = get_cursor()
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients allowed")
    project_id = "proj_" + str(uuid.uuid4())[:8]
    cur.execute(
        "INSERT INTO projects (id, client_id, title, description, budget, status) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, user["userId"], project.title, project.description, project.budget, "open")
    )
    conn.commit()
    return {"success": True, "projectId": project_id}

@app.post("/api/projects/submit")
def submit_work(data: SubmitWorkRequest):
    cur = get_cursor()
    cur.execute(
        "UPDATE projects SET status='submitted' WHERE id=? AND assigned_freelancer_id=?",
        (data.projectId, data.freelancerId)
    )
    conn.commit()
    return {"success": True, "message": "Work submitted"}

@app.post("/api/projects/{project_id}/verify")
def verify_work(project_id: str, body: VerifyWorkRequest):
    cur = get_cursor()
    new_status = "completed" if body.verify else "in_progress"
    cur.execute("UPDATE projects SET status=? WHERE id=?", (new_status, project_id))
    conn.commit()
    return {"success": True, "status": new_status}

@app.post("/api/projects")
def create_project(project: CreateProject):
    cur = get_cursor()
    project_id = "proj_" + str(uuid.uuid4())[:8]
    cur.execute(
        "INSERT INTO projects (id, client_id, title, description, budget, status) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, project.clientId, project.title, project.description, project.budget, "open")
    )
    conn.commit()
    return {"success": True, "data": {"projectId": project_id}}

@app.get("/api/projects/client/{client_id}")
def get_projects_for_client(client_id: str):
    cur = get_cursor()
    cur.execute("SELECT * FROM projects WHERE client_id=?", (client_id,))
    return {"success": True, "data": cur.fetchall()}

@app.get("/api/projects/freelancer/{user_id}")
def get_projects_for_freelancer(user_id: str):
    cur = get_cursor()

    # Projects where freelancer is hired
    cur.execute("SELECT * FROM projects WHERE assigned_freelancer_id=?", (user_id,))
    assigned = cur.fetchall()

    # Projects where freelancer has applied but not yet hired
    cur.execute("""
        SELECT p.* FROM projects p
        INNER JOIN applications a ON a.project_id = p.id
        WHERE a.freelancer_id=? AND p.assigned_freelancer_id IS NULL
    """, (user_id,))
    applied = cur.fetchall()

    # Merge and deduplicate by project id
    seen = set()
    result = []
    for p in assigned + applied:
        if p[0] not in seen:
            seen.add(p[0])
            result.append(p)

    return {"success": True, "data": result}

@app.get("/api/projects")
def get_projects():
    cur = get_cursor()
    cur.execute("SELECT * FROM projects")
    rows = cur.fetchall()
    return {"success": True, "data": [
        {"projectId": r[0], "clientId": r[1], "title": r[2],
         "description": r[3], "budget": r[4], "status": r[5]} for r in rows
    ]}

# ===================== APPLICATIONS =====================

@app.post("/api/apply/secure")
def apply_secure(data: ApplyRequest, user=Depends(require_user)):
    cur = get_cursor()
    if user["role"] != "freelancer":
        raise HTTPException(status_code=403, detail="Only freelancers can apply")
    cur.execute(
        "SELECT id FROM applications WHERE project_id=? AND freelancer_id=?",
        (data.projectId, user["userId"])
    )
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="Already applied")
    app_id = "app_" + str(uuid.uuid4())[:8]
    cur.execute(
        "INSERT INTO applications VALUES (?, ?, ?, ?, ?, ?)",
        (app_id, data.projectId, user["userId"], "pending", data.coverLetter, data.bidAmount)
    )
    conn.commit()
    return {"success": True}

@app.post("/api/apply")
def apply(data: ApplyRequest):
    cur = get_cursor()
    cur.execute(
        "SELECT id FROM applications WHERE project_id=? AND freelancer_id=?",
        (data.projectId, data.freelancerId)
    )
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="Already applied")
    app_id = "app_" + str(uuid.uuid4())[:8]
    cur.execute(
        "INSERT INTO applications VALUES (?, ?, ?, ?, ?, ?)",
        (app_id, data.projectId, data.freelancerId, "pending", data.coverLetter, data.bidAmount)
    )
    conn.commit()
    return {"success": True}

@app.get("/api/applications/{project_id}")
def get_applications(project_id: str):
    cur = get_cursor()
    cur.execute("SELECT * FROM applications WHERE project_id=?", (project_id,))
    return {"success": True, "data": cur.fetchall()}

@app.put("/api/applications/{app_id}/update-bid")
def update_bid(app_id: str, body: dict):
    cur = get_cursor()
    cur.execute(
        "UPDATE applications SET bid_amount=? WHERE id=?",
        (body.get("bidAmount", 0), app_id)
    )
    conn.commit()
    return {"success": True}

# ===================== HIRE =====================

@app.post("/api/hire/secure")
def hire_secure(data: HireRequest, user=Depends(require_user)):
    cur = get_cursor()
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can hire")
    cur.execute("SELECT client_id FROM projects WHERE id=?", (data.projectId,))
    owner = cur.fetchone()
    if not owner or owner[0] != user["userId"]:
        raise HTTPException(status_code=403, detail="Not your project")
    cur.execute("UPDATE applications SET status='accepted' WHERE id=?", (data.applicationId,))
    cur.execute(
        "UPDATE applications SET status='rejected' WHERE project_id=? AND id!=?",
        (data.projectId, data.applicationId)
    )
    cur.execute(
        "UPDATE projects SET assigned_freelancer_id=?, status='in_progress' WHERE id=?",
        (data.freelancerId, data.projectId)
    )
    conn.commit()
    return {"success": True}

@app.post("/api/hire")
def hire(data: HireRequest):
    cur = get_cursor()
    cur.execute(
        "UPDATE applications SET status='accepted' WHERE id=? AND project_id=?",
        (data.applicationId, data.projectId)
    )
    cur.execute(
        "UPDATE applications SET status='rejected' WHERE project_id=? AND id!=?",
        (data.projectId, data.applicationId)
    )
    cur.execute(
        "UPDATE projects SET assigned_freelancer_id=?, status='in_progress' WHERE id=?",
        (data.freelancerId, data.projectId)
    )
    conn.commit()
    return {"success": True}

# ===================== MESSAGES =====================

@app.get("/api/messages/user/{user_id}")
def get_user_messages(user_id: str):
    cur = get_cursor()
    cur.execute("SELECT * FROM messages WHERE sender_id=? OR receiver_id=?", (user_id, user_id))
    return {"success": True, "data": cur.fetchall()}

@app.post("/api/messages")
def send_message(data: MessageRequest):
    cur = get_cursor()
    msg_id = "msg_" + str(uuid.uuid4())[:8]
    cur.execute(
        "INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)",
        (msg_id, data.projectId, data.senderId, data.receiverId, data.content, datetime.now().isoformat())
    )
    conn.commit()
    return {"success": True}


@app.get("/api/messages/{project_id}")
def get_messages(project_id: str):
    cur = get_cursor()
    cur.execute("SELECT * FROM messages WHERE project_id=?", (project_id,))
    return {"success": True, "data": cur.fetchall()}

# ===================== NOTIFICATIONS =====================

@app.post("/api/notifications")
def send_notification(data: NotificationRequest):
    cur = get_cursor()
    notif_id = "notif_" + str(uuid.uuid4())[:8]
    cur.execute(
        "INSERT INTO notifications VALUES (?, ?, ?, ?, ?)",
        (notif_id, data.userId, data.content, 0, datetime.now().isoformat())
    )
    conn.commit()
    return {"success": True}

@app.get("/api/notifications/{user_id}")
def get_notifications(user_id: str):
    cur = get_cursor()
    cur.execute("SELECT * FROM notifications WHERE user_id=?", (user_id,))
    return {"success": True, "data": cur.fetchall()}

@app.put("/api/notifications/{notif_id}/read")
def mark_read(notif_id: str):
    cur = get_cursor()
    cur.execute("UPDATE notifications SET is_read=1 WHERE id=?", (notif_id,))
    conn.commit()
    return {"success": True}

# ===================== PAYMENTS =====================

@app.post("/api/payments/release")
def release_payment(body: dict):
    cur = get_cursor()
    cur.execute(
        "UPDATE payments SET status='released' WHERE project_id=?",
        (body.get("projectId"),)
    )
    conn.commit()
    return {"success": True}

@app.post("/api/payments")
def create_payment(data: PaymentRequest):
    cur = get_cursor()
    pay_id = "pay_" + str(uuid.uuid4())[:8]
    cur.execute(
        "INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?)",
        (pay_id, data.projectId, data.clientId, data.freelancerId, data.amount, "pending")
    )
    conn.commit()
    return {"success": True}

@app.get("/api/payments/{user_id}")
def get_payments(user_id: str):
    cur = get_cursor()
    cur.execute(
        "SELECT * FROM payments WHERE client_id=? OR freelancer_id=?",
        (user_id, user_id)
    )
    return {"success": True, "data": cur.fetchall()}

# ===================== INVOICES =====================

@app.get("/api/invoices/{user_id}")
def get_invoices(user_id: str):
    cur = get_cursor()
    cur.execute(
        "SELECT * FROM payments WHERE freelancer_id=? AND status='released'",
        (user_id,)
    )
    return {"success": True, "data": cur.fetchall()}

# ===================== TALENT =====================

@app.get("/api/freelancers")
def get_freelancers():
    cur = get_cursor()
    cur.execute("SELECT id, username, average_rating, reliability_score FROM users WHERE role='freelancer'")
    return {"success": True, "data": cur.fetchall()}

# ===================== STATS =====================

@app.get("/api/stats/{user_id}/client")
def client_stats(user_id: str):
    cur = get_cursor()
    cur.execute("SELECT COUNT(*) FROM projects WHERE client_id=?", (user_id,))
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM projects WHERE client_id=? AND status='completed'", (user_id,))
    completed = cur.fetchone()[0]
    return {"success": True, "data": {"totalProjects": total, "completedProjects": completed}}

@app.get("/api/stats/{user_id}/freelancer")
def freelancer_stats(user_id: str):
    cur = get_cursor()
    cur.execute("SELECT COUNT(*) FROM applications WHERE freelancer_id=?", (user_id,))
    apps = cur.fetchone()[0]
    cur.execute("SELECT completed_projects, reliability_score FROM users WHERE id=?", (user_id,))
    user_data = cur.fetchone()
    completed = user_data[0] if user_data else 0
    score = user_data[1] if user_data else 0
    cur.execute("""
        SELECT COUNT(*), SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END)
        FROM projects WHERE assigned_freelancer_id=?
    """, (user_id,))
    proj_data = cur.fetchone()
    total_projects = proj_data[0] if proj_data else 0
    active_projects = proj_data[1] if proj_data and proj_data[1] else 0
    cur.execute(
        "SELECT SUM(amount) FROM payments WHERE freelancer_id=? AND status='released'",
        (user_id,)
    )
    earnings_data = cur.fetchone()
    total_earnings = earnings_data[0] if earnings_data and earnings_data[0] else 0
    cur.execute("SELECT average_rating FROM users WHERE id=?", (user_id,))
    rating_row = cur.fetchone()
    average_rating = rating_row[0] if rating_row and rating_row[0] else 0.0

    # ── Real growth data: use rating_logs.created_at as the timestamp ──
    cur.execute("""
        SELECT DATE(created_at) as day, SUM(amount) as daily
        FROM payments
        WHERE freelancer_id=? AND status='released' AND created_at IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
    """, (user_id,))
    raw_growth = cur.fetchall()

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
    cur = get_cursor()

    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only client can rate")

    # 🔥 call rating logic
    result = await create_rating(data)

    # 🔥 fetch project details
    cur.execute(
        "SELECT client_id, assigned_freelancer_id, budget FROM projects WHERE id=?",
        (data.projectId,)
    )
    proj = cur.fetchone()

    if proj:
        client_id, freelancer_id, amount = proj
        pay_id = "pay_" + str(uuid.uuid4())[:8]

        cur.execute(
            "INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?, ?)",
            (pay_id, data.projectId, client_id, freelancer_id, amount, "released", datetime.now().isoformat())
        )

        conn.commit()

    return result

@app.get("/api/ratings/project/{project_id}")
def get_rating_for_project(project_id: str):
    cur = get_cursor()
    cur.execute(
        "SELECT stars, on_time_status, feedback FROM ratings WHERE project_id=? ORDER BY rowid DESC LIMIT 1",
        (project_id,)
    )
    row = cur.fetchone()
    if not row:
        return {"success": True, "data": None}
    return {"success": True, "data": {
        "stars": row[0],
        "onTimeStatus": row[1],
        "feedback": row[2]
    }}
    

@app.post("/api/ratings")
async def create_rating(data: RatingRequest):
    cur = get_cursor()

    try:
        rating_id = "rat_" + str(uuid.uuid4())[:8]

        cur.execute(
            "INSERT INTO ratings VALUES (?, ?, ?, ?, ?, ?)",
            (rating_id, data.freelancerId, data.projectId, data.stars, data.feedback, data.onTimeStatus)
        )

        cur.execute("SELECT stars, on_time_status, feedback FROM ratings WHERE freelancer_id=?", (data.freelancerId,))
        all_ratings = cur.fetchall()

        avg_rating = ReliabilityEngine.compute_display_rating(all_ratings)

        cur.execute("SELECT completed_projects FROM users WHERE id=?", (data.freelancerId,))
        completed = cur.fetchone()[0] or 0

        cur.execute("SELECT on_time_status FROM ratings WHERE freelancer_id=?", (data.freelancerId,))
        timing_list = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT feedback FROM ratings WHERE freelancer_id=?", (data.freelancerId,))
        feedbacks = [row[0] for row in cur.fetchall() if row[0]]

        new_score = calculate_score(completed, avg_rating, timing_list, feedbacks)

        cur.execute(
            "UPDATE users SET average_rating=?, reliability_score=?, completed_projects=completed_projects+1 WHERE id=?",
            (avg_rating, new_score, data.freelancerId)
        )

        cur.execute("UPDATE projects SET status='completed' WHERE id=?", (data.projectId,))

        cur.execute("""
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

        conn.commit()

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

def check_project_exists(project_id):
    cur = get_cursor()
    cur.execute("SELECT id FROM projects WHERE id=?", (project_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Project not found")

def check_application_exists(app_id):
    cur = get_cursor()
    cur.execute("SELECT id FROM applications WHERE id=?", (app_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Application not found")