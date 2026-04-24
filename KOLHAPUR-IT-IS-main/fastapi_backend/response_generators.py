"""
Response Generators
One function per intent — generates personalized, data-driven responses
Never returns hardcoded strings — always uses real data from seeker, job, datasets
"""

from typing import Dict, List, Optional, Any
from chatbot_datasets import SKILL_RESOURCES, ROLE_ROADMAPS, INTERVIEW_QUESTIONS
from chat_memory import has_recent_suggestion


def generate_improve_score_response(
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Response to: "How do I improve my score?"
    Shows gaps and actionable steps with estimated impact
    """
    if not match:
        return "I need job context to calculate your score. Are you viewing a specific job?"
    
    score = match.get("totalScore", 0)
    missing_core = match.get("missingCore", [])
    missing_support = match.get("missingSupport", [])
    
    response_parts = []
    response_parts.append(f"📊 Current Status:")
    response_parts.append(f"You are at {score}% match for {role_data.get('normalizedTitle', 'this role')}.")
    response_parts.append("")
    
    if missing_core:
        response_parts.append(f"🚫 What's Holding You Back:")
        for skill in missing_core[:3]:
            skill_resource = SKILL_RESOURCES.get(skill.lower())
            if skill_resource:
                reason = skill_resource.get("why_it_matters", f"{skill} is a core requirement")
                response_parts.append(f"• {skill}: {reason}")
            else:
                response_parts.append(f"• {skill}: This is a core requirement for this role")
        response_parts.append("")
    
    response_parts.append(f"🚀 What to Do (in order):")
    estimated_gain = 0
    for i, skill in enumerate(missing_core[:3], 1):
        skill_lower = skill.lower()
        skill_resource = SKILL_RESOURCES.get(skill_lower)
        time_to_learn = skill_resource.get("learn_in", "3 weeks") if skill_resource else "3 weeks"
        response_parts.append(f"{i}. Learn {skill} ({time_to_learn})")
        estimated_gain += 15
    
    for skill in missing_support[:2]:
        skill_lower = skill.lower()
        skill_resource = SKILL_RESOURCES.get(skill_lower)
        time_to_learn = skill_resource.get("learn_in", "2 weeks") if skill_resource else "2 weeks"
        response_parts.append(f"{len(missing_core) + 1}. Learn {skill} ({time_to_learn})")
        estimated_gain += 8
    
    response_parts.append("")
    response_parts.append(f"📈 Expected Result:")
    new_score = min(95, score + estimated_gain)
    response_parts.append(f"Fixing these gaps could bring your score to ~{new_score}%")
    
    return "\n".join(response_parts)


def generate_project_suggestion_response(
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Response to: "What project should I build?"
    Combines missing skills into a single project idea
    """
    if not match:
        return "I need job context to suggest relevant projects. Are you viewing a specific job?"
    
    missing_core = match.get("missingCore", [])
    missing_support = match.get("missingSupport", [])
    all_missing = missing_core + missing_support
    
    if not all_missing:
        return (f"✅ Great news! Your skill set matches this {role_data.get('normalizedTitle', 'role')} well. "
                f"Consider deepening your expertise in {match.get('matched', ['your core skills'])[0]} by building advanced projects.")
    
    response_parts = []
    
    # Find skills that can be covered by a single project
    primary_skill = missing_core[0] if missing_core else missing_support[0]
    primary_resource = SKILL_RESOURCES.get(primary_skill.lower(), {})
    
    response_parts.append(f"🛠️ Recommended Project for Your Profile:")
    response_parts.append("")
    
    # Combine related skills
    skills_to_cover = [primary_skill]
    if len(missing_core) > 1 and missing_core[1].lower() in ["model deployment", "docker", "fastapi"]:
        skills_to_cover.append(missing_core[1])
    
    response_parts.append(f"Project: {primary_resource.get('project_idea', f'Build with {primary_skill}')}")
    response_parts.append(f"Stack: {', '.join(skills_to_cover)}")
    response_parts.append(f"Context: {role_data.get('normalizedTitle', 'this role')}")
    response_parts.append("")
    
    response_parts.append(f"Skills This Covers:")
    for skill in skills_to_cover:
        response_parts.append(f"• {skill}")
    
    response_parts.append("")
    response_parts.append(f"Why This Project Specifically:")
    role_title = role_data.get('normalizedTitle', 'this role')
    response_parts.append(f"These skills are must-haves for {role_title}, and building real project evidence is the fastest path to a better match score.")
    
    response_parts.append("")
    difficulty = primary_resource.get("difficulty", "Beginner")
    response_parts.append(f"Time to Complete: {primary_resource.get('learn_in', '3-4 weeks')} (Difficulty: {difficulty})")
    response_parts.append(f"Score Impact: +15-25%")
    
    return "\n".join(response_parts)


def generate_interview_prep_response(
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Response to: "How do I prepare for interviews?"
    Pulls questions from dataset and personalizes to seeker's gaps
    """
    role_title = role_data.get('normalizedTitle', 'this role')
    role_key = None
    
    # Find matching role in interview questions database
    for key in INTERVIEW_QUESTIONS.keys():
        if key.lower() in role_title.lower():
            role_key = key
            break
    
    if not role_key:
        role_key = "backend developer"  # fallback
    
    questions_bank = INTERVIEW_QUESTIONS.get(role_key, {})
    missing_skills = match.get("missingCore", []) if match else []
    matched_skills = match.get("matched", []) if match else []
    
    response_parts = []
    response_parts.append(f"🎯 Interview Prep for {role_title}:")
    response_parts.append("")
    
    # Technical questions
    if questions_bank.get("technical"):
        response_parts.append(f"Technical Questions You'll Face:")
        for q in questions_bank["technical"][:4]:
            response_parts.append(f"▶ {q}")
        response_parts.append("")
    
    # Project-based questions
    if questions_bank.get("project_based"):
        response_parts.append(f"Project-Based Questions:")
        for q in questions_bank["project_based"][:2]:
            response_parts.append(f"▶ {q}")
        response_parts.append("")
    
    # Gap-based coaching
    if missing_skills and questions_bank.get("gap_based"):
        response_parts.append(f"For Your Weak Areas ({', '.join(missing_skills[:2])}):")
        gap_base = questions_bank["gap_based"]
        for skill in missing_skills[:2]:
            if skill.lower() in gap_base:
                response_parts.append(f"• {gap_base[skill.lower()]}")
        response_parts.append("")
    
    # Tip
    if matched_skills:
        response_parts.append(f"💡 Tip: Lead with your strength — {matched_skills[0]} is your best talking point.")
    
    return "\n".join(response_parts)


def generate_career_roadmap_response(
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Response to: "What's my career path to this role?"
    Shows phased roadmap, skipping phases seeker already has skills for
    """
    role_title = role_data.get('normalizedTitle', 'Backend Developer')
    
    # Find matching roadmap
    roadmap = None
    for key, data in ROLE_ROADMAPS.items():
        if key.lower() in role_title.lower():
            roadmap = data
            break
    
    if not roadmap:
        return f"I don't have a detailed roadmap for {role_title} yet. Ask me about specific skills instead."
    
    seeker_skills = set(s.get("skillNormalized", "").lower() for s in seeker.get("skills", []))
    phases = roadmap.get("phases", [])
    
    response_parts = []
    response_parts.append(f"🗺️ Your Roadmap to {role_title}:")
    response_parts.append("")
    
    completed_phases = 0
    for phase_data in phases:
        phase_skills = set(s.lower() for s in phase_data.get("skills", []))
        has_all_skills = phase_skills.issubset(seeker_skills)
        
        if has_all_skills:
            completed_phases += 1
        
        response_parts.append(f"Phase {phase_data['phase']} — {phase_data['name']} ({phase_data['duration']})")
        
        if not has_all_skills:
            missing_phase_skills = phase_skills - seeker_skills
            response_parts.append(f"Skills to Gain: {', '.join(list(missing_phase_skills)[:3])}")
        else:
            response_parts.append(f"✅ You have these skills already!")
        
        response_parts.append(f"Milestone: {phase_data['milestone']}")
        response_parts.append("")
    
    response_parts.append(f"Progress:")
    response_parts.append(f"You've completed approximately {completed_phases}/{len(phases)} phases.")
    
    total_duration = roadmap.get("total_duration", "12 weeks")
    response_parts.append(f"Estimated time to job-ready: {total_duration}")
    
    return "\n".join(response_parts)


def generate_skill_explanation_response(
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Response to: "What is Docker?" / "Explain Machine Learning"
    Pulls explanation from SKILL_RESOURCES dataset
    """
    # Extract skill name from message
    msg_lower = message.lower()
    skill_name = None
    
    # Try to find skill in SKILL_RESOURCES
    for skill in SKILL_RESOURCES.keys():
        if skill in msg_lower:
            skill_name = skill
            break
    
    if not skill_name:
        # Try partial match
        for skill in SKILL_RESOURCES.keys():
            if msg_lower in skill or skill in msg_lower:
                skill_name = skill
                break
    
    if not skill_name:
        return "I'm not sure which skill you're asking about. Try asking about Python, Docker, React, or another specific technology."
    
    resource = SKILL_RESOURCES.get(skill_name, {})
    seeker_skills = set(s.get("skillNormalized", "").lower() for s in seeker.get("skills", []))
    has_skill = skill_name.lower() in seeker_skills
    
    response_parts = []
    response_parts.append(f"📖 {skill_name.title()}:")
    response_parts.append("")
    
    response_parts.append(f"What it is:")
    response_parts.append(f"{resource.get('what_it_is', 'A technical skill')}")
    response_parts.append("")
    
    response_parts.append(f"Why it matters for your role:")
    response_parts.append(f"{resource.get('why_it_matters', 'An important industry skill')}")
    response_parts.append("")
    
    response_parts.append(f"How long to learn:")
    response_parts.append(f"{resource.get('learn_in', '4 weeks')}")
    response_parts.append("")
    
    response_parts.append(f"How to practice:")
    response_parts.append(f"{resource.get('project_idea', 'Build a real project using this skill')}")
    response_parts.append("")
    
    response_parts.append(f"Your current status:")
    response_parts.append(f"{'✅ You have this skill' if has_skill else '❌ Missing — would improve your match score'}")
    
    return "\n".join(response_parts)


def generate_job_understanding_response(
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Response to: "What will I do in this role?"
    Pulls from dataset role definition
    """
    if not job:
        return "I need a job context to explain the role. Are you viewing a specific job?"
    
    role_title = role_data.get('normalizedTitle', job.get("title", "this role"))
    responsibilities = job.get("responsibilities", []) or role_data.get("responsibilities", [])
    must_have = job.get("mustHaveSkills", []) or role_data.get("mustHaveSkills", [])
    supporting = job.get("supportingSkills", []) or role_data.get("supportingSkills", [])
    
    response_parts = []
    response_parts.append(f"💼 About This Role: {role_title}")
    response_parts.append("")
    
    response_parts.append(f"What You'll Actually Do:")
    if responsibilities:
        for resp in responsibilities[:4]:
            response_parts.append(f"• {resp}")
    else:
        response_parts.append("This is a specialized technical role focusing on core industry problems")
    response_parts.append("")
    
    response_parts.append(f"Core Skills the Role is Built Around:")
    for skill in must_have[:5]:
        response_parts.append(f"• {skill}")
    response_parts.append("")
    
    response_parts.append(f"Supporting Skills that Help:")
    for skill in supporting[:3]:
        response_parts.append(f"• {skill}")
    response_parts.append("")
    
    if match:
        response_parts.append(f"Your Fit Summary:")
        core_score = match.get("coreScore", 0)
        support_score = match.get("supportScore", 0)
        response_parts.append(f"You match {core_score}% of the core requirements and {support_score}% of the supporting ones.")
    
    return "\n".join(response_parts)


def generate_gap_analysis_response(
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Response to: "What am I missing?" / "What are my gaps?"
    Detailed breakdown of all gaps with learning time estimates
    """
    if not match:
        return "I need job context to analyze your gaps. Are you viewing a specific job?"
    
    missing_core = match.get("missingCore", [])
    missing_support = match.get("missingSupport", [])
    matched = match.get("matched", [])
    
    response_parts = []
    response_parts.append(f"🔍 Your Skill Gap for {role_data.get('normalizedTitle', 'this role')}:")
    response_parts.append("")
    
    if missing_core:
        response_parts.append(f"Missing Core Skills (critical):")
        for skill in missing_core:
            resource = SKILL_RESOURCES.get(skill.lower(), {})
            time = resource.get("learn_in", "3 weeks")
            response_parts.append(f"• {skill} ({time}): {resource.get('why_it_matters', 'Required for this role')}")
        response_parts.append("")
    
    if missing_support:
        response_parts.append(f"Missing Supporting Skills (improvable):")
        for skill in missing_support[:3]:
            resource = SKILL_RESOURCES.get(skill.lower(), {})
            time = resource.get("learn_in", "2 weeks")
            response_parts.append(f"• {skill} ({time})")
        response_parts.append("")
    
    if matched:
        response_parts.append(f"What You Already Have (Your Edge):")
        for skill in matched[:4]:
            response_parts.append(f"✓ {skill}")
        response_parts.append("")
    
    response_parts.append(f"Priority Order to Close Gaps:")
    response_parts.append("1. Focus on core skills first — they're blockers")
    response_parts.append("2. Then add supporting skills to become more competitive")
    
    return "\n".join(response_parts)


def generate_general_response(
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Fallback general response when no specific intent is detected
    Always reference real data — never generic
    """
    score = match.get("totalScore", 0) if match else None
    matched = match.get("matched", []) if match else []
    missing = match.get("missingCore", []) if match else []
    role_title = role_data.get('normalizedTitle', 'this role') if role_data else 'your target role'
    
    response_parts = []
    
    if score is not None:
        response_parts.append(f"You're currently at {score}% match for {role_title}.")
        response_parts.append("")
        
        if matched:
            response_parts.append(f"Your strongest skills: {', '.join(matched[:3])}")
        
        if missing:
            response_parts.append(f"Your biggest gap: {missing[0]}")
        response_parts.append("")
    
    response_parts.append(f"You can ask me about:")
    response_parts.append("• How to improve your score")
    response_parts.append("• What projects to build")
    response_parts.append("• How to prepare for interviews")
    response_parts.append("• Your career roadmap")
    response_parts.append("• Any specific skill or technology")
    
    return "\n".join(response_parts)


# Main dispatcher function
def generate_response(
    intent: str,
    seeker: Dict,
    job: Optional[Dict],
    role_data: Dict,
    match: Optional[Dict],
    history: List[Dict],
    message: str
) -> str:
    """
    Route to the correct response generator based on intent
    
    Args:
        intent: Detected intent string
        seeker: Seeker document from MongoDB
        job: Job document from MongoDB (optional)
        role_data: Dataset role entry
        match: Match result from match engine
        history: Chat history for this user
        message: Original user message
    
    Returns:
        Response string to send to user
    """
    generators = {
        "improve_score": generate_improve_score_response,
        "project_suggestion": generate_project_suggestion_response,
        "interview_prep": generate_interview_prep_response,
        "career_roadmap": generate_career_roadmap_response,
        "skill_explanation": generate_skill_explanation_response,
        "job_understanding": generate_job_understanding_response,
        "gap_analysis": generate_gap_analysis_response,
        "general": generate_general_response,
    }
    
    generator = generators.get(intent, generate_general_response)
    
    try:
        return generator(seeker, job, role_data, match, history, message)
    except Exception as e:
        # Fallback if generation fails
        return f"I ran into an issue generating that response. Try asking about a specific skill or your match score."
