"""
ARIA chat engine.

Deterministic, structured career guidance for the in-app chatbot.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import datetime
from typing import Any, Optional

from .chat_memory import (
    add_to_history,
    clear_history,
    get_session_state,
    update_session_state,
)
from .chatbot_datasets import INTERVIEW_QUESTIONS, ROLE_ROADMAPS, SKILL_RESOURCES
from .vector_store import format_retrieved_context, retrieve

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore


logger = logging.getLogger(__name__)


ROLE_LIBRARY: dict[str, dict[str, Any]] = {
    "backend engineer": {
        "aliases": ["backend", "backend engineer", "backend developer", "python backend", "api engineer"],
        "core": ["Python", "FastAPI", "REST APIs", "PostgreSQL", "Git", "Docker", "Testing"],
        "moderate": ["Redis", "CI/CD", "AWS"],
        "differentiators": ["System Design", "Kubernetes", "DevOps"],
        "projects": [
            {
                "name": "Auth Audit API",
                "skills": ["REST APIs", "PostgreSQL", "Testing"],
                "stack": "FastAPI + PostgreSQL + pytest + Docker",
                "mvp": "JWT auth, refresh tokens, RBAC, audit logs, pagination, OpenAPI docs",
                "stretch": "Redis token revocation, rate limiting, CI pipeline",
                "deploy": "Render API + Neon Postgres",
                "metric": "Handled 500 concurrent requests at <200ms p95 latency under k6 load testing.",
            },
            {
                "name": "Queue-Driven Notification Service",
                "skills": ["Redis", "Docker", "CI/CD"],
                "stack": "FastAPI + Redis + Celery/RQ + Docker Compose",
                "mvp": "Async jobs, retry handling, dead-letter logging, health endpoint",
                "stretch": "Prometheus metrics, GitHub Actions deploy",
                "deploy": "Railway or Render",
                "metric": "Processed 10,000 queued jobs with retry and failure visibility.",
            },
        ],
        "interview_focus": ["API design", "database indexing", "caching", "auth flows", "system design basics"],
    },
    "frontend engineer": {
        "aliases": ["frontend", "frontend engineer", "frontend developer", "react developer", "ui engineer"],
        "core": ["HTML/CSS", "JavaScript", "React", "TypeScript", "Git", "Testing"],
        "moderate": ["State Management", "REST APIs", "Performance Optimization"],
        "differentiators": ["Accessibility", "System Design", "CI/CD"],
        "projects": [
            {
                "name": "Role Match Dashboard",
                "skills": ["React", "TypeScript", "REST APIs"],
                "stack": "React + TypeScript + Vite + React Query",
                "mvp": "Search, filters, API integration, loading/error states, responsive layout",
                "stretch": "Optimistic updates, accessibility audit, unit tests",
                "deploy": "Vercel",
                "metric": "Kept p95 interaction latency under 100ms on the main search flow.",
            }
        ],
        "interview_focus": ["JavaScript fundamentals", "React rendering", "state trade-offs", "accessibility", "testing"],
    },
    "full stack developer": {
        "aliases": ["full stack", "fullstack", "full stack developer", "full stack engineer"],
        "core": ["React", "TypeScript", "Node.js", "REST APIs", "PostgreSQL", "Git"],
        "moderate": ["Docker", "Testing", "CI/CD"],
        "differentiators": ["Redis", "AWS", "System Design"],
        "projects": [
            {
                "name": "Interview Prep Platform",
                "skills": ["React", "Node.js", "PostgreSQL"],
                "stack": "React + Node.js + PostgreSQL + Prisma",
                "mvp": "Auth, CRUD, dashboard, role-based permissions, deployment",
                "stretch": "Realtime notifications, background jobs, analytics",
                "deploy": "Vercel + Railway",
                "metric": "Supported auth, CRUD, and role-based access in one deployed app.",
            }
        ],
        "interview_focus": ["frontend-backend integration", "schema design", "auth", "deployment", "testing"],
    },
    "data scientist": {
        "aliases": ["data scientist", "data science", "analytics scientist"],
        "core": ["Python", "SQL", "Statistics", "Scikit-learn"],
        "moderate": ["Pandas", "Data Visualization", "A/B Testing"],
        "differentiators": ["Model Deployment", "Apache Spark"],
        "projects": [
            {
                "name": "Retention Risk Lab",
                "skills": ["Statistics", "Scikit-learn", "SQL"],
                "stack": "Python + pandas + scikit-learn + Jupyter + SQL",
                "mvp": "EDA, feature engineering, classification model, evaluation dashboard",
                "stretch": "Drift analysis, Streamlit app, experiment recommendations",
                "deploy": "Streamlit Cloud",
                "metric": "Improved target metric over baseline with documented evaluation and error analysis.",
            }
        ],
        "interview_focus": ["statistics", "feature engineering", "evaluation metrics", "case studies", "business communication"],
    },
    "machine learning engineer": {
        "aliases": ["ml engineer", "machine learning engineer", "ai engineer", "llm engineer"],
        "core": ["Python", "Machine Learning", "Scikit-learn", "Model Deployment", "Docker"],
        "moderate": ["PyTorch", "FastAPI", "AWS"],
        "differentiators": ["Kubernetes", "Data Engineering", "System Design"],
        "projects": [
            {
                "name": "Model Serving Stack",
                "skills": ["Model Deployment", "Docker", "FastAPI"],
                "stack": "FastAPI + scikit-learn/PyTorch + Docker + GitHub Actions",
                "mvp": "Train model, expose prediction API, add versioned endpoint, log latency",
                "stretch": "Canary deploy, drift checks, cloud deployment",
                "deploy": "Render or AWS",
                "metric": "Served versioned predictions with latency tracking and deployment automation.",
            }
        ],
        "interview_focus": ["model evaluation", "serving", "MLOps", "trade-offs", "system design"],
    },
    "devops engineer": {
        "aliases": ["devops", "devops engineer", "platform engineer", "sre", "site reliability"],
        "core": ["Linux", "Docker", "CI/CD", "AWS", "Git"],
        "moderate": ["Kubernetes", "Terraform", "Monitoring"],
        "differentiators": ["System Design", "Redis", "Security"],
        "projects": [
            {
                "name": "Ship-It Pipeline",
                "skills": ["CI/CD", "Docker", "AWS"],
                "stack": "GitHub Actions + Docker + AWS + Terraform",
                "mvp": "Build, test, deploy pipeline with rollback and env separation",
                "stretch": "Kubernetes deploy, Prometheus alerts, incident runbook",
                "deploy": "AWS",
                "metric": "Reduced deployment steps to a single automated pipeline with rollback support.",
            }
        ],
        "interview_focus": ["infra as code", "deployment strategies", "incident response", "observability"],
    },
}

ROLE_KEYWORDS = {alias: role for role, data in ROLE_LIBRARY.items() for alias in data["aliases"]}

SOFT_SIGNAL_LIBRARY = {
    "startup": [
        ("Ownership", "They want people who fix problems outside their ticket boundary."),
        ("Ambiguity", "Requirements will be incomplete and you will be expected to decide."),
        ("Speed", "They accept some technical debt if you can ship and recover fast."),
    ],
    "enterprise": [
        ("Process discipline", "You need to work cleanly inside reviews, approvals, and compliance."),
        ("Communication", "Docs, stakeholder updates, and predictable delivery matter."),
        ("Change safety", "Rollback plans and low-risk delivery are part of the job."),
    ],
    "faang": [
        ("Structured thinking", "They care how you break problems down under pressure."),
        ("Trade-offs", "Average answers jump to one option. Strong answers compare options."),
        ("Scope elevation", "Senior candidates are expected to operate above ticket-level thinking."),
    ],
}

JD_PHRASE_MAP = {
    "fast-paced": "Low process maturity. Things move before requirements are fully defined.",
    "ambiguity": "You are expected to ask clarifying questions and create structure.",
    "ownership": "You own failures and follow problems through to stability.",
    "cross-functional": "You will work with product, design, and non-engineers often.",
    "self-starter": "Minimal onboarding. They expect you to ramp yourself quickly.",
    "wear many hats": "The team is thin. Your actual workload will exceed your title.",
    "move fast": "They prioritize speed and iteration over elegance.",
    "data-driven": "You need metrics and instrumentation, not opinions.",
    "strong communicator": "Your writing and explanation quality will be judged directly.",
}


def _utcnow() -> str:
    return datetime.utcnow().isoformat()


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _title_case(value: str) -> str:
    return " ".join(part.capitalize() for part in value.split())


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for item in items:
        normalized = item.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(normalized)
    return output


def _extract_role(text: str, context: Optional[dict[str, Any]] = None) -> Optional[str]:
    lowered = (text or "").lower()
    for alias, role in ROLE_KEYWORDS.items():
        if alias in lowered:
            return role
    for candidate in [
        (context or {}).get("job_title"),
        (context or {}).get("role"),
        (context or {}).get("title"),
    ]:
        if not candidate:
            continue
        candidate_lower = str(candidate).lower()
        for alias, role in ROLE_KEYWORDS.items():
            if alias in candidate_lower:
                return role
    return None


def _extract_structured_line(message: str) -> dict[str, str]:
    parts = [part.strip() for part in message.split("+")]
    if len(parts) < 4:
        return {}
    return {
        "target_role": parts[0],
        "current_skills": parts[1],
        "experience": parts[2],
        "problem": "+".join(parts[3:]).strip(),
    }


def _extract_skills_from_text(text: str) -> list[str]:
    lowered = text.lower()
    found: list[str] = []
    for skill in SKILL_RESOURCES.keys():
        if skill in lowered:
            found.append(_title_case(skill))
    return _dedupe(found)


def _message_claims_skills(message: str) -> bool:
    lowered = message.lower()
    return any(
        marker in lowered
        for marker in [
            "i know",
            "i use",
            "my skills",
            "current skills",
            "experience with",
            "worked with",
            "+",
        ]
    )


def _extract_skills_from_seeker(seeker: Optional[dict[str, Any]]) -> list[str]:
    if not seeker:
        return []
    values: list[str] = []
    for item in seeker.get("skills") or []:
        if isinstance(item, dict):
            value = item.get("skillNormalized") or item.get("skillRaw")
            if value:
                values.append(str(value))
        elif isinstance(item, str):
            values.append(item)
    return _dedupe(values)


def _extract_experience_level(message: str, seeker: Optional[dict[str, Any]], state: dict[str, Any]) -> str:
    lowered = message.lower()
    if any(term in lowered for term in ["senior", "staff", "lead", "architect", "8 years", "10 years"]):
        return "senior"
    if any(term in lowered for term in ["2 years", "3 years", "4 years", "5 years", "mid-level", "intermediate"]):
        return "mid"
    experience_items = (seeker or {}).get("experience") or []
    if len(experience_items) >= 3:
        return "senior"
    if len(experience_items) >= 1:
        return "mid"
    return state.get("experience_level") or "beginner"


def _extract_company_type(message: str, context: Optional[dict[str, Any]] = None) -> Optional[str]:
    lowered = message.lower()
    if any(term in lowered for term in ["amazon", "google", "meta", "netflix", "faang"]):
        return "faang"
    if "startup" in lowered:
        return "startup"
    if "enterprise" in lowered or "mnc" in lowered:
        return "enterprise"
    company = str((context or {}).get("company") or "").lower()
    if any(term in company for term in ["amazon", "google", "meta", "microsoft"]):
        return "faang"
    return None


def _classify_intent(message: str) -> str:
    lowered = message.lower().strip()
    if lowered.startswith("/mock") or "mock interview" in lowered or "interview me" in lowered:
        return "mock_interview"
    if any(term in lowered for term in ["resume", "cv", "bullet point", "ats"]):
        return "resume_feedback"
    if any(term in lowered for term in ["rejected", "rejection", "failed", "didn't clear", "not getting callbacks"]):
        return "rejection_analysis"
    if any(term in lowered for term in ["job description", "jd", "fit for this role", "what do they mean"]):
        return "jd_decode"
    if any(term in lowered for term in ["how do i become", "become", "transition", "switch into", "career path", "roadmap"]):
        return "roadmap_generation"
    if any(term in lowered for term in ["project", "portfolio", "what should i build"]):
        return "project_suggestion"
    if any(term in lowered for term in ["interview", "prepare", "questions", "system design"]) and "rejected" not in lowered:
        return "interview_prep"
    if any(term in lowered for term in ["what is", "explain", "should i learn", "difference between"]):
        return "technology_explanation"
    if any(term in lowered for term in ["vs ", " versus ", "compare ", "better for me"]):
        return "role_comparison"
    if any(term in lowered for term in ["missing", "gap", "ready", "am i ready", "what am i lacking"]):
        return "skill_gap_analysis"
    return "career_diagnosis"


def _skill_detail(skill: str) -> dict[str, str]:
    resource = SKILL_RESOURCES.get(skill.lower(), {})
    return {
        "name": _title_case(skill),
        "learn_in": resource.get("learn_in", "2-4 weeks"),
        "why": resource.get("why_it_matters", f"{_title_case(skill)} is commonly tested for this role."),
        "project_idea": resource.get("project_idea", f"Build one deployed project that proves {_title_case(skill)} in real use."),
    }


def _gap_breakdown(role: str, current_skills: list[str]) -> dict[str, list[str]]:
    role_data = ROLE_LIBRARY.get(role, {})
    current_lookup = {skill.lower() for skill in current_skills}
    return {
        "critical": [skill for skill in role_data.get("core", []) if skill.lower() not in current_lookup],
        "moderate": [skill for skill in role_data.get("moderate", []) if skill.lower() not in current_lookup],
        "differentiators": [skill for skill in role_data.get("differentiators", []) if skill.lower() not in current_lookup],
        "matched": [skill for skill in role_data.get("core", []) if skill.lower() in current_lookup],
    }


def _project_resume_bullet(project: dict[str, Any]) -> str:
    return (
        f'Built {project["name"]} using {project["stack"]}, implemented {project["skills"][0]} '
        f'with production-style workflows, and {project["metric"]}'
    )


def _technology_explanation(message: str) -> str:
    lowered = message.lower()
    if "backend development" in lowered or "backend engineer" in lowered or "backend developer" in lowered:
        return (
            "## Backend Development\n"
            "- What it is: building the server-side systems behind an app: APIs, business logic, databases, auth, background jobs, and integrations.\n"
            "- What backend engineers actually own: request handling, data modeling, validation, security, caching, and deployment reliability.\n"
            "- What hiring managers look for: one backend language, one framework, SQL depth, REST API design, testing, and one deployed service."
        )
    if "machine learning engineer" in lowered or "ml engineer" in lowered:
        return (
            "## Machine Learning Engineer\n"
            "- What it is: building models into real products, not just training notebooks.\n"
            "- What the role includes: feature pipelines, model evaluation, serving, monitoring, and deployment.\n"
            "- What hiring managers look for: Python, scikit-learn or PyTorch, API serving, Docker, and proof that you can ship models."
        )
    skill = next((name for name in SKILL_RESOURCES if name in lowered), None)
    if not skill:
        return (
            "## Explanation\n"
            "- Ask about a specific technology or role.\n"
            "- Good examples: `What is Kubernetes?`, `Should I learn Redis for backend roles?`, `What does a machine learning engineer do?`"
        )
    detail = _skill_detail(skill)
    return (
        f"## {_title_case(skill)}\n"
        f"- What it is: {SKILL_RESOURCES[skill].get('what_it_is')}\n"
        f"- Why it matters: {detail['why']}\n"
        f"- Best proof: {detail['project_idea']}"
    )


def _format_skill_gap(role: str, current_skills: list[str]) -> str:
    gaps = _gap_breakdown(role, current_skills)
    lines = ["## Skill Gap Breakdown"]
    if gaps["critical"]:
        lines.append("Critical")
        for index, skill in enumerate(gaps["critical"][:3], start=1):
            detail = _skill_detail(skill)
            lines.append(
                f"- {detail['name']}\n"
                f"  Priority: {'HIGH' if index <= 2 else 'MEDIUM'}\n"
                f"  Hiring reason: {detail['why']}\n"
                f"  Appears in: most JDs for this role\n"
                f"  Learn order: #{index}\n"
                f"  Time: {detail['learn_in']}"
            )
    if gaps["moderate"]:
        lines.append("Moderate")
        for index, skill in enumerate(gaps["moderate"][:3], start=len(gaps["critical"]) + 1):
            detail = _skill_detail(skill)
            lines.append(
                f"- {detail['name']}\n"
                f"  Priority: MEDIUM\n"
                f"  Hiring reason: {detail['why']}\n"
                f"  Appears in: many JDs for this role\n"
                f"  Learn order: #{index}\n"
                f"  Time: {detail['learn_in']}"
            )
    if gaps["differentiators"]:
        lines.append("Differentiators")
        for skill in gaps["differentiators"][:2]:
            lines.append(f"- {skill} - useful salary lever once the hiring floor is covered.")
    return "\n".join(lines)


def _format_projects(role: str) -> str:
    projects = ROLE_LIBRARY.get(role, {}).get("projects", [])[:2]
    lines = ["## Projects To Build"]
    for project in projects:
        lines.append(
            f"- {project['name']}\n"
            f"  Demonstrates: {', '.join(project['skills'])}\n"
            f"  Stack: {project['stack']}\n"
            f"  MVP: {project['mvp']}\n"
            f"  Stretch Goals: {project['stretch']}\n"
            f"  Deploy Target: {project['deploy']}\n"
            f'  Resume Bullet: "{_project_resume_bullet(project)}"'
        )
    return "\n".join(lines)


def _format_roadmap(role: str, current_skills: list[str], level: str) -> str:
    roadmap = ROLE_ROADMAPS.get(role, {})
    steps = ["## Roadmap", "Tier 1 - Base Skills"]
    current_lookup = {skill.lower() for skill in current_skills}
    count = 0
    for phase in roadmap.get("phases", [])[:4]:
        missing = [skill for skill in phase.get("skills", []) if skill.lower() not in current_lookup]
        if not missing and current_skills:
            continue
        count += 1
        learn = ", ".join(missing[:3] or phase.get("skills", [])[:3])
        failure = "tutorial dependency" if count == 1 else "stopping at theory"
        symptom = "You can follow examples but freeze on a blank project." if count == 1 else "You understand concepts but cannot ship proof."
        recovery = "Build one project from a blank file with no tutorial open." if count == 1 else "Deploy the milestone before adding new tools."
        steps.append(
            f"Step {count}: {phase['name']}\n"
            f"- Learn: {learn}\n"
            f"- Signal you're done: {phase['milestone']}\n"
            f"- Time: {phase['duration']}\n"
            f"- Blocker: {'Yes' if count == 1 else 'No'}\n"
            f"- Common failure: {failure}\n"
            f"- Symptom: {symptom}\n"
            f"- Recovery: {recovery}"
        )
    steps.append("Tier 2 - Salary Multipliers")
    if role == "machine learning engineer":
        steps.append("- Model Deployment: pays because companies hire people who can move models into products. Signal it with a served API and latency metrics.")
        steps.append("- System Design: pays because stronger ML roles include scaling and reliability trade-offs. Signal it with architecture docs and interview trade-offs.")
    elif role == "backend engineer":
        steps.append("- System Design: pays because senior backend roles are judged on trade-offs and scalability.")
        steps.append("- Distributed Systems: pays because high-growth teams value queueing, caching, and failure isolation.")
    else:
        steps.append("- Deployment depth: pays because shipping is worth more than local-only work.")
        steps.append("- System design basics: pays because it shows you can reason beyond syntax.")

    total_range = {
        "beginner": "6-10 months",
        "mid": "3-6 months",
        "senior": "1-3 months",
    }.get(level, "4-8 months")
    steps.append(
        "## Reality Check\n"
        f"At your current level + 10-15 focused hours/week:\n"
        f"- Time to job-ready: {total_range}\n"
        "- Assumes deliberate practice and real projects, not passive tutorials.\n"
        "- Most people stall right after the first guided project.\n"
        "- To push through: deploy the next project and write a clear README before moving on.\n"
        "- Accelerators: daily coding, one deployed project per phase, open-source contributions.\n"
        "- Decelerators: tutorial-only learning, too many languages at once, skipping fundamentals."
    )
    return "\n".join(steps)


def _build_rejection_diagnosis(role: str, current_skills: list[str], message: str) -> str:
    gaps = _gap_breakdown(role, current_skills)
    primary = (gaps["critical"] or ["deeper project proof"])[0]
    secondary = (gaps["critical"][1:2] or gaps["moderate"][:1] or ["interview structure"])[0]
    edge = "behavioral storytelling" if "interview" in message.lower() else "resume positioning"
    return (
        "## Rejection Diagnosis\n"
        f"Primary Cause (~65% likelihood)\n"
        f"- {primary}\n"
        f"- Evidence: your current stack is missing a role-critical hiring signal.\n"
        f"- What the screener saw: someone with some relevant tools, but not enough proof of job-ready depth.\n"
        f"Secondary Cause (~25% likelihood)\n"
        f"- {secondary}\n"
        f"- Evidence: this usually shows up during project deep-dives or technical follow-ups.\n"
        f"- What the screener saw: partial readiness, not confident execution.\n"
        f"Edge Cause (~10% likelihood)\n"
        f"- {edge}\n"
        f"- What the screener saw: weak proof of impact or weak explanation under pressure."
    )


def _decode_jd(message: str) -> str:
    lowered = message.lower()
    found = [(phrase, meaning) for phrase, meaning in JD_PHRASE_MAP.items() if phrase in lowered]
    if not found:
        found = [("ownership", JD_PHRASE_MAP["ownership"]), ("strong communicator", JD_PHRASE_MAP["strong communicator"])]
    lines = ["## JD Decoded"]
    for phrase, meaning in found[:3]:
        lines.append(
            f'- "{phrase}"\n'
            f"  Real meaning: {meaning}\n"
            f"  What they'll test: examples, ownership stories, and how you explain decisions.\n"
            f"  What to say: bring one concrete story where you handled this in practice."
        )
    return "\n".join(lines)


def _resume_feedback(message: str, role: Optional[str]) -> str:
    has_metric = bool(re.search(r"\b\d+[%xkKmM]?\b", message))
    has_links = "github.com" in message.lower() or "linkedin.com" in message.lower()
    lines = ["## Resume Improvements"]
    if not has_metric:
        lines.append("- Add metrics to every serious project or work bullet. Hiring managers trust proof, not adjectives.")
    if not has_links:
        lines.append("- Add GitHub and LinkedIn in the header. Missing links lowers trust immediately for technical roles.")
    lines.append("- Rewrite bullets as: action + system built + stack + measurable result.")
    if role:
        lines.append(f"- Tailor your skills and projects to {role} keywords before applying.")
    return "\n".join(lines)


def _format_hidden_signals(company_type: Optional[str]) -> Optional[str]:
    if not company_type:
        return None
    lines = ["## Hidden Hiring Signals", f"Company type: {company_type}"]
    for signal, meaning in SOFT_SIGNAL_LIBRARY.get(company_type, [])[:3]:
        lines.append(f"- {signal}: {meaning}")
    return "\n".join(lines)


def _mock_question(role: str, state: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    bank = INTERVIEW_QUESTIONS.get(role, INTERVIEW_QUESTIONS.get("backend developer", {}))
    ordered = (
        [(question, "technical") for question in bank.get("technical", [])]
        + [(question, "project") for question in bank.get("project_based", [])]
    )
    asked = set(state.get("asked_questions", []))
    for question, qtype in ordered:
        if question not in asked:
            return question, {"type": qtype, "asked_questions": [*state.get("asked_questions", []), question]}
    return "Walk me through your strongest project and the hardest technical decision you made.", state


def _evaluate_mock_answer(answer: str, current_question: str) -> str:
    clarity = 4 if len(answer.split()) > 40 else 2
    structure = 4 if any(term in answer.lower() for term in ["because", "trade-off", "result", "situation", "task"]) else 2
    depth = 4 if any(term in answer.lower() for term in ["latency", "index", "cache", "testing", "deployment", "trade-off"]) else 2
    hiring = 4 if len(answer.split()) > 60 else 2
    total = clarity + structure + depth + hiring
    verdict = "Pass" if total >= 14 else "Borderline" if total >= 10 else "Fail"
    return (
        "## Answer Evaluation\n"
        f"- Question: {current_question}\n"
        f"- Clarity: {clarity}/5\n"
        f"- Structure: {structure}/5\n"
        f"- Technical Depth: {depth}/5\n"
        f"- Hiring Signal: {hiring}/5\n"
        f"- Overall: {total}/20 ({verdict})\n"
        "- Ideal answer: start with context, name the constraint, explain the decision, then quantify the result and trade-off."
    )


def _career_query_prompt() -> str:
    return (
        "Tell me this in one line:\n\n"
        "Target role + your current skills + experience + what’s going wrong\n\n"
        "Example: Backend engineer + Python, FastAPI, PostgreSQL + 1 year + getting rejected after interviews"
    )


def _build_key_insight(intent: str, role: Optional[str], current_skills: list[str], message: str) -> str:
    if intent == "technology_explanation":
        if role:
            return f"{_title_case(role)} is not about collecting tools. It is about proving you can solve the problems that role is hired to own."
        return "Career questions are easiest to answer well when you anchor them to the actual job, not just buzzwords."
    if intent == "roadmap_generation" and role and not current_skills:
        return f"The fastest path into {_title_case(role)} is fundamentals first, then one proof project, then deployment."
    if intent == "rejection_analysis" and role:
        top_gap = (_gap_breakdown(role, current_skills)["critical"] or ["deeper project proof"])[0]
        return f"Your likely blocker is {top_gap}, not general talent. That kind of gap quietly kills interviews."
    if role and current_skills:
        top_gap = (_gap_breakdown(role, current_skills)["critical"] or _gap_breakdown(role, current_skills)["moderate"] or ["clearer project evidence"])[0]
        return f"You are close, but you are still missing {top_gap}, and hiring managers treat that as a real signal gap."
    return "I need your target role and current stack before I can diagnose this precisely."


def _build_next_step(role: Optional[str], current_skills: list[str], intent: str) -> str:
    if intent == "technology_explanation":
        if role == "backend engineer":
            return (
                "Pick one backend stack and build one deployed API this week.\n"
                "- Stack: Python + FastAPI + PostgreSQL\n"
                "- Proof: auth, CRUD, validation, tests, deployment\n"
                "- Goal: something you can explain end to end in an interview"
            )
        return "Ask about a target role or technology you want to move toward, and I’ll tell you what matters and what to ignore."
    if intent == "roadmap_generation" and role and not current_skills:
        return (
            f"Start with step 1 for {role} this week.\n"
            "- Do not learn three tools at once.\n"
            "- Finish one milestone project before adding more stack.\n"
            "- If you want a personalized gap analysis next, send your current skills and experience in one line."
        )
    if not role or not current_skills:
        return _career_query_prompt()
    top_gap = (_gap_breakdown(role, current_skills)["critical"] or _gap_breakdown(role, current_skills)["moderate"] or ["Git"])[0]
    detail = _skill_detail(top_gap)
    return (
        f"This week, focus on {top_gap} only.\n"
        f"- Learn: {detail['why']}\n"
        f"- Proof: {detail['project_idea']}\n"
        f"- Target time: {detail['learn_in']}"
    )


def _build_response_sections(
    intent: str,
    role: Optional[str],
    current_skills: list[str],
    level: str,
    message: str,
    company_type: Optional[str],
) -> list[str]:
    sections = [f"## Key Insight\n{_build_key_insight(intent, role, current_skills, message)}"]

    if intent == "technology_explanation":
        sections.append(_technology_explanation(message))
        sections.append(f"## Next Step\n{_build_next_step(role, current_skills, intent)}")
        return sections[:6]

    if intent == "roadmap_generation" and role and not current_skills:
        sections.append(_format_roadmap(role, current_skills, level))
        sections.append(f"## Next Step\n{_build_next_step(role, current_skills, intent)}")
        return sections[:6]

    if not role or not current_skills:
        sections.append(f"## Next Step\n{_build_next_step(role, current_skills, intent)}")
        return sections[:6]

    if intent in {"skill_gap_analysis", "career_diagnosis", "role_comparison"}:
        sections.append(_format_skill_gap(role, current_skills))
    if intent == "rejection_analysis":
        sections.append(_build_rejection_diagnosis(role, current_skills, message))
    if intent == "project_suggestion":
        sections.append(_format_projects(role))
    if intent == "roadmap_generation":
        sections.append(_format_skill_gap(role, current_skills))
        sections.append(_format_roadmap(role, current_skills, level))
    if intent == "resume_feedback":
        sections.append(_resume_feedback(message, role))
    if intent == "jd_decode":
        sections.append(_decode_jd(message))
    if intent == "interview_prep":
        focus = ", ".join(ROLE_LIBRARY.get(role, {}).get("interview_focus", [])[:5])
        sections.append(f"## Interview Prep Focus\n- Focus on: {focus}\n- Practice one project walkthrough, one debugging story, and one trade-off story.")

    hidden = _format_hidden_signals(company_type)
    if hidden and intent in {"rejection_analysis", "jd_decode", "interview_prep", "career_diagnosis"}:
        sections.append(hidden)

    if intent in {"skill_gap_analysis", "rejection_analysis", "project_suggestion", "career_diagnosis"}:
        sections.append(_format_projects(role))

    sections.append(f"## Next Step\n{_build_next_step(role, current_skills, intent)}")
    return sections[:6]


async def _fetch_seeker(db, user_id: str) -> Optional[dict[str, Any]]:
    seekers = getattr(db, "seekers", None)
    if not seekers:
        return None
    return await seekers.find_one({"userId": user_id})


def _serialize_timestamped(result: dict[str, Any]) -> dict[str, Any]:
    return {**result, "timestamp": _utcnow()}


def _build_retrieval_query(
    message: str,
    role: Optional[str],
    current_skills: list[str],
    intent: str,
    context: Optional[dict[str, Any]],
) -> str:
    parts = [message, intent]
    if role:
        parts.append(f"target role {role}")
    if current_skills:
        parts.append(f"skills {', '.join(current_skills[:8])}")
    if context:
        for key in ("job_title", "role", "company", "title"):
            value = context.get(key)
            if value:
                parts.append(f"{key} {value}")
    return " | ".join(part for part in parts if part)


def _build_grounded_system_prompt(
    message: str,
    role: Optional[str],
    current_skills: list[str],
    level: str,
    intent: str,
    retrieved_context: str,
    structured_reply: str,
) -> str:
    return (
        "You are ARIA, a career intelligence assistant.\n"
        "Answer using the retrieved context first and do not invent data.\n"
        "If the retrieved context is limited, say what is known and keep the answer practical.\n"
        "Keep the response structured, direct, and career-focused.\n\n"
        f"User message: {message}\n"
        f"Detected role: {role or 'unknown'}\n"
        f"Experience level: {level}\n"
        f"Intent: {intent}\n"
        f"Current skills: {', '.join(current_skills[:12]) or 'unknown'}\n\n"
        "Retrieved context:\n"
        f"{retrieved_context or 'No retrieved context available.'}\n\n"
        "Structured ARIA draft:\n"
        f"{structured_reply}\n"
    )


async def _maybe_generate_grounded_llm_reply(
    message: str,
    role: Optional[str],
    current_skills: list[str],
    level: str,
    intent: str,
    retrieved_context: str,
    structured_reply: str,
) -> Optional[str]:
    if not os.getenv("OPENAI_API_KEY") or OpenAI is None:
        return None

    prompt = _build_grounded_system_prompt(
        message=message,
        role=role,
        current_skills=current_skills,
        level=level,
        intent=intent,
        retrieved_context=retrieved_context,
        structured_reply=structured_reply,
    )

    def _call_openai() -> str:
        client = OpenAI()
        response = client.chat.completions.create(
            model=os.getenv("ARIA_CHAT_MODEL", "gpt-4o-mini"),
            temperature=0.3,
            messages=[
                {"role": "system", "content": "Be precise, grounded, and concise."},
                {"role": "user", "content": prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()

    try:
        reply = await asyncio.to_thread(_call_openai)
        return reply or None
    except Exception as exc:  # pragma: no cover
        logger.warning("OpenAI grounded synthesis failed, using deterministic reply: %s", exc)
        return None


async def run_chat(
    message: str,
    user_id: str,
    job_id: Optional[str],
    db,
    path: str = "/",
    history: Optional[list[dict[str, Any]]] = None,
    context: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    del job_id, path, history

    message = _normalize_text(message)
    if not message:
        return _serialize_timestamped({"reply": "Please type a message.", "intent": "career_diagnosis"})

    seeker = await _fetch_seeker(db, user_id)
    state = get_session_state(user_id)
    parsed_line = _extract_structured_line(message)
    if parsed_line:
        state.update(
            {
                "target_role": _extract_role(parsed_line.get("target_role", ""), context) or parsed_line.get("target_role"),
                "current_skills": _extract_skills_from_text(parsed_line.get("current_skills", "")),
                "experience_summary": parsed_line.get("experience"),
                "last_problem": parsed_line.get("problem"),
            }
        )

    seeker_skills = _extract_skills_from_seeker(seeker)
    message_skills = _extract_skills_from_text(message) if _message_claims_skills(message) else []
    current_skills = _dedupe(state.get("current_skills", []) + message_skills + seeker_skills)
    role = _extract_role(message, context) or state.get("target_role")
    intent = _classify_intent(message)
    level = _extract_experience_level(message, seeker, state)
    company_type = _extract_company_type(message, context)

    state.update(
        {
            "target_role": role,
            "current_skills": current_skills,
            "experience_level": level,
            "last_intent": intent,
        }
    )
    retrieval_query = _build_retrieval_query(message, role, current_skills, intent, context)
    retrieved_documents = retrieve(retrieval_query, k=5)
    retrieved_context = format_retrieved_context(retrieved_documents)

    if message.lower() == "/end" and state.get("mode") == "mock":
        asked = state.get("asked_questions", [])
        reply = (
            "## Session Summary\n"
            f"- Questions attempted: {len(asked)}\n"
            "- Strongest area: clarity if you kept answers structured.\n"
            "- Weakest area: technical depth if you skipped trade-offs or metrics.\n"
            "## Next Step\n"
            "Do one more mock round tomorrow and include one concrete metric in every answer."
        )
        state.update({"mode": None, "current_question": None, "asked_questions": []})
        update_session_state(user_id, state)
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", reply)
        return _serialize_timestamped({"reply": reply, "intent": "mock_interview", "intentLabel": "Mock Interview"})

    if state.get("mode") == "mock" and intent != "mock_interview":
        current_question = state.get("current_question") or "Tell me about your strongest project."
        feedback = _evaluate_mock_answer(message, current_question)
        next_question, question_state = _mock_question(role or "backend engineer", state)
        state.update({"current_question": next_question, "asked_questions": question_state.get("asked_questions", [])})
        update_session_state(user_id, state)
        reply = f"{feedback}\n\n## Next Question\n{next_question}\n\n## Next Step\nAnswer in STAR or explain -> example -> trade-off format."
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", reply)
        return _serialize_timestamped({"reply": reply, "intent": "mock_interview", "intentLabel": "Mock Interview"})

    if intent == "mock_interview":
        role = role or "backend engineer"
        question, question_state = _mock_question(role, state)
        state.update({"mode": "mock", "current_question": question, "asked_questions": question_state.get("asked_questions", [])})
        update_session_state(user_id, state)
        reply = (
            "## Mock Interview Mode\n"
            f"- Role: {role}\n"
            f"- Level: {level}\n"
            "- I will ask one question at a time and score your answer.\n\n"
            f"### First Question\n{question}\n\n"
            "## Next Step\nAnswer as if this is a real interview. Type `/end` when you want to stop."
        )
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", reply)
        return _serialize_timestamped({"reply": reply, "intent": "mock_interview", "intentLabel": "Mock Interview"})

    if intent in {"skill_gap_analysis", "project_suggestion", "career_diagnosis"} and (not role or not current_skills):
        reply = _career_query_prompt()
        update_session_state(user_id, state)
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", reply)
        return _serialize_timestamped({"reply": reply, "intent": intent, "intentLabel": "Career Diagnosis"})

    sections = _build_response_sections(intent, role, current_skills, level, message, company_type)
    if retrieved_context:
        sections.insert(-1 if sections else 0, retrieved_context)
    structured_reply = "\n\n".join(sections)
    reply = await _maybe_generate_grounded_llm_reply(
        message=message,
        role=role,
        current_skills=current_skills,
        level=level,
        intent=intent,
        retrieved_context=retrieved_context,
        structured_reply=structured_reply,
    ) or structured_reply

    update_session_state(user_id, state)
    add_to_history(user_id, "user", message)
    add_to_history(user_id, "assistant", reply)
    return _serialize_timestamped(
        {
            "reply": reply,
            "intent": intent,
            "intentLabel": _title_case(intent.replace("_", " ")),
            "detectedRole": role,
            "profile": {
                "target_role": role,
                "current_skills": current_skills[:12],
                "experience_level": level,
            },
            "retrievedContextCount": len(retrieved_documents),
            "retrievedSources": [doc.source for doc in retrieved_documents[:5]],
        }
    )


async def clear_chat_history(user_id: str, db=None) -> dict[str, str]:
    del db
    clear_history(user_id)
    update_session_state(user_id, {"mode": None, "current_question": None, "asked_questions": []})
    return {"status": "cleared"}
