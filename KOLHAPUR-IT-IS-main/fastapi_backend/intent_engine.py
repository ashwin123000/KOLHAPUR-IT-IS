"""
Intent Detection Engine
Classifies incoming messages into one of 8 intents using pattern matching
No external NLP library required — simple, fast, deterministic
"""

from typing import Optional

# Define intent patterns
# Each intent has a list of keywords/phrases that trigger it
INTENT_PATTERNS = {
    "improve_score": [
        "improve", "increase", "boost", "how do i get higher", "what should i do for that",
        "%", "score", "match", "percentage", "better score", "higher match"
    ],
    "project_suggestion": [
        "project", "build", "portfolio", "what should i build", "side project", "practice",
        "project idea", "build something"
    ],
    "interview_prep": [
        "interview", "question", "prepare", "asked", "what will they ask", "mock",
        "interview prep", "interview questions", "interview tips"
    ],
    "career_roadmap": [
        "roadmap", "become", "career", "path", "journey", "how long", "steps to become",
        "progress", "roadmap", "what's next"
    ],
    "skill_explanation": [
        "what is", "explain", "tell me about", "what does", "how does", "why do i need",
        "what's the difference", "define", "meaning of"
    ],
    "job_understanding": [
        "what will i do", "what is this job", "responsibilities", "role", "what does this company",
        "job description", "what does the role", "job overview"
    ],
    "gap_analysis": [
        "missing", "gap", "lacking", "don't have", "weak", "what am i missing",
        "how far am i", "what's holding me back", "shortcomings"
    ],
    "general": []  # fallback
}

# Priority order for intent resolution if multiple patterns match
INTENT_PRIORITY = [
    "improve_score",
    "gap_analysis",
    "project_suggestion",
    "interview_prep",
    "career_roadmap",
    "skill_explanation",
    "job_understanding",
    "general"
]


def detect_intent(message: str) -> str:
    """
    Detect the intent of a user message using pattern matching
    
    Args:
        message: Raw user message
    
    Returns:
        Intent string: one of the 8 intents
    """
    msg = message.lower().strip()
    
    # Special case: empty or minimal message
    if len(msg) < 2:
        return "general"
    
    # Check each intent in priority order
    for intent in INTENT_PRIORITY:
        patterns = INTENT_PATTERNS.get(intent, [])
        
        # Check if any pattern matches (substring match)
        for pattern in patterns:
            if pattern in msg:
                return intent
    
    # Default fallback
    return "general"


def get_intent_emoji(intent: str) -> str:
    """
    Get emoji representation for an intent
    
    Args:
        intent: Intent string
    
    Returns:
        Emoji character
    """
    emoji_map = {
        "improve_score": "📈",
        "project_suggestion": "🛠️",
        "interview_prep": "🎯",
        "career_roadmap": "🗺️",
        "skill_explanation": "📖",
        "job_understanding": "💼",
        "gap_analysis": "🔍",
        "general": "💬"
    }
    
    return emoji_map.get(intent, "💬")


def get_intent_friendly_name(intent: str) -> str:
    """
    Get user-friendly name for an intent
    
    Args:
        intent: Intent string
    
    Returns:
        Friendly name for UI display
    """
    name_map = {
        "improve_score": "Improve Score",
        "project_suggestion": "Project Suggestion",
        "interview_prep": "Interview Prep",
        "career_roadmap": "Career Roadmap",
        "skill_explanation": "Skill Explanation",
        "job_understanding": "Job Overview",
        "gap_analysis": "Gap Analysis",
        "general": "General Chat"
    }
    
    return name_map.get(intent, "General Chat")
