import json
import os
from contextlib import asynccontextmanager
from typing import Any, Iterable

import aiosqlite
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(BASE_DIR, "freelance_market.db"),
)
MONGO_URL = os.getenv(
    "MONGO_URL",
    os.getenv("MONGODB_URI", "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true"),
)
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", os.getenv("MONGODB_DB", "freelancer_db"))
MONGO_TIMEOUT_MS = int(os.getenv("MONGO_TIMEOUT_MS", "5000"))
SCHEMA_VERSION = 1
SESSION_EXPIRY_SECONDS = 86400


class Database:
    def __init__(self, path: str = DATABASE_PATH):
        self.path = path

    async def execute(self, query: str, values: Iterable[Any] = ()) -> int:
        async with aiosqlite.connect(self.path) as conn:
            cursor = await conn.execute(query, tuple(values))
            await conn.commit()
            return cursor.rowcount

    async def fetch_one(self, query: str, values: Iterable[Any] = ()) -> dict[str, Any] | None:
        async with aiosqlite.connect(self.path) as conn:
            conn.row_factory = aiosqlite.Row
            cursor = await conn.execute(query, tuple(values))
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def fetch_all(self, query: str, values: Iterable[Any] = ()) -> list[dict[str, Any]]:
        async with aiosqlite.connect(self.path) as conn:
            conn.row_factory = aiosqlite.Row
            cursor = await conn.execute(query, tuple(values))
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    @asynccontextmanager
    async def transaction(self):
        async with aiosqlite.connect(self.path) as conn:
            conn.row_factory = aiosqlite.Row
            await conn.execute("PRAGMA foreign_keys=ON")
            await conn.execute("BEGIN")
            try:
                yield conn
            except Exception:
                await conn.rollback()
                raise
            else:
                await conn.commit()


db = Database()
mongo_client: AsyncIOMotorClient | None = None
mongo_db: AsyncIOMotorDatabase | None = None


def dumps(value: Any) -> str:
    return json.dumps(value if value is not None else [])


def loads(value: str | None, default: Any = None) -> Any:
    if value in (None, ""):
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


