from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler


_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="UTC")
    return _scheduler


def start_scheduler() -> AsyncIOScheduler:
    scheduler = get_scheduler()
    if not scheduler.running:
        scheduler.start()
    return scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
