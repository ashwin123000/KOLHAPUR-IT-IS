"""
Match Engine Intelligence Builder
Generates comprehensive intelligence from match results:
- Insights
- Weaknesses
- Suggestions
- Interview Questions
- Confidence Score
- Explanation
- Score Breakdown
"""

from typing import Dict, List, Optional, Any
from .chatbot_datasets import SKILL_RESOURCES, INTERVIEW_QUESTIONS


def build_intelligence(
    seeker: Dict,
    job: Dict,
    match_result: Dict,
    role_data: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Generate comprehensive intelligence from a match result
    
    Args:
        seeker: Seeker profile document
        job: Job/project document
        match_result: Result from calculate_match_score()
                     Should contain: totalScore, matched, missing, missingMustHaves
        role_data: Optional role dataset entry
    
    Returns:
        Dictionary with all intelligence fields:
        - weaknesses
        - insights
        - suggestions
        - interviewQuestions
        - confidence
        - explanation
        - decision
        - scoreBreakdown
    """
    
    score = match_result.get("totalScore", 0)
    matched = match_result.get("matched", [])
    missing = match_result.get("missing", [])
    missing_must_haves = match_result.get("missingMustHaves", [])
    
    # Score component breakdown (if not provided, estimate)
    if "coreScore" not in match_result:
        core_score = 100 if len(missing_must_haves) == 0 else max(0, 100 - (len(missing_must_haves) * 20))
    else:
        core_score = match_result.get("coreScore", 0)
    
    if "supportScore" not in match_result:
        support_score = 100 if len(missing) == 0 else max(0, 100 - (len(missing) * 10))
    else:
        support_score = match_result.get("supportScore", 0)
    
    evidence_score = 75 if len(seeker.get("projects", [])) >= 2 else (50 if len(seeker.get("projects", [])) >= 1 else 25)
    
    # ========================================================================
    # INTELLIGENCE FIELD 1: WEAKNESSES
    # ========================================================================
    weaknesses = []
    
    # Add missing must-haves as high severity
    for skill in missing_must_haves[:5]:
        weaknesses.append({
            "skill": skill,
            "severity": "high",
            "reason": f"{skill} is a core requirement — candidates without it are typically filtered at the screening stage"
        })
    
    # Add missing supporting skills as medium severity (max 3 total)
    remaining_slots = max(0, 3 - len(weaknesses))
    for skill in missing[:remaining_slots]:
        if skill not in missing_must_haves:
            weaknesses.append({
                "skill": skill,
                "severity": "medium",
                "reason": f"{skill} is preferred for this role and improves your competitiveness"
            })
            
    # Add weakness for project evidence if it's low
    if evidence_score < 75 and len(weaknesses) < 3:
        weaknesses.append({
            "skill": "Project Portfolio",
            "severity": "medium",
            "reason": "Your profile lacks sufficient deployed projects or verifiable experience, which limits your overall match score."
        })
        
    # If weaknesses is still empty, add a generic competitiveness weakness
    if not weaknesses and score < 80:
        weaknesses.append({
            "skill": "Overall Competitiveness",
            "severity": "medium",
            "reason": "While you meet the core requirements, candidates with more extensive portfolios or specialized supporting skills typically score higher."
        })
    
    # ========================================================================
    # INTELLIGENCE FIELD 2: INSIGHTS
    # ========================================================================
    insights = []
    
    # Insight 1: Core skills alignment
    if core_score == 100 and len(missing_must_haves) == 0:
        insights.append(
            "Your core technical stack aligns well with what this role requires — "
            f"{', '.join(matched[:2]) if matched else 'your key skills'} are both present."
        )
    elif core_score < 50 and len(missing_must_haves) > 0:
        insights.append(
            f"This role has a hard requirement on {missing_must_haves[0]} — "
            "without this, most applicants are filtered before the interview stage."
        )
    elif len(missing_must_haves) > 0:
        insights.append(
            f"You're missing {len(missing_must_haves)} core skill(s) that this role requires. "
            "Adding these would make a significant difference in your candidacy."
        )
    
    # Insight 2: Project evidence
    num_projects = len(seeker.get("projects", []))
    if evidence_score < 50:
        insights.append(
            "Your profile has limited project evidence. Adding one deployed project with documentation "
            "can add up to 15 points to your match score."
        )
    
    # Insight 3: Overall assessment
    if score >= 70:
        insights.append(
            "You are in a competitive range for this role. Focus on closing the "
            f"{missing_must_haves[0] if missing_must_haves else 'remaining'} gap to move into the top tier of applicants."
        )
    elif score >= 50:
        insights.append(
            "You have relevant experience but are missing some key technical requirements. "
            "These gaps are bridgeable with focused effort."
        )
    
    # Limit to 4 insights max
    insights = insights[:4]
    
    # ========================================================================
    # INTELLIGENCE FIELD 3: SUGGESTIONS
    # ========================================================================
    suggestions = []
    
    # One suggestion per missing core skill (max 3)
    for skill in missing_must_haves[:3]:
        skill_lower = skill.lower()
        resource = SKILL_RESOURCES.get(skill_lower, {})
        
        # Calculate impact
        if len(missing_must_haves) == 1:
            impact = "+20%"
        else:
            impact = "+12%"
        
        time_to_learn = resource.get("learn_in", "3 weeks")
        project_idea = resource.get("project_idea", f"Build a project using {skill}")
        
        suggestions.append({
            "title": f"Close the {skill} gap",
            "impact": impact,
            "timeToLearn": time_to_learn,
            "steps": [
                f"Build a project that uses {skill} in the context of this role",
                f"Document it on GitHub with a clear README explaining how {skill} is used",
                f"Add {skill} to your skills section — this alone updates your match score immediately"
            ],
            "projectIdea": project_idea
        })
        
    # If suggestions is empty but evidence is low, suggest a project
    if not suggestions and evidence_score < 75:
        suggestions.append({
            "title": "Build a verifiable portfolio project",
            "impact": "+15%",
            "timeToLearn": "1-2 weeks",
            "steps": [
                "Build a project relevant to this role's domain",
                "Deploy the project to a live URL or ensure it is well documented on GitHub",
                "Add the project to your profile to increase your evidence score"
            ],
            "projectIdea": "A practical application demonstrating your core competencies in a real-world scenario"
        })
        
    # If suggestions is still empty and score < 85, suggest supporting skills
    if not suggestions and score < 85:
        suggestions.append({
            "title": "Expand supporting skills",
            "impact": "+10%",
            "timeToLearn": "Ongoing",
            "steps": [
                "Review the preferred tools or secondary domains for this role",
                "Complete a small certification or project using one of those tools",
                "Add the newly learned skill to your profile to boost your supporting score"
            ],
            "projectIdea": "Integrate an advanced tool into one of your existing projects"
        })
    
    # ========================================================================
    # INTELLIGENCE FIELD 4: INTERVIEW QUESTIONS
    # ========================================================================
    interview_questions = []
    
    # Try to find role-specific questions
    role_title = job.get("title", "Backend Developer") if job else "Backend Developer"
    role_key = None
    
    # Find best matching role key from interview questions dataset
    for key in INTERVIEW_QUESTIONS.keys():
        if key.lower() in role_title.lower():
            role_key = key
            break
    
    if not role_key:
        # Fallback based on keywords
        if "ml" in role_title.lower() or "machine" in role_title.lower():
            role_key = "machine learning engineer"
        elif "full" in role_title.lower():
            role_key = "full stack developer"
        elif "devops" in role_title.lower():
            role_key = "devops engineer"
        else:
            role_key = "backend developer"
    
    questions_bank = INTERVIEW_QUESTIONS.get(role_key, {})
    
    # 1-2 questions about skills they HAVE
    if matched and questions_bank.get("technical"):
        for q in questions_bank["technical"][:2]:
            if matched[0].lower() in q.lower():
                interview_questions.append(q)
                break
        
        # If no direct match, just use first 2 technical questions
        while len(interview_questions) < 2 and len(questions_bank.get("technical", [])) > len(interview_questions):
            q = questions_bank["technical"][len(interview_questions)]
            interview_questions.append(q)
    
    # 2 questions about core requirements of role
    if questions_bank.get("technical"):
        for q in questions_bank["technical"][2:4]:
            interview_questions.append(q)
    
    # 1-2 gap-based coaching questions
    if missing_must_haves and questions_bank.get("gap_based"):
        gap_base = questions_bank["gap_based"]
        for skill in missing_must_haves[:2]:
            if skill.lower() in gap_base:
                interview_questions.append(gap_base[skill.lower()])
    
    # Ensure we have 5-7 questions
    while len(interview_questions) < 5 and questions_bank.get("technical"):
        idx = len(interview_questions) % len(questions_bank["technical"])
        q = questions_bank["technical"][idx]
        if q not in interview_questions:
            interview_questions.append(q)
    
    interview_questions = interview_questions[:7]
    
    # ========================================================================
    # INTELLIGENCE FIELD 5: CONFIDENCE
    # ========================================================================
    skill_count_confidence = min(1.0, len(seeker.get("skills", [])) / 8) * 0.4
    project_count_confidence = (
        1.0 if len(seeker.get("projects", [])) >= 2 
        else 0.5 if len(seeker.get("projects", [])) == 1 
        else 0.0
    ) * 0.35
    dataset_anchored_confidence = (
        0.9 if job and job.get("datasetAnchored", False)
        else 0.6
    ) * 0.25
    
    confidence = round(
        skill_count_confidence + project_count_confidence + dataset_anchored_confidence,
        2
    )
    
    # ========================================================================
    # INTELLIGENCE FIELD 6: EXPLANATION
    # ========================================================================
    if score >= 80:
        explanation = "Strong match — your core skills align and you have project evidence to back them up."
    elif score >= 60:
        explanation = "Solid foundation — one or two skill gaps are holding you back from a top match."
    elif score >= 40:
        explanation = "Partial match — you have relevant experience but are missing critical technical requirements."
    else:
        explanation = "Significant gaps exist between your current profile and what this role requires."
    
    # ========================================================================
    # INTELLIGENCE FIELD 7: DECISION
    # ========================================================================
    if score >= 75:
        decision = "STRONG_MATCH"
    elif score >= 55:
        decision = "BORDERLINE"
    elif score >= 35:
        decision = "WEAK_MATCH"
    else:
        decision = "NOT_RECOMMENDED"
    
    # ========================================================================
    # INTELLIGENCE FIELD 8: SCORE BREAKDOWN
    # ========================================================================
    score_breakdown = {
        "coreSkills": {
            "score": core_score,
            "weight": 60,
            "contribution": round(core_score * 0.60)
        },
        "supportingSkills": {
            "score": support_score,
            "weight": 25,
            "contribution": round(support_score * 0.25)
        },
        "evidence": {
            "score": evidence_score,
            "weight": 15,
            "contribution": round(evidence_score * 0.15)
        }
    }
    
    # ========================================================================
    # RETURN ALL INTELLIGENCE
    # ========================================================================
    return {
        "weaknesses": weaknesses,
        "insights": insights,
        "suggestions": suggestions,
        "interviewQuestions": interview_questions,
        "confidence": confidence,
        "explanation": explanation,
        "decision": decision,
        "scoreBreakdown": score_breakdown
    }


def validate_intelligence_response(intelligence: Dict[str, Any]) -> bool:
    """
    Validate that all intelligence fields are present and properly formatted
    
    Args:
        intelligence: Intelligence object from build_intelligence()
    
    Returns:
        True if valid, False otherwise
    """
    required_fields = [
        "weaknesses",
        "insights",
        "suggestions",
        "interviewQuestions",
        "confidence",
        "explanation",
        "decision",
        "scoreBreakdown"
    ]
    
    for field in required_fields:
        if field not in intelligence:
            return False
        
        # Check array fields are arrays
        if field in ["weaknesses", "insights", "suggestions", "interviewQuestions"]:
            if not isinstance(intelligence[field], list):
                return False
        
        # Check numeric fields
        if field == "confidence":
            if not isinstance(intelligence[field], (int, float)):
                return False
    
    return True
