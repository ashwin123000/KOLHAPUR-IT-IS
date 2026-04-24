"""
ARIA Chat Engine
Structured career diagnostic engine for the in-app chatbot.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId

from .chat_memory import (
    add_to_history,
    clear_history,
    get_history,
    get_session_state,
    update_session_state,
)
from .chatbot_datasets import INTERVIEW_QUESTIONS, ROLE_ROADMAPS, SKILL_RESOURCES
from .services.seeker_intelligence import seeker_intelligence_service


ROLE_LIBRARY: dict[str, dict[str, Any]] = {
    "backend engineer": {
        "aliases": ["backend", "backend engineer", "backend developer", "python backend", "java backend", "api engineer"],
        "core": ["Python", "FastAPI", "REST APIs", "PostgreSQL", "Git", "Docker", "Testing"],
        "moderate": ["Redis", "CI/CD", "AWS"],
        "differentiators": ["System Design", "Kubernetes", "DevOps"],
        "projects": [
            {
                "name": "Auth Audit API",
                "skills": ["REST APIs", "PostgreSQL", "Testing"],
                "stack": "FastAPI + PostgreSQL + pytest + Docker",
                "mvp": "JWT auth, refresh tokens, RBAC, audit logs, pagination, OpenAPI docs",
                "stretch": "Redis session invalidation, rate limiting, CI pipeline",
                "deploy": "Render API + Neon Postgres",
            },
            {
                "name": "Queue-Driven Notification Service",
                "skills": ["Redis", "Docker", "CI/CD"],
                "stack": "FastAPI + Redis + Celery/RQ + Docker Compose",
                "mvp": "Async job queue, retry handling, dead-letter logging, health endpoint",
                "stretch": "Prometheus metrics, GitHub Actions deploy",
                "deploy": "Railway or Render",
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
            },
            {
                "name": "Accessibility Review Board",
                "skills": ["Accessibility", "Testing", "Performance Optimization"],
                "stack": "React + Vitest + Lighthouse",
                "mvp": "Keyboard nav, semantic landmarks, ARIA labels, perf budget report",
                "stretch": "Storybook docs, E2E tests",
                "deploy": "Netlify",
            },
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
                "stretch": "Drift analysis, streamlit app, experiment recommendations",
                "deploy": "Streamlit Cloud",
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
            }
        ],
        "interview_focus": ["infra as code", "deployment strategies", "incident response", "observability"],
    },
}

SOFT_SIGNAL_LIBRARY = {
    "startup": [
        ("Ownership", "You will be expected to fix problems outside your ticket boundary."),
        ("Ambiguity", "Requirements will be incomplete. They want engineers who can decide without hand-holding."),
        ("Speed", "They will tolerate technical debt if you can ship and recover quickly."),
    ],
    "enterprise": [
        ("Process discipline", "They want engineers who can work within reviews, approvals, and compliance."),
        ("Cross-functional communication", "You will be judged on documentation and stakeholder updates, not just code."),
        ("Change safety", "They care about reliability, rollback plans, and low-risk delivery."),
    ],
    "faang": [
        ("Structured thinking", "They care how you break problems down under pressure."),
        ("Trade-off awareness", "Strong candidates compare options instead of jumping to one answer."),
        ("Scope elevation", "Senior candidates are expected to think one level above their title."),
    ],
}

JD_PHRASE_MAP = {
    "fast-paced": "Low process, high ambiguity, fast decisions.",
    "ambiguity": "No one will hand you perfect specs. You are expected to scope and clarify.",
    "ownership": "If the feature breaks, they expect you to stay with the problem until it is stable.",
    "cross-functional": "You will work with product, design, and non-engineers constantly.",
    "self-starter": "Expect light onboarding and minimal supervision.",
    "wear many hats": "The team is thin. Your title will not contain your full workload.",
    "move fast": "They prioritize speed over elegance when trade-offs appear.",
    "data-driven": "You need metrics, instrumentation, and evidence, not opinions.",
    "strong communicator": "Your writing and explanation quality matter in reviews and interviews.",
}

ROLE_KEYWORDS = {alias: role for role, data in ROLE_LIBRARY.items() for alias in data["aliases"]}


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
        key = item.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(item.strip())
    return output


def _extract_role(text: str, job: Optional[dict[str, Any]] = None, context: Optional[dict[str, Any]] = None) -> Optional[str]:
    lowered = (text or "").lower()
    for alias, role in ROLE_KEYWORDS.items():
        if alias in lowered:
            return role
    candidates = [
        ((context or {}).get("job_title") or ""),
        ((context or {}).get("role") or ""),
        ((job or {}).get("title") or ""),
    ]
    for candidate in candidates:
        if not candidate:
            continue
        candidate_lower = candidate.lower()
        for alias, role in ROLE_KEYWORDS.items():
            if alias in candidate_lower:
                return role
    return None


def _extract_experience_level(message: str, seeker: Optional[dict[str, Any]], state: dict[str, Any]) -> str:
    lowered = message.lower()
    if any(term in lowered for term in ["senior", "staff", "lead", "architect", "10 years", "8 years", "7 years"]):
        return "senior"
    if any(term in lowered for term in ["2 years", "3 years", "4 years", "5 years", "mid-level", "intermediate"]):
        return "mid"
    experience_items = (seeker or {}).get("experience") or []
    if len(experience_items) >= 3:
        return "senior"
    if len(experience_items) >= 1:
        return "mid"
    if state.get("experience_level"):
        return state["experience_level"]
    return "beginner"


def _extract_company_type(message: str, job: Optional[dict[str, Any]] = None) -> Optional[str]:
    lowered = message.lower()
    if any(term in lowered for term in ["amazon", "google", "meta", "netflix", "faang"]):
        return "faang"
    if "startup" in lowered:
        return "startup"
    if "enterprise" in lowered or "mnc" in lowered:
        return "enterprise"
    company = ((job or {}).get("company") or "").lower()
    if any(term in company for term in ["amazon", "google", "meta", "microsoft"]):
        return "faang"
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
    explicit: list[str] = []
    for skill in SKILL_RESOURCES.keys():
        if skill in lowered:
            explicit.append(_title_case(skill))
    comma_candidates = re.split(r"[,\n/]", text)
    for token in comma_candidates:
        cleaned = token.strip()
        if 2 <= len(cleaned) <= 30 and cleaned.lower() in SKILL_RESOURCES:
            explicit.append(_title_case(cleaned.lower()))
    return _dedupe(explicit)


def _extract_skills_from_seeker(seeker: Optional[dict[str, Any]]) -> list[str]:
    if not seeker:
        return []
    raw_skills = seeker.get("skills") or []
    values: list[str] = []
    for skill in raw_skills:
        if isinstance(skill, dict):
            normalized = skill.get("skillNormalized") or skill.get("skillRaw")
            if normalized:
                values.append(str(normalized))
        elif isinstance(skill, str):
            values.append(skill)
    return _dedupe(values)


def _classify_intent(message: str) -> str:
    lowered = message.lower().strip()
    if lowered.startswith("/mock") or "mock interview" in lowered or "interview me" in lowered:
        return "mock_interview"
    if any(term in lowered for term in ["resume", "cv", "bullet point", "ats"]):
        return "resume_feedback"
    if any(term in lowered for term in ["rejected", "rejection", "failed", "didn't clear", "got rejected"]):
        return "rejection_analysis"
    if any(term in lowered for term in ["job description", "jd", "fit for this role", "what do they mean"]):
        return "jd_decode"
    if any(term in lowered for term in ["roadmap", "become", "transition", "switch into", "career path"]):
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
        "why": resource.get("why_it_matters", f"{_title_case(skill)} is frequently tested for this role."),
        "project_idea": resource.get("project_idea", f"Build one deployed project that proves {_title_case(skill)} in real use."),
    }


def _gap_breakdown(role: str, current_skills: list[str]) -> dict[str, list[str]]:
    role_data = ROLE_LIBRARY.get(role, {})
    current_lookup = {skill.lower() for skill in current_skills}
    critical = [skill for skill in role_data.get("core", []) if skill.lower() not in current_lookup]
    moderate = [skill for skill in role_data.get("moderate", []) if skill.lower() not in current_lookup]
    differentiators = [skill for skill in role_data.get("differentiators", []) if skill.lower() not in current_lookup]
    return {
        "critical": critical,
        "moderate": moderate,
        "differentiators": differentiators,
        "matched": [skill for skill in role_data.get("core", []) if skill.lower() in current_lookup],
    }


def _role_requirements_text(role: str) -> str:
    role_data = ROLE_LIBRARY.get(role, {})
    required = role_data.get("core", [])[:5]
    if not required:
        return "a clearer target stack"
    return ", ".join(required)


def _format_skill_gap(role: str, current_skills: list[str]) -> str:
    gaps = _gap_breakdown(role, current_skills)
    lines = [f"## 📉 Skill Gap Breakdown"]
    if gaps["critical"]:
        lines.append("🔴 **Critical**")
        for index, skill in enumerate(gaps["critical"][:3], start=1):
            detail = _skill_detail(skill)
            priority = "HIGH" if index <= 2 else "MEDIUM"
            lines.append(
                f"- **{detail['name']}**\n"
                f"  Priority: {priority}\n"
                f"  Hiring reason: {detail['why']}\n"
                f"  Learn order: #{index}\n"
                f"  Time to working proficiency: {detail['learn_in']}"
            )
    if gaps["moderate"]:
        lines.append("🟡 **Moderate**")
        for skill in gaps["moderate"][:3]:
            detail = _skill_detail(skill)
            lines.append(f"- **{detail['name']}** — {detail['why']} ({detail['learn_in']})")
    if gaps["differentiators"]:
        lines.append("🟢 **Differentiators**")
        for skill in gaps["differentiators"][:2]:
            detail = _skill_detail(skill)
            lines.append(f"- **{detail['name']}** — salary lever once the basics are already solid.")
    return "\n".join(lines)


def _project_resume_bullet(project: dict[str, Any]) -> str:
    return (
        f"Built **{project['name']}**, a production-style system using {project['stack']}, "
        f"implementing {project['skills'][0]} with measurable reliability checks and deployment workflow."
    )


def _format_projects(role: str, current_skills: list[str]) -> str:
    role_data = ROLE_LIBRARY.get(role, {})
    projects = role_data.get("projects", [])[:2]
    lines = ["## 🚀 Projects To Build"]
    for project in projects:
        lines.append(
            f"- **{project['name']}**\n"
            f"  Demonstrates: {', '.join(project['skills'])}\n"
            f"  Stack: {project['stack']}\n"
            f"  MVP: {project['mvp']}\n"
            f"  Stretch: {project['stretch']}\n"
            f"  Deploy: {project['deploy']}\n"
            f"  Resume bullet: {_project_resume_bullet(project)}"
        )
    if not projects:
        gaps = _gap_breakdown(role, current_skills)
        top_gap = (gaps["critical"] or gaps["moderate"] or ["Git"])[0]
        detail = _skill_detail(top_gap)
        lines.append(
            f"- Build one deployed project around **{top_gap}**.\n"
            f"  Demonstrates: {detail['why']}\n"
            f"  MVP: {detail['project_idea']}"
        )
    return "\n".join(lines)


def _format_roadmap(role: str, current_skills: list[str], level: str) -> str:
    roadmap = ROLE_ROADMAPS.get(role)
    steps: list[str] = ["## 🗺️ Roadmap"]
    order = 1
    if roadmap:
        for phase in roadmap.get("phases", [])[:4]:
            missing = [skill for skill in phase.get("skills", []) if skill.lower() not in {s.lower() for s in current_skills}]
            if not missing:
                continue
            top_skill = missing[0]
            detail = _skill_detail(top_skill)
            failure = {
                "What it looks like": "You can follow tutorials but freeze on a blank project.",
                "How to push through": "Build one feature from scratch without copy-pasting.",
            }
            steps.append(
                f"{order}. **{phase['name']}**\n"
                f"   Learn: {', '.join(missing[:3])}\n"
                f"   Signal you're done: {phase['milestone']}\n"
                f"   Time estimate: {phase['duration']}\n"
                f"   Common failure: tutorial dependency.\n"
                f"   Recovery: {failure['How to push through']}"
            )
            order += 1
            if order > 4:
                break
    else:
        gaps = _gap_breakdown(role, current_skills)
        for skill in (gaps["critical"] + gaps["moderate"])[:4]:
            detail = _skill_detail(skill)
            steps.append(
                f"{order}. **{detail['name']}**\n"
                f"   Learn: {detail['why']}\n"
                f"   Signal you're done: Build and deploy one proof project.\n"
                f"   Time estimate: {detail['learn_in']}\n"
                f"   Common failure: stopping at theory.\n"
                f"   Recovery: ship a small real project before moving on."
            )
            order += 1
    total_range = {
        "beginner": "6-10 months",
        "mid": "2-4 months",
        "senior": "1-2 months",
    }.get(level, "3-6 months")
    steps.append(
        "## ⏱️ Reality Check\n"
        f"Time to job-ready: **{total_range}** at 10-15 focused hours/week.\n"
        "- Faster than that usually means surface knowledge that fails in screens.\n"
        "- The usual stall point is after the first framework project. Push through by deploying and documenting the work."
    )
    return "\n".join(steps)


def _format_hidden_signals(company_type: Optional[str], level: str) -> Optional[str]:
    if not company_type:
        return None
    lines = [f"## 🧩 Hidden Hiring Signals"]
    for signal, meaning in SOFT_SIGNAL_LIBRARY.get(company_type, [])[:3]:
        lines.append(f"- **{signal}** — {meaning}")
    return "\n".join(lines)


def _build_rejection_diagnosis(role: str, current_skills: list[str], level: str, message: str) -> str:
    gaps = _gap_breakdown(role, current_skills)
    primary = gaps["critical"][0] if gaps["critical"] else "depth of project evidence"
    secondary = gaps["critical"][1] if len(gaps["critical"]) > 1 else (gaps["moderate"][0] if gaps["moderate"] else "interview structure")
    edge = "behavioral storytelling" if "interview" in message.lower() else "resume positioning"
    return (
        "## 💥 Rejection Diagnosis\n"
        f"**Primary Cause (~65% likelihood): {primary}**\n"
        f"- Evidence: your current stack does not cover a role-critical requirement for {role}.\n"
        f"- What the screener saw: someone who can discuss the stack, but not yet prove full job-ready depth.\n"
        f"**Secondary Cause (~25% likelihood): {secondary}**\n"
        f"- Evidence: this usually shows up in take-homes, technical rounds, or project follow-ups.\n"
        f"- What the screener saw: partial readiness, not confident execution.\n"
        f"**Edge Cause (~10% likelihood): {edge}**\n"
        f"- What the screener saw: weak proof of impact, not just weak knowledge."
    )


def _decode_jd(message: str, role: str, current_skills: list[str]) -> str:
    lowered = message.lower()
    found = [(phrase, meaning) for phrase, meaning in JD_PHRASE_MAP.items() if phrase in lowered]
    if not found:
        found = [("ownership", JD_PHRASE_MAP["ownership"]), ("strong communicator", JD_PHRASE_MAP["strong communicator"])]
    lines = ["## 🔍 JD Decoded"]
    for phrase, meaning in found[:3]:
        lines.append(
            f"- **\"{phrase}\"**\n"
            f"  Real meaning: {meaning}\n"
            f"  How to show it: bring one specific story that proves you handled it in practice."
        )
    return "\n".join(lines)


def _technology_explanation(message: str) -> str:
    skill = next((name for name in SKILL_RESOURCES if name in message.lower()), None)
    if not skill:
        return (
            "## 📘 Explanation\n"
            "Be specific about the technology name. Example: `What is Kubernetes?` or `Should I learn Redis for backend roles?`"
        )
    detail = _skill_detail(skill)
    return (
        f"## 📘 {_title_case(skill)}\n"
        f"- What it is: {SKILL_RESOURCES[skill].get('what_it_is')}\n"
        f"- Why it matters: {detail['why']}\n"
        f"- Best proof: {detail['project_idea']}"
    )


def _resume_feedback(message: str, role: str) -> str:
    has_metric = bool(re.search(r"\b\d+[%xkKmM]?\b", message))
    has_links = "github.com" in message.lower() or "linkedin.com" in message.lower()
    bullets = ["## 📄 Resume Improvements"]
    if not has_metric:
        bullets.append("- Add metrics to every serious project or role bullet. Hiring managers trust proof, not adjectives.")
    if not has_links:
        bullets.append("- Add GitHub and LinkedIn in the header. Missing links lowers trust immediately for technical roles.")
    bullets.append(
        "- Rewrite weak bullets with this structure: **action + system built + stack + measurable result**.\n"
        "  Example: `Built a FastAPI auth service with PostgreSQL and Redis, cutting token validation latency by 42% under load testing.`"
    )
    if role:
        bullets.append(f"- Tailor the skills section to **{role}** keywords before you apply.")
    return "\n".join(bullets)


def _mock_question(role: str, state: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    bank = INTERVIEW_QUESTIONS.get(role, INTERVIEW_QUESTIONS.get("backend developer", {}))
    all_questions = (
        [(question, "technical") for question in bank.get("technical", [])]
        + [(question, "project") for question in bank.get("project_based", [])]
    )
    asked = set(state.get("asked_questions", []))
    for question, qtype in all_questions:
        if question not in asked:
            return question, {"type": qtype, "asked_questions": [*state.get("asked_questions", []), question]}
    return "Walk me through your strongest project and the hardest technical decision you made.", state


def _evaluate_mock_answer(answer: str, current_question: str) -> str:
    clarity = 4 if len(answer.split()) > 40 else 2
    structure = 4 if any(term in answer.lower() for term in ["situation", "task", "result", "because", "trade-off"]) else 2
    depth = 4 if any(term in answer.lower() for term in ["latency", "index", "cache", "trade-off", "testing", "deployment"]) else 2
    hiring = 4 if len(answer.split()) > 60 else 2
    total = clarity + structure + depth + hiring
    model_answer = (
        "Start with context, name the constraint, explain the decision, then the result.\n"
        "Example shape: `The service was timing out under load. I profiled the bottleneck, moved hot reads behind Redis, added a Postgres index, "
        "and cut p95 latency from 480ms to 140ms. The trade-off was cache invalidation complexity, which I handled with TTL + explicit busting on writes.`"
    )
    verdict = "Pass" if total >= 14 else "Borderline" if total >= 10 else "Fail"
    return (
        "## 📋 Answer Evaluation\n"
        f"- Question: {current_question}\n"
        f"- Clarity: {clarity}/5\n"
        f"- Structure: {structure}/5\n"
        f"- Technical depth: {depth}/5\n"
        f"- Hiring signal: {hiring}/5\n"
        f"- Overall: **{total}/20** ({verdict})\n"
        f"- Model answer shape: {model_answer}"
    )


def _career_query_prompt() -> str:
    return (
        "Tell me this in one line:\n\n"
        "👉 **Target role + your current skills + experience + what’s going wrong**\n\n"
        "Example: `Backend engineer + Python, FastAPI, PostgreSQL + 1 year + getting rejected after interviews`"
    )


def _build_key_insight(intent: str, role: Optional[str], current_skills: list[str], message: str) -> str:
    if intent == "rejection_analysis" and role:
        gaps = _gap_breakdown(role, current_skills)
        top_gap = (gaps["critical"] or ["deeper project proof"])[0]
        return f"Your likely blocker is **{top_gap}**, not general talent. That is the kind of gap that quietly kills interviews for {role}."
    if role and current_skills:
        gaps = _gap_breakdown(role, current_skills)
        top_gap = (gaps["critical"] or gaps["moderate"] or ["clearer project evidence"])[0]
        return f"You are not far off, but you are still missing **{top_gap}**, which hiring managers treat as a real signal gap for {role}."
    return "I need your target role and current stack before I can diagnose anything precisely."


def _build_next_step(role: Optional[str], current_skills: list[str], intent: str) -> str:
    if not role or not current_skills:
        return _career_query_prompt()
    gaps = _gap_breakdown(role, current_skills)
    top_gap = (gaps["critical"] or gaps["moderate"] or ["Git"])[0]
    detail = _skill_detail(top_gap)
    return (
        f"This week, focus on **{top_gap}** only.\n"
        f"- Learn: {detail['why']}\n"
        f"- Proof: {detail['project_idea']}\n"
        f"- Target time: {detail['learn_in']}"
    )


def _build_response_sections(intent: str, role: Optional[str], current_skills: list[str], level: str, message: str, company_type: Optional[str]) -> list[str]:
    sections = [f"## ❗ Key Insight\n{_build_key_insight(intent, role, current_skills, message)}"]
    if not role or not current_skills:
        sections.append(f"## 🛠️ Next Step\n{_build_next_step(role, current_skills, intent)}")
        return sections

    if intent in {"skill_gap_analysis", "career_diagnosis", "role_comparison"}:
        sections.append(_format_skill_gap(role, current_skills))
    if intent == "rejection_analysis":
        sections.append(_build_rejection_diagnosis(role, current_skills, level, message))
    if intent == "project_suggestion":
        sections.append(_format_projects(role, current_skills))
    if intent == "roadmap_generation":
        sections.append(_format_skill_gap(role, current_skills))
        sections.append(_format_roadmap(role, current_skills, level))
    if intent == "resume_feedback":
        sections.append(_resume_feedback(message, role))
    if intent == "jd_decode":
        sections.append(_decode_jd(message, role, current_skills))
    if intent == "technology_explanation":
        sections.append(_technology_explanation(message))
    if intent == "interview_prep":
        sections.append(
            "## 🎯 Interview Prep Focus\n"
            f"- Focus on: {', '.join(ROLE_LIBRARY.get(role, {}).get('interview_focus', [])[:5])}\n"
            "- Practice one project walkthrough, one debugging story, and one trade-off story."
        )
    hidden = _format_hidden_signals(company_type, level)
    if hidden and intent in {"rejection_analysis", "jd_decode", "interview_prep", "career_diagnosis"}:
        sections.append(hidden)
    if intent in {"skill_gap_analysis", "rejection_analysis", "project_suggestion", "career_diagnosis"}:
        sections.append(_format_projects(role, current_skills))
    sections.append(f"## 🛠️ Next Step\n{_build_next_step(role, current_skills, intent)}")
    return sections[:6]


async def _fetch_job_context(db, job_id: Optional[str], context: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not job_id:
        return None
    if ObjectId.is_valid(job_id):
        doc = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if doc:
            return {
                "title": doc.get("title") or doc.get("jobTitle"),
                "company": doc.get("company"),
                "skills_required": doc.get("mustHaveSkills") or doc.get("supportingSkills") or [],
                "raw": doc,
            }
    return None


async def _fetch_seeker(db, user_id: str) -> Optional[dict[str, Any]]:
    return await db.seekers.find_one({"userId": user_id})


def _serialize_timestamped(result: dict[str, Any]) -> dict[str, Any]:
    return {**result, "timestamp": _utcnow()}


async def run_chat(
    message: str,
    user_id: str,
    job_id: Optional[str],
    db,
    path: str = "/",
    history: Optional[list[dict[str, Any]]] = None,
    context: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    message = _normalize_text(message)
    if not message:
        return _serialize_timestamped({"reply": "Please type a message.", "intent": "career_diagnosis"})

    seeker = await _fetch_seeker(db, user_id)
    state = get_session_state(user_id)
    parsed_line = _extract_structured_line(message)
    if parsed_line:
        state.update({
            "target_role": _extract_role(parsed_line.get("target_role", "")) or parsed_line.get("target_role"),
            "current_skills": _extract_skills_from_text(parsed_line.get("current_skills", "")),
            "experience_summary": parsed_line.get("experience"),
            "last_problem": parsed_line.get("problem"),
        })

    seeker_skills = _extract_skills_from_seeker(seeker)
    message_skills = _extract_skills_from_text(message)
    current_skills = _dedupe(state.get("current_skills", []) + message_skills + seeker_skills)
    role = _extract_role(message, None, context) or state.get("target_role")
    intent = _classify_intent(message)
    level = _extract_experience_level(message, seeker, state)
    company_type = _extract_company_type(message)

    state.update({
        "target_role": role,
        "current_skills": current_skills,
        "experience_level": level,
        "last_intent": intent,
    })

    if state.get("mode") == "mock" and intent != "mock_interview":
        current_question = state.get("current_question") or "Tell me about your strongest project."
        feedback = _evaluate_mock_answer(message, current_question)
        next_question, question_state = _mock_question(role or "backend engineer", state)
        state.update({"current_question": next_question, "asked_questions": question_state.get("asked_questions", [])})
        update_session_state(user_id, state)
        reply = f"{feedback}\n\n## 🎙️ Next Question\n{next_question}\n\n## 🛠️ Next Step\nAnswer in STAR or explain → example → trade-off format."
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", reply)
        return _serialize_timestamped({"reply": reply, "intent": "mock_interview", "intentLabel": "Mock Interview", "intentEmoji": "🎙️"})

    if intent == "mock_interview":
        question, question_state = _mock_question(role or "backend engineer", state)
        state.update({"mode": "mock", "current_question": question, "asked_questions": question_state.get("asked_questions", [])})
        update_session_state(user_id, state)
        reply = (
            "## 🎙️ Mock Interview Mode Activated\n"
            f"- Role: **{role or 'backend engineer'}**\n"
            f"- Level: **{level}**\n"
            "- I’ll ask one question at a time and score your answer.\n\n"
            f"### First Question\n{question}\n\n"
            "## 🛠️ Next Step\nAnswer as if this is a real interview. Type `/end` when you want to stop."
        )
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", reply)
        return _serialize_timestamped({"reply": reply, "intent": intent, "intentLabel": "Mock Interview", "intentEmoji": "🎙️"})

    if message.lower() == "/end" and state.get("mode") == "mock":
        scores = state.get("asked_questions", [])
        reply = (
            "## 🏁 Mock Session Summary\n"
            f"- Questions attempted: {len(scores)}\n"
            "- Strongest area: clarity if you kept your answers structured.\n"
            "- Weakest area: technical depth if you skipped trade-offs or metrics.\n"
            "## 🛠️ Next Step\nDo one more mock round tomorrow and answer with one concrete metric in every response."
        )
        state.update({"mode": None, "current_question": None, "asked_questions": []})
        update_session_state(user_id, state)
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", reply)
        return _serialize_timestamped({"reply": reply, "intent": "mock_interview", "intentLabel": "Mock Interview", "intentEmoji": "🎙️"})

    if intent in {"skill_gap_analysis", "roadmap_generation", "project_suggestion", "rejection_analysis", "career_diagnosis"} and (not role or not current_skills):
        follow_up = _career_query_prompt()
        add_to_history(user_id, "user", message)
        add_to_history(user_id, "assistant", follow_up)
        update_session_state(user_id, state)
        return _serialize_timestamped({"reply": follow_up, "intent": intent, "intentLabel": "Career Diagnosis", "intentEmoji": "🧠"})

    sections = _build_response_sections(intent, role, current_skills, level, message, company_type)
    reply = "\n\n".join(sections)

    update_session_state(user_id, state)
    add_to_history(user_id, "user", message)
    add_to_history(user_id, "assistant", reply)
    return _serialize_timestamped({
        "reply": reply,
        "intent": intent,
        "intentLabel": _title_case(intent.replace("_", " ")),
        "intentEmoji": "🧠" if intent != "mock_interview" else "🎙️",
        "detectedRole": role,
        "profile": {
            "target_role": role,
            "current_skills": current_skills[:12],
            "experience_level": level,
        },
    })


async def clear_chat_history(user_id: str, db=None) -> dict[str, str]:
    clear_history(user_id)
    update_session_state(user_id, {"mode": None, "current_question": None, "asked_questions": []})
    return {"message": "Chat history cleared"}
