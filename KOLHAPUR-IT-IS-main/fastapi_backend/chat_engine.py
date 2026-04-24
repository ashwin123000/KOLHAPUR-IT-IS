"""
Chat Engine Orchestrator
Main entry point for chatbot — combines seeker profile, job context, datasets, and match engine
"""

from typing import Dict, Optional, Any
from datetime import datetime
import logging
from bson.objectid import ObjectId

from intent_engine import detect_intent, get_intent_emoji, get_intent_friendly_name
from response_generators import generate_response
from chat_memory import add_to_history, get_history

logger = logging.getLogger(__name__)


async def run_chat(
    message: str,
    user_id: str,
    job_id: Optional[str],
    db,
    match_engine_func
) -> Dict[str, Any]:
    """
    Main chat orchestration function
    Fetches context, detects intent, generates response, saves to history
    
    Args:
        message: User's chat message
        user_id: Unique user identifier (from JWT)
        job_id: Optional job ID for context
        db: MongoDB database connection
        match_engine_func: Function to calculate match (for flexibility)
    
    Returns:
        Response dict with reply, intent, matchScore, detectedRole
    """
    
    try:
        # Step 1: Validate input
        if not message or not message.strip():
            return {"reply": "Please type a message."}
        
        # Step 2: Fetch seeker profile
        seeker = await db.seekers.find_one({"userId": user_id})
        
        if not seeker:
            return {
                "reply": "I couldn't find your profile. Please upload your resume first so I can give you personalized advice.",
                "intent": "general"
            }
        
        # Step 3: Check if seeker has skills
        seeker_skills = seeker.get("skills", [])
        if not seeker_skills or len(seeker_skills) == 0:
            return {
                "reply": "Your profile has no skills yet. Upload your resume and I'll be able to give you specific advice for any role.",
                "intent": "general"
            }
        
        # Step 4: Fetch job context (optional)
        job = None
        if job_id:
            try:
                job = await db.jobs.find_one({"_id": ObjectId(job_id)})
            except Exception as e:
                logger.warning(f"Could not fetch job {job_id}: {e}")
        
        # Step 5: Get role data from dataset
        # For now, use a basic role detection
        # In a full implementation, this would query the dataset_engine
        role_data = {"normalizedTitle": "Your Target Role"}
        if job:
            role_data = {
                "normalizedTitle": job.get("title", "this role"),
                "mustHaveSkills": job.get("mustHaveSkills", []),
                "supportingSkills": job.get("supportingSkills", []),
                "responsibilities": job.get("responsibilities", [])
            }
        
        # Step 6: Calculate match (optional, only if job context exists)
        match = None
        if job:
            try:
                # Call the match engine function
                match = await match_engine_func(seeker, job)
            except Exception as e:
                logger.error(f"Match engine error: {e}")
                match = None
        
        # Step 7: Get chat history for context
        history = get_history(user_id)
        
        # Step 8: Detect intent
        intent = detect_intent(message)
        
        # Step 9: Generate response
        reply = generate_response(intent, seeker, job, role_data, match, history, message)
        
        # Step 10: Save to history
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", reply)
        
        # Step 11: Build response
        response = {
            "reply": reply,
            "intent": intent,
            "intentLabel": get_intent_friendly_name(intent),
            "intentEmoji": get_intent_emoji(intent),
            "matchScore": match.get("totalScore") if match else None,
            "confidence": match.get("confidence") if match else None,
            "detectedRole": role_data.get("normalizedTitle"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Chat response generated for user {user_id}: intent={intent}, match_score={response['matchScore']}")
        
        return response
        
    except Exception as e:
        logger.error(f"Chat engine error: {e}", exc_info=True)
        return {
            "reply": "I ran into an issue fetching your data. Please try again in a moment.",
            "intent": "general",
            "error": str(e)
        }


async def clear_chat_history(user_id: str, db) -> Dict[str, str]:
    """
    Clear chat history for a user
    
    Args:
        user_id: Unique user identifier
        db: MongoDB database connection
    
    Returns:
        Confirmation message
    """
    from chat_memory import clear_history
    
    try:
        clear_history(user_id)
        logger.info(f"Chat history cleared for user {user_id}")
        return {"message": "Chat history cleared"}
    except Exception as e:
        logger.error(f"Error clearing chat history: {e}")
        return {"error": str(e)}
