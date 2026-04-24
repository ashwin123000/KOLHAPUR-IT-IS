"""
SQLAlchemy ORM Models — Master Prompt V2.0
All models for the AI Hiring OS platform.
"""

from models.user_new import User
from models.resume import Resume
from models.job_new import Job
from models.application import Application
from models.vm_session import VMSession, VMEvent
from models.chat_message import ChatMessage

__all__ = [
    "User",
    "Resume",
    "Job",
    "Application",
    "VMSession",
    "VMEvent",
    "ChatMessage",
]
