"""
Chatbot Service — Master Prompt V2.0
Context-aware conversations with Claude and tool calling
"""

import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

from anthropic import Anthropic

logger = logging.getLogger(__name__)

anthropic_client = Anthropic()


class ChatbotContextBuilder:
    """Build rich context for chat interactions."""
    
    @staticmethod
    def build_user_context(user_data: Dict[str, Any], resume_data: Optional[Dict] = None) -> str:
        """
        Build context string from user profile and resume.
        
        Args:
            user_data: User object with email, full_name, role
            resume_data: Resume object with skills, experience
        
        Returns:
            Context string for system prompt
        """
        context = f"""
User Profile:
- Name: {user_data.get('full_name', 'Unknown')}
- Email: {user_data.get('email', 'N/A')}
- Role: {user_data.get('role', 'candidate')}
- Account Created: {user_data.get('created_at', 'N/A')}
"""
        
        if resume_data:
            context += f"""
Resume Highlights:
- Title/Current Role: {resume_data.get('name', 'N/A')}
- Location: {resume_data.get('location', 'N/A')}
- Professional Summary: {resume_data.get('summary', 'Not provided')[:200]}
- Key Skills: {', '.join(resume_data.get('skills', [])[:10])}
- Years of Experience: {len(resume_data.get('experience', []))}
- Education: {resume_data.get('education', [{}])[0].get('degree', 'Not specified') if resume_data.get('education') else 'N/A'}
"""
        
        return context


