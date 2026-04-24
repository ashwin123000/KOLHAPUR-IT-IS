"""
Chat Session Memory Manager
Maintains conversation history per user in-memory with max 10 messages per session
"""

from collections import defaultdict, deque
from typing import List, Dict

# In-memory store — keyed by userId
# Each user gets a deque of max 10 messages
chat_sessions: Dict[str, deque] = defaultdict(lambda: deque(maxlen=10))


def add_to_history(user_id: str, role: str, content: str) -> None:
    """
    Add a message to the user's chat history
    
    Args:
        user_id: Unique user identifier
        role: "user" or "assistant"
        content: Message content
    """
    chat_sessions[user_id].append({
        "role": role,
        "content": content
    })


def get_history(user_id: str) -> List[Dict[str, str]]:
    """
    Get full conversation history for a user
    
    Args:
        user_id: Unique user identifier
    
    Returns:
        List of {role, content} dicts, ordered chronologically
    """
    return list(chat_sessions[user_id])


def clear_history(user_id: str) -> None:
    """
    Clear all chat history for a user
    
    Args:
        user_id: Unique user identifier
    """
    if user_id in chat_sessions:
        chat_sessions[user_id].clear()


def get_last_n_messages(user_id: str, n: int = 3) -> List[Dict[str, str]]:
    """
    Get the last N messages from history
    
    Args:
        user_id: Unique user identifier
        n: Number of messages to return
    
    Returns:
        List of last N messages
    """
    history = list(chat_sessions[user_id])
    return history[-n:] if len(history) > 0 else []


def has_recent_suggestion(user_id: str, suggestion_keyword: str) -> bool:
    """
    Check if a suggestion keyword appears in recent history to avoid repetition
    
    Args:
        user_id: Unique user identifier
        suggestion_keyword: Keyword to search for (lowercase)
    
    Returns:
        True if keyword found in last 5 messages
    """
    recent = get_last_n_messages(user_id, n=5)
    keyword_lower = suggestion_keyword.lower()
    
    for msg in recent:
        if keyword_lower in msg.get("content", "").lower():
            return True
    
    return False
