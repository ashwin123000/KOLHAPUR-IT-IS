"""
Resume enrichment service
Handles skill matching, enrichment, and analysis
"""
import logging
from typing import List, Dict, Tuple, Optional
from difflib import SequenceMatcher
from datetime import datetime

logger = logging.getLogger(__name__)

# Skill mappings for semantic matching
SKILL_SYNONYMS = {
    "javascript": ["js", "node", "nodejs", "node.js", "typescript", "ts"],
    "python": ["py", "django", "flask", "fastapi", "pandas", "numpy", "scipy"],
    "java": ["spring", "spring boot", "maven", "gradle", "junit"],
    "csharp": ["c#", ".net", "asp.net", "dotnet"],
    "go": ["golang"],
    "rust": ["cargo"],
    "sql": ["mysql", "postgresql", "postgres", "oracle", "sqlite", "tsql", "t-sql"],
    "nosql": ["mongodb", "mongo", "cassandra", "dynamodb", "couchdb", "redis"],
    "aws": ["amazon web services", "s3", "ec2", "lambda", "rds"],
    "azure": ["microsoft azure", "cosmos db", "app service"],
    "docker": ["containers", "containerization"],
    "kubernetes": ["k8s", "orchestration"],
    "git": ["github", "gitlab", "bitbucket", "version control"],
    "ci/cd": ["continuous integration", "continuous deployment", "jenkins", "gitlab-ci", "github actions"],
    "machine learning": ["ml", "deep learning", "tensorflow", "keras", "pytorch", "scikit-learn"],
    "web": ["html", "css", "react", "vue", "angular", "frontend"],
    "rest": ["rest api", "restful", "rest web service"],
    "graphql": ["graph query language"],
}

# Invert the synonyms for easier lookup
NORMALIZED_SKILLS = {}
for main_skill, synonyms in SKILL_SYNONYMS.items():
    NORMALIZED_SKILLS[main_skill.lower()] = main_skill
    for synonym in synonyms:
        NORMALIZED_SKILLS[synonym.lower()] = main_skill