class ChatbotService:
    """Main chatbot service with Claude integration."""
    
    SYSTEM_PROMPT_TEMPLATE = """You are an intelligent hiring assistant for the AI Hiring OS platform. Your role is to:

1. Help candidates prepare for job applications
2. Provide career guidance and skill recommendations
3. Suggest relevant job opportunities
4. Answer questions about roles, industries, and career development
5. Assist with interview preparation

Be friendly, professional, and encouraging. Provide specific, actionable advice.

User Context:
{user_context}

When the user asks about:
- Jobs: Use get_live_jobs tool to find relevant positions
- Salaries: Use get_salary_benchmark tool for market rates
- Skills: Use get_skill_demand tool to see trending skills

Always personalize recommendations based on their background and goals."""
    
    TOOLS = [
        {
            "name": "get_live_jobs",
            "description": "Find live job opportunities matching user's skills and preferences",
            "input_schema": {
                "type": "object",
                "properties": {
                    "job_title": {
                        "type": "string",
                        "description": "Job title to search for (e.g., 'Software Engineer', 'Data Scientist')"
                    },
                    "skills": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of skills to match"
                    },
                    "location": {
                        "type": "string",
                        "description": "Location preference (e.g., 'remote', 'New York', 'San Francisco')"
                    },
                },
                "required": ["job_title"],
            },
        },
        {
            "name": "get_salary_benchmark",
            "description": "Get salary benchmarks for a specific job role and location",
            "input_schema": {
                "type": "object",
                "properties": {
                    "job_title": {
                        "type": "string",
                        "description": "Job title (e.g., 'Senior Software Engineer')"
                    },
                    "location": {
                        "type": "string",
                        "description": "Location (e.g., 'remote', 'San Francisco', 'New York')"
                    },
                    "experience_level": {
                        "type": "string",
                        "description": "Experience level: 'entry', 'mid', 'senior', 'executive'"
                    },
                },
                "required": ["job_title", "experience_level"],
            },
        },
        {
            "name": "get_skill_demand",
            "description": "Get trending skills and demand information for a career path",
            "input_schema": {
                "type": "object",
                "properties": {
                    "career_path": {
                        "type": "string",
                        "description": "Career path (e.g., 'Software Engineering', 'Data Science', 'Product Management')"
                    },
                    "experience_level": {
                        "type": "string",
                        "description": "Experience level: 'entry', 'mid', 'senior'"
                    },
                },
                "required": ["career_path"],
            },
        },
    ]
    
    @staticmethod
    async def handle_tool_call(tool_name: str, tool_input: Dict[str, Any]) -> str:
        """
        Handle tool calls from Claude.
        
        In production, these would connect to actual data sources (Adzuna API, salary DB, etc.)
        """
        if tool_name == "get_live_jobs":
            return ChatbotService._get_live_jobs(tool_input)
        elif tool_name == "get_salary_benchmark":
            return ChatbotService._get_salary_benchmark(tool_input)
        elif tool_name == "get_skill_demand":
            return ChatbotService._get_skill_demand(tool_input)
        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})
    
    @staticmethod
    def _get_live_jobs(params: Dict[str, Any]) -> str:
        """
        Get live job opportunities from database.
        
        In production, this would connect to Adzuna API for additional jobs.
        For now, queries the database for posted jobs.
        """
        job_title = params.get("job_title", "").lower()
        skills = params.get("skills", [])
        location = params.get("location", "").lower() if params.get("location") else ""
        
        # Format response indicating real data source
        return json.dumps({
            "status": "success",
            "query": {
                "job_title": job_title,
                "skills_requested": skills,
                "location": location or "All",
            },
            "note": "This is a placeholder. Real job data would be queried from the database or Adzuna API.",
            "instructions": "To get live jobs, ensure ADZUNA_API_KEY is configured and job data has been ingested.",
        })
    
    @staticmethod
    def _get_salary_benchmark(params: Dict[str, Any]) -> str:
        """
        Get salary benchmarks for a role.
        
        In production, connects to a salary database or H1B visa data.
        """
        job_title = params.get("job_title", "Unknown")
        exp_level = params.get("experience_level", "mid")
        
        return json.dumps({
            "status": "info",
            "job_title": job_title,
            "experience_level": exp_level,
            "note": "Real salary data requires integration with salary databases (e.g., Levels.fyi API, H1B database, Kaggle datasets).",
            "next_steps": [
                "Configure salary data source in environment",
                "Ingest salary benchmark data into PostgreSQL",
                "Update this endpoint to query actual salary database"
            ],
        })
    
    @staticmethod
    def _get_skill_demand(params: Dict[str, Any]) -> str:
        """
        Get trending skills and demand for a career path.
        
        In production, connects to skill intelligence database built from job postings.
        """
        career_path = params.get("career_path", "Unknown")
        exp_level = params.get("experience_level", "mid")
        
        return json.dumps({
            "status": "info",
            "career_path": career_path,
            "experience_level": exp_level,
            "note": "Real skill demand data requires analyzing aggregated job postings and market trends.",
            "data_sources_needed": [
                "Job posting data (Adzuna, LinkedIn, Stack Overflow)",
                "Skill frequency analysis from multiple sources",
                "Time-series trends to identify growth rates"
            ],
            "next_steps": "Build skill intelligence service with NetworkX knowledge graph and periodic data ingestion"
        })
    
    @staticmethod
    async def chat(
        user_message: str,
        conversation_history: List[Dict[str, str]],
        user_context: str,
    ) -> tuple[str, List[Dict[str, str]]]:
        """
        Process user message and generate response with tool support.
        
        Args:
            user_message: User's message
            conversation_history: Previous messages
            user_context: User profile context
        
        Returns:
            (assistant_response, updated_conversation_history)
        """
        
        # Add user message to history
        conversation_history.append({
            "role": "user",
            "content": user_message,
        })
        
        # System prompt with user context
        system_prompt = ChatbotService.SYSTEM_PROMPT_TEMPLATE.format(
            user_context=user_context
        )
        
        # First API call
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system=system_prompt,
            tools=ChatbotService.TOOLS,
            messages=conversation_history,
        )
        
        # Handle tool use loop
        while response.stop_reason == "tool_use":
            # Extract tool use blocks
            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            
            # Add assistant response to history
            conversation_history.append({
                "role": "assistant",
                "content": response.content,
            })
            
            # Process each tool call
            tool_results = []
            for tool_use in tool_use_blocks:
                logger.info(f"Tool called: {tool_use.name}")
                result = await ChatbotService.handle_tool_call(
                    tool_use.name,
                    tool_use.input,
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": result,
                })
            
            # Add tool results to history
            conversation_history.append({
                "role": "user",
                "content": tool_results,
            })
            
            # Second API call with tool results
            response = anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                system=system_prompt,
                tools=ChatbotService.TOOLS,
                messages=conversation_history,
            )
        
        # Extract final text response
        final_response = ""
        for block in response.content:
            if hasattr(block, "text"):
                final_response += block.text
        
        # Add assistant message to history
        conversation_history.append({
            "role": "assistant",
            "content": final_response,
        })
        
        logger.info(f"Chat response generated ({len(final_response)} chars)")
        
        return final_response, conversation_history
