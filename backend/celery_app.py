from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from config import settings


celery_app = Celery(
    "vm_assessment",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "vm-cleanup-daemon": {
            "task": "tasks.vm_lifecycle.cleanup_stale_sessions",
            "schedule": crontab(minute="*/5"),
        }
    },
)

