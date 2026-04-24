"""
Matching Engine Service — Master Prompt V2.0
Job-Resume matching with skill gap analysis
"""

import logging
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class MatchingEngine:
    """Calculate match scores between job requirements and resume skills."""
    
    @staticmethod
    def calculate_skill_match(
        required_skills: List[Dict[str, Any]],
        resume_skills: List[str],
    ) -> Tuple[float, List[str], List[str]]:
        """
        Calculate skill match score (0-100).
        
        Args:
            required_skills: Job required skills [{skill, weight, required}, ...]
            resume_skills: Resume skill list ["skill1", "skill2", ...]
        
        Returns:
            (match_score, matched_skills, missing_skills)
        """
        if not required_skills:
            return 100.0, resume_skills[:5], []
        
        # Normalize resume skills to lowercase
        resume_skills_lower = [s.lower().strip() for s in resume_skills]
        
        required_skill_names = []
        required_skill_weights = {}
        required_skill_critical = {}
        
        # Extract skill info
        for skill_obj in required_skills:
            if isinstance(skill_obj, str):
                skill_name = skill_obj.lower().strip()
                required_skill_names.append(skill_name)
                required_skill_weights[skill_name] = 1.0
                required_skill_critical[skill_name] = True
            else:
                skill_name = skill_obj.get("skill", "").lower().strip()
                if skill_name:
                    required_skill_names.append(skill_name)
                    required_skill_weights[skill_name] = skill_obj.get("weight", 1.0)
                    required_skill_critical[skill_name] = skill_obj.get("required", True)
        
        if not required_skill_names:
            return 100.0, resume_skills[:5], []
        
        # Calculate matches with fuzzy matching
        matched = []
        missing = []
        
        for required_skill in required_skill_names:
            # Exact match or substring match
            if any(required_skill in rs or rs in required_skill for rs in resume_skills_lower):
                matched.append(required_skill)
            else:
                missing.append(required_skill)
        
        # Calculate weighted score
        total_weight = sum(
            required_skill_weights.get(s, 1.0) for s in required_skill_names
        )
        matched_weight = sum(
            required_skill_weights.get(s, 1.0) for s in matched
        )
        
        skill_match_score = (matched_weight / total_weight * 100) if total_weight > 0 else 0
        
        logger.info(
            f"Skill match: {skill_match_score:.1f}% "
            f"({len(matched)}/{len(required_skill_names)} skills matched)"
        )
        
        return skill_match_score, matched, missing
    
    @staticmethod
    def calculate_experience_match(
        job_experience_level: str,
        resume_experience: List[Dict],
    ) -> float:
        """
        Calculate experience level match (0-100).
        
        Args:
            job_experience_level: "entry", "mid", "senior", "executive"
            resume_experience: List of experience entries
        
        Returns:
            match_score (0-100)
        """
        if not resume_experience:
            return 20.0  # Penalize no experience
        
        # Count years of relevant experience
        years = len(resume_experience)
        
        level_thresholds = {
            "entry": (0, 2),      # 0-2 years
            "mid": (2, 7),        # 2-7 years
            "senior": (7, 15),    # 7-15 years
            "executive": (15, 50), # 15+ years
        }
        
        min_years, max_years = level_thresholds.get(job_experience_level, (0, 3))
        
        # Calculate match based on experience years
        if years < min_years:
            score = (years / min_years * 50) if min_years > 0 else 50
        elif years <= max_years:
            score = 100.0
        else:
            # Over-qualified (still good match, slight penalty)
            score = 95.0
        
        logger.info(f"Experience match: {score:.1f}% (resume: {years} years, req: {min_years}-{max_years})")
        return score
    
    @staticmethod
    def calculate_education_match(
        required_education: str,
        resume_education: List[Dict],
    ) -> float:
        """
        Calculate education match (0-100).
        
        Args:
            required_education: "high_school", "bachelors", "masters", "phd"
            resume_education: List of education entries
        
        Returns:
            match_score (0-100)
        """
        if not resume_education:
            return 30.0  # Penalize no education info
        
        education_levels = {
            "high_school": 1,
            "bachelors": 2,
            "masters": 3,
            "phd": 4,
        }
        
        required_level = education_levels.get(required_education, 1)
        
        # Get highest degree from resume
        max_resume_level = 0
        for edu in resume_education:
            degree = edu.get("degree", "").lower()
            if "phd" in degree or "doctorate" in degree:
                max_resume_level = 4
            elif "master" in degree:
                max_resume_level = max(max_resume_level, 3)
            elif "bachelor" in degree or "b.s." in degree or "b.a." in degree:
                max_resume_level = max(max_resume_level, 2)
            else:
                max_resume_level = max(max_resume_level, 1)
        
        # Calculate match
        if max_resume_level >= required_level:
            score = 100.0
        else:
            score = (max_resume_level / required_level * 100) if required_level > 0 else 50
        
        logger.info(f"Education match: {score:.1f}%")
        return score
    
    @staticmethod
    def calculate_overall_match(
        skill_match: float,
        experience_match: float,
        education_match: float,
        weights: Dict[str, float] = None,
    ) -> float:
        """
        Calculate overall weighted match score.
        
        Args:
            skill_match: Skill match score (0-100)
            experience_match: Experience match score (0-100)
            education_match: Education match score (0-100)
            weights: Component weights (default: skills=50%, experience=30%, education=20%)
        
        Returns:
            Overall match score (0-100)
        """
        if weights is None:
            weights = {
                "skills": 0.50,
                "experience": 0.30,
                "education": 0.20,
            }
        
        overall = (
            skill_match * weights["skills"] +
            experience_match * weights["experience"] +
            education_match * weights["education"]
        )
        
        return min(100.0, max(0.0, overall))  # Clamp to 0-100
    
    @staticmethod
    def generate_insights(
        matched_skills: List[str],
        missing_skills: List[str],
        match_score: float,
        experience_gap: int = 0,
    ) -> List[str]:
        """
        Generate human-readable match insights.
        
        Returns:
            List of insight strings
        """
        insights = []
        
        # Skill insights
        if match_score >= 90:
            insights.append(f"🌟 Excellent match! You have {len(matched_skills)} of the required skills.")
        elif match_score >= 70:
            insights.append(f"💼 Good match! You have {len(matched_skills)} of the required skills.")
        elif match_score >= 50:
            insights.append(f"📚 Moderate match. You're missing {len(missing_skills)} key skills.")
        else:
            insights.append(f"🔧 Consider developing these {len(missing_skills)} skills: {', '.join(missing_skills[:3])}")
        
        # Missing skills
        if missing_skills and len(missing_skills) <= 5:
            skills_str = ", ".join(missing_skills[:3])
            if len(missing_skills) > 3:
                skills_str += f", and {len(missing_skills)-3} more"
            insights.append(f"Gap: Missing {skills_str}")
        
        # Experience insights
        if experience_gap > 0:
            insights.append(f"📈 Gain {experience_gap} more years of experience to be a perfect fit.")
        
        # Encouragement
        if match_score >= 50:
            insights.append("✅ Consider applying! Your profile is relevant.")
        
        return insights
