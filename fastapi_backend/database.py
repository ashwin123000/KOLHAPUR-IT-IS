import json
import os
from contextlib import asynccontextmanager
from typing import Any, Iterable

import aiosqlite


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(BASE_DIR, "freelance_market.db"),
)


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

        await conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)")
        await conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_aadhaar_lookup_unique ON users(aadhaar_lookup) WHERE aadhaar_lookup IS NOT NULL")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_realtime_events_user_timestamp ON realtime_events(user_id, timestamp)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_realtime_events_timestamp ON realtime_events(timestamp)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_open_title ON jobs(title) WHERE status = 'open'")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_open_category ON jobs(category) WHERE status = 'open'")

        await conn.commit()


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
