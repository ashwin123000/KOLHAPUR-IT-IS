from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from sqlalchemy import or_, select

from celery_app import celery_app
from config import settings
from database_new import async_session_maker
from models.vm_session import VMSession
from services.vm_runtime import cleanup_workspace, container_pool


@celery_app.task(name="tasks.vm_lifecycle.cleanup_stale_sessions")
def cleanup_stale_sessions():
    asyncio.run(_cleanup_stale_sessions())


async def _cleanup_stale_sessions():
    now = datetime.utcnow()
    async with async_session_maker() as db:
        result = await db.execute(
            select(VMSession).where(
                VMSession.status.in_(["active", "submitted", "evaluating"]),
                or_(
                    VMSession.started_at < now - timedelta(minutes=settings.MAX_SESSION_DURATION_MINUTES),
                    VMSession.last_activity_at < now - timedelta(minutes=settings.IDLE_TIMEOUT_MINUTES),
                ),
            )
        )
        stale_sessions = list(result.scalars().all())
        for session in stale_sessions:
            container_pool.release(str(session.id), destroy=True)
            session.status = "timed_out"
            session.ended_at = now
            cleanup_workspace(str(session.id))
        await db.commit()
    return f"Cleaned {len(stale_sessions)} stale sessions"