async def init_db() -> None:
    async with aiosqlite.connect(DATABASE_PATH) as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA foreign_keys=ON")

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE,
                password TEXT NOT NULL,
                user_type TEXT NOT NULL CHECK(user_type IN ('freelancer', 'client')),
                full_name TEXT,
                bio TEXT,
                city TEXT,
                state TEXT,
                college TEXT,
                skills TEXT DEFAULT '[]',
                resume_file_url TEXT,
                resume_metadata TEXT,
                aadhaar_lookup TEXT UNIQUE,
                aadhaar_audit_hash TEXT,
                history TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                client_id TEXT,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                description TEXT NOT NULL,
                location TEXT NOT NULL DEFAULT 'Remote',
                work_mode TEXT NOT NULL DEFAULT 'Remote',
                job_type TEXT NOT NULL DEFAULT 'Full-time',
                duration TEXT NOT NULL DEFAULT 'Ongoing',
                stipend INTEGER NOT NULL DEFAULT 0,
                category TEXT NOT NULL DEFAULT 'Artificial Intelligence',
                skills TEXT NOT NULL DEFAULT '[]',
                jd TEXT NOT NULL DEFAULT '[]',
                jr TEXT NOT NULL DEFAULT '[]',
                trust_score REAL NOT NULL DEFAULT 0,
                match_score REAL NOT NULL DEFAULT 0,
                verified_match REAL NOT NULL DEFAULT 0,
                github_url TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS candidates (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                full_name TEXT,
                github_url TEXT,
                github_score REAL NOT NULL DEFAULT 0,
                trust_score REAL NOT NULL DEFAULT 0,
                skills TEXT NOT NULL DEFAULT '[]',
                raw_payload TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                payload TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS decision_traces (
                id TEXT PRIMARY KEY,
                match_id TEXT UNIQUE NOT NULL,
                vector_score REAL NOT NULL DEFAULT 0,
                cross_encoder_score REAL NOT NULL DEFAULT 0,
                langgraph_path TEXT NOT NULL DEFAULT '[]',
                reasoning_log TEXT NOT NULL DEFAULT '[]',
                evidence_mapping TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS realtime_events (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL DEFAULT '{}',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                budget REAL NOT NULL,
                skills_required TEXT,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES users(id)
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                freelancer_id TEXT NOT NULL,
                proposal TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, freelancer_id),
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (freelancer_id) REFERENCES users(id)
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS freelancer_profiles (
                user_id TEXT PRIMARY KEY,
                resume TEXT NOT NULL DEFAULT '{}',
                skills TEXT NOT NULL DEFAULT '[]',
                projects TEXT NOT NULL DEFAULT '[]',
                experience TEXT NOT NULL DEFAULT '[]',
                education TEXT NOT NULL DEFAULT '[]',
                persona_tags TEXT NOT NULL DEFAULT '[]',
                preferred_work_style TEXT,
                preferred_pace TEXT,
                matching_profile TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS job_posts (
                id TEXT PRIMARY KEY,
                posted_by TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                basic_details TEXT NOT NULL DEFAULT '{}',
                jd_method TEXT NOT NULL DEFAULT 'manual_text',
                raw_jd TEXT NOT NULL DEFAULT '{}',
                enhancement_data TEXT,
                compiled_dashboard TEXT,
                visibility TEXT NOT NULL DEFAULT 'public',
                view_count INTEGER NOT NULL DEFAULT 0,
                applicant_count INTEGER NOT NULL DEFAULT 0,
                keywords TEXT NOT NULL DEFAULT '[]',
                seo_slug TEXT,
                shareable_link TEXT,
                is_ai_enhanced INTEGER NOT NULL DEFAULT 0,
                job_source TEXT NOT NULL DEFAULT 'manual',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                published_at TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (posted_by) REFERENCES users(id)
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS assessments (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                created_by TEXT NOT NULL,
                title TEXT NOT NULL,
                codebase_ref TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                language TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS assessment_questions (
                id TEXT PRIMARY KEY,
                assessment_id TEXT NOT NULL,
                question_order INTEGER NOT NULL,
                scenario TEXT NOT NULL,
                task TEXT NOT NULL,
                pattern_a TEXT NOT NULL,
                pattern_b TEXT NOT NULL,
                evaluation_rubric TEXT NOT NULL,
                FOREIGN KEY (assessment_id) REFERENCES assessments(id)
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS assessment_submissions (
                id TEXT PRIMARY KEY,
                assessment_id TEXT NOT NULL,
                freelancer_id TEXT NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                submitted_at TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'in_progress',
                auto_submitted INTEGER NOT NULL DEFAULT 0,
                violation_reason TEXT,
                FOREIGN KEY (assessment_id) REFERENCES assessments(id)
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS submission_answers (
                id TEXT PRIMARY KEY,
                submission_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                answer_text TEXT NOT NULL,
                llm_score INTEGER,
                llm_feedback TEXT,
                graded_at TIMESTAMP,
                FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id),
                FOREIGN KEY (question_id) REFERENCES assessment_questions(id)
            )
            """
        )

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS assessment_scores (
                id TEXT PRIMARY KEY,
                submission_id TEXT NOT NULL UNIQUE,
                freelancer_id TEXT NOT NULL,
                assessment_id TEXT NOT NULL,
                total_score REAL,
                percentile REAL,
                computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                grading_flag TEXT,
                FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id),
                FOREIGN KEY (assessment_id) REFERENCES assessments(id)
            )
            """
        )

        await _ensure_columns(conn, "users", {
            "user_type": "TEXT DEFAULT 'freelancer'",
            "username": "TEXT UNIQUE",
            "city": "TEXT",
            "state": "TEXT",
            "college": "TEXT",
            "skills": "TEXT DEFAULT '[]'",
            "resume_file_url": "TEXT",
            "resume_metadata": "TEXT",
            "aadhaar_lookup": "TEXT UNIQUE",
            "aadhaar_audit_hash": "TEXT",
            "history": "TEXT DEFAULT '[]'",
        })
        await _ensure_columns(conn, "jobs", {
            "client_id": "TEXT",
            "company": "TEXT NOT NULL DEFAULT 'Architect-X Client'",
            "location": "TEXT NOT NULL DEFAULT 'Remote'",
            "work_mode": "TEXT NOT NULL DEFAULT 'Remote'",
            "job_type": "TEXT NOT NULL DEFAULT 'Full-time'",
            "duration": "TEXT NOT NULL DEFAULT 'Ongoing'",
            "stipend": "INTEGER NOT NULL DEFAULT 0",
            "category": "TEXT NOT NULL DEFAULT 'Artificial Intelligence'",
            "skills": "TEXT NOT NULL DEFAULT '[]'",
            "jd": "TEXT NOT NULL DEFAULT '[]'",
            "jr": "TEXT NOT NULL DEFAULT '[]'",
            "trust_score": "REAL NOT NULL DEFAULT 0",
            "match_score": "REAL NOT NULL DEFAULT 0",
            "verified_match": "REAL NOT NULL DEFAULT 0",
            "github_url": "TEXT",
            "status": "TEXT NOT NULL DEFAULT 'open'",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        })
        await _ensure_columns(conn, "freelancer_profiles", {
            "resume": "TEXT NOT NULL DEFAULT '{}'",
            "skills": "TEXT NOT NULL DEFAULT '[]'",
            "projects": "TEXT NOT NULL DEFAULT '[]'",
            "experience": "TEXT NOT NULL DEFAULT '[]'",
            "education": "TEXT NOT NULL DEFAULT '[]'",
            "persona_tags": "TEXT NOT NULL DEFAULT '[]'",
            "preferred_work_style": "TEXT",
            "preferred_pace": "TEXT",
            "matching_profile": "TEXT NOT NULL DEFAULT '{}'",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        })
        await _ensure_columns(conn, "job_posts", {
            "posted_by": "TEXT NOT NULL DEFAULT ''",
            "status": "TEXT NOT NULL DEFAULT 'draft'",
            "basic_details": "TEXT NOT NULL DEFAULT '{}'",
            "jd_method": "TEXT NOT NULL DEFAULT 'manual_text'",
            "raw_jd": "TEXT NOT NULL DEFAULT '{}'",
            "enhancement_data": "TEXT",
            "compiled_dashboard": "TEXT",
            "visibility": "TEXT NOT NULL DEFAULT 'public'",
            "view_count": "INTEGER NOT NULL DEFAULT 0",
            "applicant_count": "INTEGER NOT NULL DEFAULT 0",
            "keywords": "TEXT NOT NULL DEFAULT '[]'",
            "seo_slug": "TEXT",
            "shareable_link": "TEXT",
            "is_ai_enhanced": "INTEGER NOT NULL DEFAULT 0",
            "job_source": "TEXT NOT NULL DEFAULT 'manual'",
            "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "published_at": "TIMESTAMP",
            "expires_at": "TIMESTAMP",
        })

        await conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)")
        await conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_aadhaar_lookup_unique ON users(aadhaar_lookup) WHERE aadhaar_lookup IS NOT NULL")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_realtime_events_user_timestamp ON realtime_events(user_id, timestamp)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_realtime_events_timestamp ON realtime_events(timestamp)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_open_title ON jobs(title) WHERE status = 'open'")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_open_category ON jobs(category) WHERE status = 'open'")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_job_posts_status_ai ON job_posts(status, is_ai_enhanced, created_at)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_job_posts_posted_by ON job_posts(posted_by, created_at)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_assessments_job_id ON assessments(job_id, status)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id, question_order)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_user ON assessment_submissions(assessment_id, freelancer_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_assessment_submissions_status ON assessment_submissions(status)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON submission_answers(submission_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_assessment_scores_assessment ON assessment_scores(assessment_id, total_score)")

        await conn.commit()


async def init_mongo() -> AsyncIOMotorDatabase:
    global mongo_client, mongo_db

    if mongo_db is not None:
        return mongo_db

    mongo_client = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=MONGO_TIMEOUT_MS,
    )
    await mongo_client.admin.command("ping")
    mongo_db = mongo_client[MONGO_DB_NAME]

    await mongo_db.users.create_index("email", unique=True)
    await mongo_db.users.create_index("aadhaar_lookup", unique=True, sparse=True)
    await mongo_db.users.create_index("schema_version")
    await mongo_db.otp_codes.create_index("expires_at", expireAfterSeconds=0)
    await mongo_db.otp_codes.create_index([("email", 1), ("purpose", 1)])
    await mongo_db.seekers.create_index("userId", unique=True)
    await mongo_db.seekers.create_index("aiProfile.personaArchetype")
    await mongo_db.seekers.create_index("aiProfile.careerTrajectory")
    await mongo_db.applications.create_index("applicationId", unique=True)
    await mongo_db.applications.create_index([("jobPostId", 1), ("seekerId", 1)], unique=True)
    await mongo_db.applications.create_index([("clientId", 1), ("jobPostId", 1)])
    await mongo_db.tests.create_index("jobId", unique=True)
    await mongo_db.tests.create_index("createdBy")
    await mongo_db.test_sessions.create_index([("userId", 1), ("testId", 1)])
    await mongo_db.test_sessions.create_index("status")
    await mongo_db.test_sessions.create_index("testId")
    await mongo_db.test_sessions.create_index("startedAt", expireAfterSeconds=SESSION_EXPIRY_SECONDS)
    await mongo_db.submissions.create_index([("userId", 1), ("testId", 1)], unique=True)
    await mongo_db.submissions.create_index("testId")
    await mongo_db.submissions.create_index("jobId")
    await mongo_db.submissions.create_index("submittedAt")
    await mongo_db.notifications.create_index([("userId", 1), ("createdAt", -1)])
    await mongo_db.notifications.create_index([("type", 1), ("entityId", 1)])
    await mongo_db.vm_codebases.create_index("assessment_id", unique=True)
    await mongo_db.vm_codebase_summaries.create_index("assessment_id", unique=True)
    await mongo_db.vm_llm_evaluations.create_index([("submission_id", 1), ("evaluated_at", -1)])

    return mongo_db


async def close_mongo() -> None:
    global mongo_client, mongo_db

    if mongo_client is not None:
        mongo_client.close()
    mongo_client = None
    mongo_db = None


async def get_db() -> AsyncIOMotorDatabase:
    if mongo_db is None:
        raise RuntimeError("MongoDB has not been initialized")
    return mongo_db


async def _ensure_columns(conn: aiosqlite.Connection, table: str, columns: dict[str, str]) -> None:
    cursor = await conn.execute(f"PRAGMA table_info({table})")
    existing = {row[1] for row in await cursor.fetchall()}
    for name, definition in columns.items():
        if name not in existing:
            try:
                await conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
            except aiosqlite.OperationalError:
                relaxed = (
                    definition
                    .replace(" UNIQUE", "")
                    .replace(" NOT NULL", "")
                    .replace(" DEFAULT CURRENT_TIMESTAMP", "")
                )
                await conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {relaxed}")