class ResumeEnrichmentService:
    """Service for resume enrichment and analysis"""

    @staticmethod
    def normalize_skill(skill: str) -> str:
        """
        Normalize skill name to canonical form
        Args:
            skill: Raw skill name
        Returns:
            Normalized skill name
        """
        normalized = skill.lower().strip()
        return NORMALIZED_SKILLS.get(normalized, skill)

    @staticmethod
    def semantic_similarity(s1: str, s2: str) -> float:
        """
        Calculate semantic similarity between two strings
        Uses SequenceMatcher for string similarity with 0.0-1.0 score
        Args:
            s1: First string
            s2: Second string
        Returns:
            Similarity score 0.0-1.0
        """
        s1 = s1.lower().strip()
        s2 = s2.lower().strip()

        # Exact match
        if s1 == s2:
            return 1.0

        # Check synonyms
        normalized_s1 = ResumeEnrichmentService.normalize_skill(s1)
        normalized_s2 = ResumeEnrichmentService.normalize_skill(s2)

        if normalized_s1 == normalized_s2:
            return 0.95

        # Substring match
        if s1 in s2 or s2 in s1:
            return 0.8

        # SequenceMatcher for fuzzy matching
        matcher = SequenceMatcher(None, s1, s2)
        return matcher.ratio()

    @staticmethod
    def find_skill_match(
        resume_skill: str,
        github_skills: List[str],
        threshold: float = 0.7
    ) -> Optional[Tuple[str, float]]:
        """
        Find matching GitHub skill for resume skill
        Args:
            resume_skill: Skill from resume
            github_skills: List of skills from GitHub
            threshold: Minimum similarity threshold
        Returns:
            Tuple of (matched_skill, confidence_score) or None
        """
        best_match = None
        best_score = 0.0

        for github_skill in github_skills:
            score = ResumeEnrichmentService.semantic_similarity(resume_skill, github_skill)
            if score > best_score:
                best_score = score
                best_match = github_skill

        if best_score >= threshold:
            return (best_match, best_score)
        return None

    @staticmethod
    def match_skills(
        resume_skills: List[str],
        github_skills: Dict[str, int]
    ) -> Dict:
        """
        Match resume skills with GitHub skills
        Args:
            resume_skills: List of skills from resume
            github_skills: Dictionary of GitHub languages with counts
        Returns:
            Dictionary with matched skills and confidence scores
        """
        github_skill_list = list(github_skills.keys())
        matched_skills = {}
        unmatched_skills = []

        for resume_skill in resume_skills:
            match = ResumeEnrichmentService.find_skill_match(
                resume_skill,
                github_skill_list,
                threshold=0.6
            )

            if match:
                matched_skill, confidence = match
                matched_skills[resume_skill] = {
                    "matched_to": matched_skill,
                    "confidence": confidence,
                    "github_count": github_skills.get(matched_skill, 0),
                    "match_type": "github_verified"
                }
            else:
                unmatched_skills.append(resume_skill)

        return {
            "matched": matched_skills,
            "unmatched": unmatched_skills,
            "match_rate": len(matched_skills) / len(resume_skills) if resume_skills else 0,
        }

    @staticmethod
    def enrich_with_github_projects(
        resume_projects: List[Dict],
        github_repos: List[Dict],
        max_projects: int = 3
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Add top GitHub projects to resume projects
        Args:
            resume_projects: Existing projects from resume
            github_repos: GitHub repositories
            max_projects: Maximum projects to add
        Returns:
            Tuple of (enriched_projects, added_projects)
        """
        # Sort by quality (stars + forks)
        sorted_repos = sorted(
            github_repos,
            key=lambda x: x.get("stars", 0) + x.get("forks", 0),
            reverse=True
        )

        added_projects = []
        for repo in sorted_repos[:max_projects]:
            project = {
                "name": repo["name"],
                "description": repo.get("description", ""),
                "url": repo["url"],
                "technologies": repo.get("languages", []) + repo.get("topics", []),
                "source": "github",
                "stars": repo.get("stars", 0),
                "quality_score": ResumeEnrichmentService.calculate_project_quality(repo)
            }
            added_projects.append(project)

        enriched_projects = resume_projects + added_projects
        return enriched_projects, added_projects

    @staticmethod
    def calculate_project_quality(repo: Dict) -> float:
        """
        Calculate repository quality score
        Args:
            repo: Repository data
        Returns:
            Quality score 0.0-1.0
        """
        stars = min(repo.get("stars", 0) / 100, 0.5)
        forks = min(repo.get("forks", 0) / 50, 0.3)
        watchers = min(repo.get("watchers", 0) / 50, 0.2)
        return min(stars + forks + watchers, 1.0)

    @staticmethod
    def identify_skill_gaps(
        resume_skills: List[str],
        github_skills: Dict[str, int]
    ) -> List[str]:
        """
        Identify skills from GitHub that are missing in resume
        Args:
            resume_skills: Skills from resume
            github_skills: Skills from GitHub
        Returns:
            List of missing skills
        """
        missing = []
        resume_skills_normalized = [
            ResumeEnrichmentService.normalize_skill(s).lower() for s in resume_skills
        ]

        for github_skill in github_skills.keys():
            normalized_github = ResumeEnrichmentService.normalize_skill(github_skill).lower()
            if normalized_github not in resume_skills_normalized:
                missing.append(github_skill)

        return missing

    @staticmethod
    def generate_recommendations(
        resume_skills: List[str],
        github_skills: Dict[str, int],
        skill_matches: Dict
    ) -> List[str]:
        """
        Generate recommendations based on skill analysis
        Args:
            resume_skills: Skills from resume
            github_skills: Skills from GitHub
            skill_matches: Matched skills data
        Returns:
            List of recommendations
        """
        recommendations = []

        # Low match rate recommendation
        match_rate = skill_matches.get("match_rate", 0)
        if match_rate < 0.5 and len(resume_skills) > 0:
            recommendations.append(
                f"Only {match_rate*100:.0f}% of resume skills verified by GitHub. "
                "Consider updating resume with demonstrated project skills."
            )

        # Many unmatched skills
        unmatched = skill_matches.get("unmatched", [])
        if len(unmatched) > 3:
            recommendations.append(
                f"Found {len(unmatched)} unverified skills in resume. "
                "Add projects on GitHub to demonstrate these skills."
            )

        # Strong GitHub presence
        top_skill = next(iter(github_skills), None)
        if github_skills and top_skill:
            top_skill_count = github_skills[top_skill]
            if top_skill_count >= 3:
                recommendations.append(
                    f"Strong background in {top_skill} ({top_skill_count} projects). "
                    "Highlight this as primary expertise."
                )

        # Activity recommendation
        if not resume_skills:
            recommendations.append(
                "Resume lacks skill section. Add GitHub-demonstrated skills "
                "to improve profile match."
            )

        return recommendations if recommendations else [
            "Resume and GitHub profile align well. Keep demonstrating skills through projects."
        ]

    @staticmethod
    def create_skill_confidence_map(
        resume_skills: List[str],
        github_skills: Dict[str, int],
        skill_matches: Dict
    ) -> List[Dict]:
        """
        Create detailed skill confidence mapping
        Args:
            resume_skills: Skills from resume
            github_skills: Skills from GitHub
            skill_matches: Matched skills data
        Returns:
            List of skills with confidence scores
        """
        skills_with_confidence = []

        matched_skills = skill_matches.get("matched", {})

        for skill in resume_skills:
            if skill in matched_skills:
                match_data = matched_skills[skill]
                confidence_map = {
                    "name": skill,
                    "resume_confidence": 0.7,  # Assumed from resume
                    "github_confidence": match_data["confidence"],
                    "final_confidence": (0.7 + match_data["confidence"]) / 2,
                    "match_type": "verified",
                    "github_evidence": match_data["matched_to"]
                }
            else:
                confidence_map = {
                    "name": skill,
                    "resume_confidence": 0.7,
                    "github_confidence": 0.0,
                    "final_confidence": 0.4,  # Lower confidence for unverified
                    "match_type": "unverified",
                    "github_evidence": None
                }
            skills_with_confidence.append(confidence_map)

        return skills_with_confidence

    @staticmethod
    def generate_analysis_report(
        resume_data: Dict,
        candidate_data: Dict
    ) -> Dict:
        """
        Generate comprehensive analysis report
        Args:
            resume_data: Parsed resume data
            candidate_data: GitHub candidate data
        Returns:
            Analysis report dictionary
        """
        resume_skills = resume_data.get("skills", [])
        github_skills = candidate_data.get("languages", {})
        projects_count = len(resume_data.get("projects", []))
        github_projects_count = len(candidate_data.get("repositories", []))

        skill_matches = ResumeEnrichmentService.match_skills(resume_skills, github_skills)
        verified_skills = len(skill_matches.get("matched", {}))
        unverified_skills = len(skill_matches.get("unmatched", []))
        skill_confidence_list = ResumeEnrichmentService.create_skill_confidence_map(
            resume_skills, github_skills, skill_matches
        )

        overall_score = (
            (verified_skills / max(len(resume_skills), 1)) * 0.4 +  # Skill match
            min(projects_count / 5, 1.0) * 0.3 +  # Projects
            candidate_data.get("activity_score", 0.0) * 0.3  # GitHub activity
        )

        return {
            "total_skills": len(resume_skills),
            "verified_skills": verified_skills,
            "unverified_skills": unverified_skills,
            "skill_match_rate": skill_matches.get("match_rate", 0),
            "resume_projects": projects_count,
            "github_projects": github_projects_count,
            "github_activity_score": candidate_data.get("activity_score", 0.0),
            "overall_score": min(overall_score, 1.0),
            "skill_details": skill_confidence_list,
            "strengths": [
                f"Strong in {skill['name']}" for skill in skill_confidence_list
                if skill.get("final_confidence", 0) >= 0.8
            ],
            "gaps": [
                skill['name'] for skill in skill_confidence_list
                if skill.get("match_type") == "unverified"
            ],
            "recommendations": ResumeEnrichmentService.generate_recommendations(
                resume_skills, github_skills, skill_matches
            ),
            "generated_at": datetime.utcnow().isoformat()
        }
