"""
Chat Routes — Master Prompt V2.0
Endpoints: send message, get conversation, list sessions
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from database_new import get_db
from models.user_new import User
from models.chat_message import ChatMessage
from models.resume import Resume
from auth.dependencies import get_current_user
from services.chatbot import ChatbotService, ChatbotContextBuilder
from schemas.chat import ChatMessageRequest, ChatMessageResponse, ChatSessionResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# In-memory conversation store (in production, use Redis or database)
conversations: Dict[str, List[Dict]] = {}


@router.post(
    "/message",
    response_model=ChatMessageResponse,
    summary="Send Chat Message",
    description="Send a message to the hiring assistant"
)
async def send_message(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and get AI response.
    
    - **message**: Your message to the assistant
    - **session_id**: Optional session ID for conversation continuity
    - **job_id**: Optional job ID for context
    """
    
    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())
    
    # Load conversation history
    if session_id not in conversations:
        conversations[session_id] = []
    
    # Build user context
    resume_result = await db.execute(
        select(Resume)
        .filter(
            and_(
                Resume.user_id == current_user.id,
                Resume.parse_status == "done",
            )
        )
        .order_by(Resume.created_at.desc())
        .limit(1)
    )
    latest_resume = resume_result.scalar_one_or_none()
    
    user_context = ChatbotContextBuilder.build_user_context(
        {
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "created_at": current_user.created_at,
        },
        {
            "name": latest_resume.name if latest_resume else None,
            "location": latest_resume.location if latest_resume else None,
            "summary": latest_resume.summary if latest_resume else None,
            "skills": latest_resume.skills if latest_resume else [],
            "experience": latest_resume.experience if latest_resume else [],
            "education": latest_resume.education if latest_resume else [],
        } if latest_resume else None,
    )
    
    # Get chat response with tools
    assistant_response, updated_history = await ChatbotService.chat(
        request.message,
        conversations[session_id],
        user_context,
    )
    
    conversations[session_id] = updated_history
    
    # Save messages to database
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        job_id=request.job_id,
        session_id=session_id,
        role="user",
        content=request.message,
        metadata={"source": "web"},
    )
    db.add(user_msg)
    
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        job_id=request.job_id,
        session_id=session_id,
        role="assistant",
        content=assistant_response,
        metadata={"source": "claude", "tools_used": False},
    )
    db.add(assistant_msg)
    
    await db.commit()
    
    logger.info(f"Chat message saved (session: {session_id}, user: {current_user.email})")
    
    return ChatMessageResponse(
        session_id=session_id,
        message=assistant_response,
        timestamp=datetime.utcnow(),
    )


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionResponse,
    summary="Get Chat Session",
    description="Get all messages in a chat session"
)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get full chat session history.
    """
    
    result = await db.execute(
        select(ChatMessage)
        .filter(
            and_(
                ChatMessage.user_id == current_user.id,
                ChatMessage.session_id == session_id,
            )
        )
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    return ChatSessionResponse(
        session_id=session_id,
        messages=[
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.created_at,
            }
            for msg in messages
        ],
    )


@router.get(
    "/sessions",
    response_model=list[ChatSessionResponse],
    summary="List Chat Sessions",
    description="List all chat sessions for current user"
)
async def list_sessions(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of chat sessions.
    """
    
    result = await db.execute(
        select(ChatMessage.session_id)
        .filter(ChatMessage.user_id == current_user.id)
        .distinct()
        .order_by(ChatMessage.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    session_ids = result.scalars().all()
    
    sessions = []
    for sid in session_ids:
        msg_result = await db.execute(
            select(ChatMessage)
            .filter(
                and_(
                    ChatMessage.user_id == current_user.id,
                    ChatMessage.session_id == sid,
                )
            )
            .order_by(ChatMessage.created_at)
        )
        messages = msg_result.scalars().all()
        
        if messages:
            sessions.append(
                ChatSessionResponse(
                    session_id=sid,
                    messages=[
                        {
                            "role": msg.role,
                            "content": msg.content,
                            "timestamp": msg.created_at,
                        }
                        for msg in messages
                    ],
                )
            )
    
    return sessions


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Chat Session",
    description="Delete a chat session"
)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a chat session.
    """
    
    result = await db.execute(
        select(ChatMessage).filter(
            and_(
                ChatMessage.user_id == current_user.id,
                ChatMessage.session_id == session_id,
            )
        )
    )
    messages = result.scalars().all()
    
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    for msg in messages:
        await db.delete(msg)
    
    await db.commit()
    
    # Also remove from in-memory store
    if session_id in conversations:
        del conversations[session_id]
    
    logger.info(f"Chat session deleted: {session_id}")


# Add missing import at top
from typing import Dict
