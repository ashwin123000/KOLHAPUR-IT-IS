import ast
import csv
import hashlib
import io
import json
import math
import os
import re
from collections import Counter
from datetime import datetime
from difflib import SequenceMatcher, get_close_matches
from pathlib import Path
from typing import Any

import pdfplumber

try:
    from .github_service import GitHubService
except ImportError:
    class GitHubService:
        def create_comprehensive_profile(self, username: str) -> dict[str, Any]:
            return {
                "languages": {},
                "activity_score": 0,
                "repositories": [],
                "profile": {"followers": 0, "username": username},
            }


SKILL_CATALOG: dict[str, dict[str, Any]] = {
    "Python": {"aliases": ["python", "py", "pyth0n"], "category": "language"},
    "JavaScript": {"aliases": ["javascript", "js"], "category": "language"},
    "TypeScript": {"aliases": ["typescript", "ts"], "category": "language"},
    "React": {"aliases": ["react", "reactjs", "recat"], "category": "framework"},
    "Node.js": {"aliases": ["node", "nodejs", "node.js"], "category": "framework"},
    "FastAPI": {"aliases": ["fastapi", "fast api"], "category": "framework"},
    "Express": {"aliases": ["express", "expressjs"], "category": "framework"},
    "MongoDB": {"aliases": ["mongodb", "mongo", "mongoose"], "category": "tool"},
    "PostgreSQL": {"aliases": ["postgresql", "postgres", "psql"], "category": "tool"},
    "MySQL": {"aliases": ["mysql"], "category": "tool"},
    "Docker": {"aliases": ["docker"], "category": "tool"},
    "Kubernetes": {"aliases": ["kubernetes", "k8s"], "category": "tool"},
    "AWS": {"aliases": ["aws", "amazon web services"], "category": "tool"},
    "Azure": {"aliases": ["azure"], "category": "tool"},
    "GCP": {"aliases": ["gcp", "google cloud"], "category": "tool"},
    "Git": {"aliases": ["git", "github", "gitlab"], "category": "tool"},
    "SQL": {"aliases": ["sql"], "category": "language"},
    "Pandas": {"aliases": ["pandas"], "category": "tool"},
    "NumPy": {"aliases": ["numpy"], "category": "tool"},
    "TensorFlow": {"aliases": ["tensorflow", "tensor flow"], "category": "framework"},
    "PyTorch": {"aliases": ["pytorch", "py torch", "torch"], "category": "framework"},
    "Scikit-learn": {"aliases": ["scikit-learn", "sklearn"], "category": "framework"},
    "LangChain": {"aliases": ["langchain", "lang chain"], "category": "framework"},
    "LangGraph": {"aliases": ["langgraph", "lang graph"], "category": "framework"},
    "OpenAI API": {"aliases": ["openai", "openai api", "gpt"], "category": "tool"},
    "HTML": {"aliases": ["html", "html5"], "category": "language"},
    "CSS": {"aliases": ["css", "css3"], "category": "language"},
    "Tailwind CSS": {"aliases": ["tailwind", "tailwind css", "tailwindcss"], "category": "framework"},
    "Figma": {"aliases": ["figma"], "category": "tool"},
}

COLLEGE_HINTS = {
    "IIT Delhi": ["iit delhi", "iit d", "indian institute of technology delhi"],
    "IIT Bombay": ["iit bombay", "iit b", "indian institute of technology bombay"],
    "VIT Vellore": ["vit", "vit vellore", "vellore institute of technology"],
    "BITS Pilani": ["bits pilani", "bits", "birla institute of technology and science pilani"],
    "NIT Trichy": ["nit trichy", "nit tiruchirappalli", "national institute of technology trichy"],
}

SEMANTIC_SKILL_RELATIONS = {
    "TensorFlow": {"PyTorch": 0.92, "Keras": 0.89},
    "PyTorch": {"TensorFlow": 0.92, "Keras": 0.82},
    "React": {"Next.js": 0.9, "JavaScript": 0.7, "TypeScript": 0.72},
    "Node.js": {"Express": 0.9, "JavaScript": 0.78, "TypeScript": 0.7},
    "MongoDB": {"PostgreSQL": 0.65, "MySQL": 0.62},
    "AWS": {"Azure": 0.72, "GCP": 0.74},
}

PERSONA_RULES = {
    "Builder": {"skills": {"React", "Node.js", "JavaScript", "TypeScript", "MongoDB"}, "domains": ["full stack", "product", "web"]},
    "Analyst": {"skills": {"Python", "SQL", "Pandas", "NumPy", "Scikit-learn"}, "domains": ["analytics", "data", "dashboard"]},
    "Operator": {"skills": {"Docker", "Kubernetes", "AWS", "Azure", "GCP"}, "domains": ["devops", "infrastructure", "backend"]},
    "Researcher": {"skills": {"PyTorch", "TensorFlow", "LangChain", "LangGraph", "OpenAI API"}, "domains": ["ml", "ai", "nlp"]},
    "Creative": {"skills": {"Figma", "React", "Tailwind CSS", "CSS"}, "domains": ["ui", "ux", "design", "frontend"]},
}


class SeekerIntelligenceService:
    def __init__(self) -> None:
        self.github_service = GitHubService()
        self.skill_alias_map = {
            alias.lower(): canonical
            for canonical, data in SKILL_CATALOG.items()
            for alias in data["aliases"]
        }
        self.dataset_skill_map: dict[str, str] = {}
        self.dataset_college_names: list[str] = []
        self.dataset_career_signals: list[dict[str, Any]] = []
        self._load_datasets()

    def _load_datasets(self) -> None:
        root = Path(__file__).resolve().parents[2]
        ai_jobs_path = root / "ai_job_market_2026.csv"
        resume_dataset_path = root / "resume_data.csv"
        max_job_rows = int(os.environ.get("SEEKER_AI_JOB_ROWS", "2500"))
        max_resume_rows = int(os.environ.get("SEEKER_RESUME_ROWS", "2500"))

        if ai_jobs_path.exists():
            try:
                with ai_jobs_path.open("r", encoding="utf-8", newline="") as handle:
                    reader = csv.DictReader(handle)
                    for index, row in enumerate(reader):
                        if index >= max_job_rows:
                            break
                        title = (row.get("Job_Title") or "").strip()
                        top_skills = [skill.strip() for skill in (row.get("Top_Skills") or "").split(",") if skill.strip()]
                        for skill in top_skills:
                            canonical = self._canonicalize_dataset_skill(skill)
                            self.dataset_skill_map.setdefault(skill.lower(), canonical)
                        if title and top_skills:
                            self.dataset_career_signals.append({
                                "title": title,
                                "skills": {self._canonicalize_dataset_skill(skill) for skill in top_skills},
                            })
            except Exception:
                pass

        if resume_dataset_path.exists():
            try:
                with resume_dataset_path.open("r", encoding="utf-8", newline="") as handle:
                    reader = csv.DictReader(handle)
                    for index, row in enumerate(reader):
                        if index >= max_resume_rows:
                            break
                        for skill in self._parse_dataset_list(row.get("skills")):
                            canonical = self._canonicalize_dataset_skill(skill)
                            self.dataset_skill_map.setdefault(skill.lower(), canonical)
                        for institution in self._parse_dataset_list(row.get("educational_institution_name")):
                            cleaned = institution.strip()
                            if cleaned and cleaned not in self.dataset_college_names:
                                self.dataset_college_names.append(cleaned)
            except Exception:
                pass

    def _parse_dataset_list(self, raw_value: Any) -> list[str]:
        if isinstance(raw_value, list):
            return [str(item).strip() for item in raw_value if str(item).strip()]
        if not raw_value or not isinstance(raw_value, str):
            return []
        value = raw_value.strip()
        if not value:
            return []
        try:
            parsed = ast.literal_eval(value)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except Exception:
            pass
        return [part.strip() for part in value.split(",") if part.strip()]

    def _canonicalize_dataset_skill(self, skill: str) -> str:
        cleaned = re.sub(r"\s+", " ", skill.strip())
        alias_hit = self.skill_alias_map.get(cleaned.lower())
        if alias_hit:
            return alias_hit
        normalized = cleaned.replace("Scikit Learn", "Scikit-learn").replace("Tensorflow", "TensorFlow")
        return normalized.title() if normalized.islower() else normalized

    def extract_resume_text(self, file_name: str, content: bytes) -> tuple[str, str]:
        if file_name.lower().endswith(".pdf"):
            try:
                pages: list[str] = []
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    for page in pdf.pages:
                        tables = page.extract_tables() or []
                        for table in tables:
                            for row in table:
                                if row:
                                    pages.append(" | ".join((cell or "").strip() for cell in row))
                        pages.append(page.extract_text(x_tolerance=2, y_tolerance=2) or "")
                text = "\n".join(part for part in pages if part).strip()
                return text, "pdfplumber"
            except Exception:
                return "", "pdfplumber"
        return content.decode("utf-8", errors="ignore"), "plaintext"

    def parse_resume(self, file_name: str, content: bytes) -> dict[str, Any]:
        raw_text, method = self.extract_resume_text(file_name, content)
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        identity = self._extract_identity(lines, raw_text)
        raw_skills = self._extract_raw_skills(raw_text)
        normalized_skills = self._normalize_skills(raw_skills)
        education = self._extract_education(lines)
        projects = self._extract_projects(raw_text)
        experience = self._extract_experience(raw_text)
        confidence = self._calculate_confidence(identity, raw_skills, education, projects, experience)
        persona = self._infer_persona(normalized_skills, projects, experience)
        github_analysis = self._build_github_analysis(identity.get("github"), normalized_skills, projects)
        if github_analysis.get("authenticityFlags"):
            normalized_skills = self._merge_github_flags(normalized_skills, github_analysis["authenticityFlags"])

        final_profile = {
            "identity": identity,
            "resumeData": {
                "rawExtractedText": raw_text,
                "extractionMethod": method,
                "extractionConfidence": confidence["overall"],
                "parsingErrors": confidence["missing_fields"],
                "extractedAt": datetime.utcnow().isoformat(),
            },
            "education": education,
            "skills": normalized_skills,
            "projects": projects,
            "experience": experience,
            "aiProfile": persona | {"profileCompleteness": confidence["overall"]},
            "githubAnalysis": github_analysis,
            "embedding": self._build_embedding(identity, normalized_skills, persona),
            "confidence": confidence,
        }

        legacy = {
            "full_name": identity.get("name", ""),
            "email": identity.get("email", ""),
            "college": education[0]["institutionNormalized"] if education else "",
            "city": identity.get("location", {}).get("city", ""),
            "state": identity.get("location", {}).get("state", ""),
            "skills": [skill["skillNormalized"] for skill in normalized_skills],
            "projects": projects,
            "experience": experience,
            "education": education,
            "confidence": confidence["overall"],
            "low_confidence_fields": confidence["missing_fields"],
            "status": "parsed",
        }

        return {
            "prefillData": final_profile,
            "confidence": confidence,
            "parsed": legacy,
        }

    def calculate_match_score(self, seeker: dict[str, Any], project: dict[str, Any]) -> dict[str, Any]:
        seeker_skills = seeker.get("skills", [])
        seeker_skill_names = [skill.get("skillNormalized", "") for skill in seeker_skills]
        seeker_skill_depth = {
            skill.get("skillNormalized", "").lower(): skill.get("depthScore", 5)
            for skill in seeker_skills
        }
        project_skills = self._normalize_project_skills(project.get("skills_required") or [])
        technical_score = 0.0
        skill_match_details: list[dict[str, Any]] = []

        for project_skill in project_skills:
            normalized_weight = 1 / max(len(project_skills), 1)
            exact_match = next((name for name in seeker_skill_names if name.lower() == project_skill.lower()), None)
            if exact_match:
                depth = seeker_skill_depth.get(project_skill.lower(), 5) / 10
                contribution = normalized_weight * 40 * depth
                technical_score += contribution
                skill_match_details.append({
                    "requiredSkill": project_skill,
                    "matchType": "exact",
                    "matchedWith": exact_match,
                    "contribution": round(contribution, 1),
                    "message": "Exact skill match",
                })
                continue

            semantic = self._find_semantic_skill_match(project_skill, seeker_skill_names)
            if semantic:
                contribution = normalized_weight * 40 * semantic["score"] * 0.7
                technical_score += contribution
                skill_match_details.append({
                    "requiredSkill": project_skill,
                    "matchType": "semantic",
                    "matchedWith": semantic["matchedWith"],
                    "similarityScore": semantic["similarityScore"],
                    "contribution": round(contribution, 1),
                    "message": f"{semantic['matchedWith']} partially covers {project_skill}",
                })
            else:
                skill_match_details.append({
                    "requiredSkill": project_skill,
                    "matchType": "none",
                    "matchedWith": None,
                    "contribution": 0,
                    "message": f"Missing {project_skill}",
                })

        persona_target = project.get("persona") or "Builder"
        persona_alignment = 20 if seeker.get("aiProfile", {}).get("personaArchetype") == persona_target else 10
        project_domains = [str(skill).lower() for skill in project_skills[:3]]
        seeker_domains = [str(item).lower() for item in seeker.get("aiProfile", {}).get("topDomains", [])]
        overlap = len([domain for domain in project_domains if any(domain in seeker_domain or seeker_domain in domain for seeker_domain in seeker_domains)])
        domain_overlap = round((overlap / max(len(project_domains), 1)) * 30)
        hard_filter_pass = 10 if seeker.get("education") else 5
        total_score = min(100, round(technical_score + persona_alignment + domain_overlap + hard_filter_pass))

        seeker_skill_names_lower = {item.lower() for item in seeker_skill_names}
        gaps = [skill for skill in project_skills if skill.lower() not in seeker_skill_names_lower]
        strengths = [skill for skill in project_skills if skill.lower() in seeker_skill_names_lower]

        return {
            "totalScore": total_score,
            "breakdown": {
                "technicalDepth": round(technical_score),
                "personaAlignment": persona_alignment,
                "domainOverlap": domain_overlap,
                "hardFilterPass": hard_filter_pass,
            },
            "skillMatchDetails": skill_match_details,
            "semanticBonusApplied": any(item["matchType"] == "semantic" for item in skill_match_details),
            "gaps": [f"Missing: {gap}" for gap in gaps],
            "strengths": [f"Strong in: {strength}" for strength in strengths],
            "improvementSuggestions": [f"Add one project demonstrating {gap}" for gap in gaps[:3]],
            "computedAt": datetime.utcnow().isoformat(),
        }

    def _extract_identity(self, lines: list[str], raw_text: str) -> dict[str, Any]:
        email = self._find_pattern(raw_text, r"[\w\.-]+@[\w\.-]+\.\w+")
        phone = self._find_pattern(raw_text, r"(?:\+91[-\s]?)?[6-9]\d{9}")
        linkedin = self._find_pattern(raw_text, r"(https?://(?:www\.)?linkedin\.com/[^\s]+)")
        github = self._find_pattern(raw_text, r"(https?://(?:www\.)?github\.com/[^\s]+)")
        portfolio = self._find_pattern(raw_text, r"(https?://(?!www\.linkedin\.com)(?!www\.github\.com)[^\s]+)")
        name = lines[0] if lines else ""
        if email and name and email.lower() in name.lower():
            name = lines[1] if len(lines) > 1 else ""
        location = self._extract_location(raw_text)
        return {
            "name": self._clean_name(name),
            "email": email or "",
            "phone": phone or "",
            "linkedIn": linkedin or "",
            "github": github or "",
            "portfolio": portfolio or "",
            "location": location,
        }

    def _extract_location(self, raw_text: str) -> dict[str, str]:
        location_match = re.search(r"(?:location|address)\s*[:\-]\s*([A-Za-z\s]+),\s*([A-Za-z\s]+)", raw_text, re.I)
        if location_match:
            return {
                "city": location_match.group(1).strip(),
                "state": location_match.group(2).strip(),
                "country": "India",
            }
        generic = re.search(r"\b([A-Z][a-z]+)\s*,\s*([A-Z][a-z]+)\b", raw_text)
        if generic:
            return {"city": generic.group(1), "state": generic.group(2), "country": "India"}
        return {"city": "", "state": "", "country": "India"}

    def _extract_raw_skills(self, raw_text: str) -> list[str]:
        skills: list[str] = []
        lower_text = raw_text.lower()
        for canonical, metadata in SKILL_CATALOG.items():
            if any(alias in lower_text for alias in metadata["aliases"]):
                skills.append(canonical)
        for alias, canonical in self.dataset_skill_map.items():
            if alias in lower_text:
                skills.append(canonical)

        skills_section = self._extract_section(raw_text, ["skills", "technical skills", "tech stack"], ["education", "experience", "projects", "certifications"])
        if skills_section:
            tokens = re.split(r"[\n,|/•]+", skills_section)
            for token in tokens:
                cleaned = token.strip(" -:\t")
                if 1 < len(cleaned) < 30:
                    skills.append(cleaned)

        return list(dict.fromkeys(skills))

    def _normalize_skills(self, raw_skills: list[str]) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        for raw_skill in raw_skills:
            cleaned = raw_skill.strip()
            if not cleaned:
                continue
            mapped = self.skill_alias_map.get(cleaned.lower()) or self.dataset_skill_map.get(cleaned.lower())
            confidence = 100
            method = "exact_match"
            if not mapped:
                alias_space = list(dict.fromkeys([*self.skill_alias_map.keys(), *self.dataset_skill_map.keys()]))
                candidates = get_close_matches(cleaned.lower(), alias_space, n=1, cutoff=0.75)
                if candidates:
                    mapped = self.skill_alias_map.get(candidates[0]) or self.dataset_skill_map.get(candidates[0]) or cleaned.title()
                    confidence = round(SequenceMatcher(None, cleaned.lower(), candidates[0]).ratio() * 100)
                    method = "dataset_fuzzy_match" if candidates[0] in self.dataset_skill_map else "fuzzy_match"
                else:
                    mapped = cleaned.title()
                    confidence = 45 if len(cleaned) > 2 else 0
                    method = "no_match"

            category = SKILL_CATALOG.get(mapped, {}).get("category", "tool")
            depth_score = self._estimate_skill_depth(mapped)
            normalized.append({
                "skillRaw": raw_skill,
                "skillNormalized": mapped,
                "category": category,
                "normalizationConfidence": confidence,
                "normalizationMethod": method,
                "depthScore": depth_score,
                "depthLabel": self._depth_label(depth_score),
                "isUserVerified": confidence >= 80,
                "isFlagged": confidence < 60,
                "flagReason": "Needs manual confirmation" if confidence < 60 else "",
            })
        deduped: dict[str, dict[str, Any]] = {}
        for item in normalized:
            key = item["skillNormalized"].lower()
            current = deduped.get(key)
            if current is None or item["normalizationConfidence"] > current["normalizationConfidence"]:
                deduped[key] = item
        return list(deduped.values())

    def _extract_education(self, lines: list[str]) -> list[dict[str, Any]]:
        education: list[dict[str, Any]] = []
        degree_keywords = ["b.tech", "btech", "be", "m.tech", "mtech", "bsc", "msc", "mba", "bca", "mca", "bachelor", "master"]
        for line in lines:
            lower = line.lower()
            if any(keyword in lower for keyword in degree_keywords) or "college" in lower or "institute" in lower or "university" in lower:
                college = self._normalize_college(line)
                years = re.findall(r"(20\d{2})", line)
                cgpa_match = re.search(r"(?:cgpa|gpa)[:\s]*([0-9]+(?:\.[0-9]+)?)", line, re.I)
                education.append({
                    "institution": line,
                    "institutionNormalized": college["normalized"],
                    "collegeTier": college["tier"],
                    "matchConfidence": college["confidence"],
                    "degree": next((keyword.upper() for keyword in degree_keywords if keyword in lower), ""),
                    "field": "Computer Science" if "computer" in lower else "",
                    "startYear": int(years[0]) if len(years) >= 2 else None,
                    "endYear": int(years[-1]) if years else None,
                    "cgpa": float(cgpa_match.group(1)) if cgpa_match else None,
                })
        return education[:3]

    def _extract_projects(self, raw_text: str) -> list[dict[str, Any]]:
        section = self._extract_section(raw_text, ["projects", "project experience"], ["experience", "education", "certifications"])
        if not section:
            return []
        chunks = [chunk.strip() for chunk in re.split(r"\n(?=[A-Z][^\n]{3,40}\n)|•", section) if chunk.strip()]
        projects: list[dict[str, Any]] = []
        for chunk in chunks[:4]:
            lines = [line.strip() for line in chunk.splitlines() if line.strip()]
            title = lines[0][:80] if lines else "Project"
            description = " ".join(lines[1:4])[:400] if len(lines) > 1 else chunk[:250]
            tech_stack = [item["skillNormalized"] for item in self._normalize_skills(self._extract_raw_skills(chunk))]
            projects.append({
                "title": title,
                "description": description,
                "techStack": tech_stack,
                "githubUrl": self._find_pattern(chunk, r"(https?://(?:www\.)?github\.com/[^\s]+)") or "",
                "liveUrl": self._find_pattern(chunk, r"(https?://(?!www\.github\.com)[^\s]+)") or "",
                "domainTable": self._build_domain_table(title, description, tech_stack),
                "aiAnalysisSummary": self._project_summary(description, tech_stack),
            })
        return projects

    def _extract_experience(self, raw_text: str) -> list[dict[str, Any]]:
        section = self._extract_section(raw_text, ["experience", "work experience", "internship"], ["projects", "education", "skills"])
        if not section:
            return []
        entries = []
        for block in [part.strip() for part in re.split(r"\n{2,}|•", section) if part.strip()][:4]:
            lines = [line.strip() for line in block.splitlines() if line.strip()]
            header = lines[0] if lines else block
            years = re.findall(r"(20\d{2})", block)
            entries.append({
                "company": header.split("|")[0][:80],
                "role": header.split("|")[1][:80] if "|" in header else header[:80],
                "startDate": years[0] if len(years) >= 2 else None,
                "endDate": years[-1] if years else None,
                "isCurrent": bool(re.search(r"\bpresent\b|\bcurrent\b", block, re.I)),
                "responsibilities": lines[1:4],
                "techUsed": [item["skillNormalized"] for item in self._normalize_skills(self._extract_raw_skills(block))],
            })
        return entries

    def _calculate_confidence(
        self,
        identity: dict[str, Any],
        skills: list[str],
        education: list[dict[str, Any]],
        projects: list[dict[str, Any]],
        experience: list[dict[str, Any]],
    ) -> dict[str, Any]:
        field_scores = {
            "name": 100 if identity.get("name") and len(identity["name"].split()) >= 2 else 35,
            "email": 100 if identity.get("email") else 0,
            "phone": 100 if identity.get("phone") else 25,
            "skills_raw": min(100, len(skills) * 15),
            "education": 100 if education else 0,
            "projects": 100 if projects else 0,
            "experience": 100 if experience else 20,
        }
        weighted = round(
            field_scores["name"] * 0.2
            + field_scores["email"] * 0.2
            + field_scores["phone"] * 0.05
            + field_scores["skills_raw"] * 0.25
            + field_scores["education"] * 0.15
            + field_scores["projects"] * 0.1
            + field_scores["experience"] * 0.05
        )
        missing = [field for field, score in field_scores.items() if score < 50]
        review = [field for field, score in field_scores.items() if 50 <= score < 80]
        strengths = [field for field, score in field_scores.items() if score >= 80]
        return {
            "overall": weighted,
            "field_scores": field_scores,
            "missing_fields": missing,
            "review_fields": review,
            "strong_fields": strengths,
            "is_usable": weighted >= 60,
        }

    def _infer_persona(self, skills: list[dict[str, Any]], projects: list[dict[str, Any]], experience: list[dict[str, Any]]) -> dict[str, Any]:
        skill_names = {item["skillNormalized"] for item in skills}
        description_blob = " ".join(project.get("description", "") for project in projects).lower()
        persona_scores: Counter[str] = Counter()
        for persona, rules in PERSONA_RULES.items():
            persona_scores[persona] += len(skill_names.intersection(rules["skills"])) * 2
            persona_scores[persona] += sum(1 for domain in rules["domains"] if domain in description_blob)
        persona, score = persona_scores.most_common(1)[0] if persona_scores else ("Builder", 1)
        seniority = "Fresher"
        if experience:
            seniority = "Junior" if len(experience) == 1 else "Mid"
        top_domains = self._infer_domains(skill_names, projects)
        return {
            "personaArchetype": persona,
            "personaConfidence": min(98, 55 + score * 8),
            "seniorityLevel": seniority,
            "topDomains": top_domains,
            "careerTrajectory": self._career_trajectory(skill_names, top_domains),
            "strengths": list(skill_names)[:5],
            "gaps": [],
        }

    def _build_github_analysis(self, github_url: str | None, skills: list[dict[str, Any]], projects: list[dict[str, Any]]) -> dict[str, Any]:
        if not github_url:
            return {
                "username": "",
                "languageBreakdown": [],
                "authenticityFlags": [],
                "hiddenStrengths": [],
                "activityScore": 0,
                "codeQualitySignals": {},
                "githubSummary": "",
            }
        try:
            username = github_url.rstrip("/").split("/")[-1]
            profile = self.github_service.create_comprehensive_profile(username)
            language_breakdown = [
                {"language": language, "percentage": round((count / max(sum(profile["languages"].values()), 1)) * 100, 1)}
                for language, count in list(profile["languages"].items())[:6]
            ]
            resume_skill_names = {skill["skillNormalized"].lower() for skill in skills}
            authenticity_flags = []
            hidden_strengths = []
            for language, _count in profile["languages"].items():
                if language.lower() not in resume_skill_names:
                    hidden_strengths.append(language)
            for skill in skills:
                normalized = skill["skillNormalized"].lower()
                if normalized not in {language.lower() for language in profile["languages"].keys()} and skill.get("depthScore", 5) >= 8:
                    authenticity_flags.append({
                        "skill": skill["skillNormalized"],
                        "issue": "not_reflected_in_github",
                        "severity": "warning",
                        "message": f"{skill['skillNormalized']} is strong on the resume but not reflected in public GitHub activity.",
                    })
            return {
                "username": username,
                "languageBreakdown": language_breakdown,
                "authenticityFlags": authenticity_flags,
                "hiddenStrengths": hidden_strengths[:5],
                "activityScore": round(profile["activity_score"] * 10, 1),
                "codeQualitySignals": {
                    "totalRepos": len(profile["repositories"]),
                    "followers": profile["profile"].get("followers", 0),
                },
                "githubSummary": f"{username} shows strongest public evidence in {', '.join(item['language'] for item in language_breakdown[:3]) or 'general software work'}.",
            }
        except Exception:
            return {
                "username": github_url.split("/")[-1],
                "languageBreakdown": [],
                "authenticityFlags": [],
                "hiddenStrengths": [],
                "activityScore": 0,
                "codeQualitySignals": {},
                "githubSummary": "GitHub analysis unavailable.",
            }

    def _build_embedding(self, identity: dict[str, Any], skills: list[dict[str, Any]], persona: dict[str, Any]) -> dict[str, Any]:
        text = " ".join([
            identity.get("name", ""),
            persona.get("careerTrajectory", ""),
            persona.get("personaArchetype", ""),
            *[skill["skillNormalized"] for skill in skills],
        ]).strip()
        dims = 64
        vector = [0.0] * dims
        for token in re.findall(r"[a-z0-9+#.]+", text.lower()):
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = digest[0] % dims
            value = ((digest[1] / 255) * 2) - 1
            vector[index] += value
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        normalized = [round(value / norm, 6) for value in vector]
        return {
            "vector": normalized,
            "embeddedAt": datetime.utcnow().isoformat(),
            "embeddingVersion": "local-hash-v1",
        }

    def _normalize_college(self, raw_college: str) -> dict[str, Any]:
        normalized = raw_college.strip()
        best_confidence = 0
        best_name = normalized
        best_tier = None
        for canonical, aliases in COLLEGE_HINTS.items():
            for alias in aliases:
                score = round(SequenceMatcher(None, alias.lower(), raw_college.lower()).ratio() * 100)
                if score > best_confidence:
                    best_confidence = score
                    best_name = canonical if score >= 72 else normalized
                    best_tier = 1 if canonical.startswith(("IIT", "BITS")) else 2 if canonical.startswith("NIT") else 2
        for college_name in self.dataset_college_names[:1000]:
            score = round(SequenceMatcher(None, college_name.lower(), raw_college.lower()).ratio() * 100)
            if score > best_confidence:
                best_confidence = score
                best_name = college_name if score >= 78 else best_name
                if "iit" in college_name.lower() or "bits" in college_name.lower():
                    best_tier = 1
                elif any(token in college_name.lower() for token in ["nit", "university", "institute"]):
                    best_tier = 2
        return {"normalized": best_name, "confidence": best_confidence, "tier": best_tier if best_confidence >= 72 else None}

    def _normalize_project_skills(self, value: list[str]) -> list[str]:
        return [item["skillNormalized"] for item in self._normalize_skills(value)]

    def _find_semantic_skill_match(self, required_skill: str, seeker_skills: list[str]) -> dict[str, Any] | None:
        relations = SEMANTIC_SKILL_RELATIONS.get(required_skill, {})
        seeker_lookup = {skill.lower(): skill for skill in seeker_skills}
        best_match = None
        best_score = 0.0
        for related_skill, similarity in relations.items():
            if related_skill.lower() in seeker_lookup and similarity > best_score:
                best_match = seeker_lookup[related_skill.lower()]
                best_score = similarity
        if best_match and best_score > 0.6:
            return {"matchedWith": best_match, "similarityScore": best_score, "score": best_score * 0.85}
        return None

    def _merge_github_flags(self, skills: list[dict[str, Any]], flags: list[dict[str, Any]]) -> list[dict[str, Any]]:
        by_skill = {flag["skill"].lower(): flag for flag in flags}
        merged = []
        for skill in skills:
            flag = by_skill.get(skill["skillNormalized"].lower())
            if flag:
                merged.append(skill | {"isFlagged": True, "flagReason": flag["message"]})
            else:
                merged.append(skill)
        return merged

    def _estimate_skill_depth(self, skill_name: str) -> int:
        tooling = {"Git", "Docker", "AWS", "MongoDB", "PostgreSQL"}
        advanced = {"PyTorch", "TensorFlow", "LangChain", "LangGraph"}
        if skill_name in advanced:
            return 8
        if skill_name in tooling:
            return 6
        return 7 if skill_name in {"React", "Node.js", "Python", "TypeScript"} else 5

    def _depth_label(self, depth_score: int) -> str:
        if depth_score >= 9:
            return "Expert"
        if depth_score >= 7:
            return "Production-Ready"
        if depth_score >= 4:
            return "Intermediate"
        return "Tutorial"

    def _infer_domains(self, skill_names: set[str], projects: list[dict[str, Any]]) -> list[str]:
        domains = []
        blob = " ".join(project.get("description", "") for project in projects).lower()
        if {"React", "HTML", "CSS"} & skill_names:
            domains.append("Frontend")
        if {"Node.js", "FastAPI", "MongoDB", "PostgreSQL"} & skill_names:
            domains.append("Backend")
        if {"PyTorch", "TensorFlow", "Scikit-learn", "LangChain"} & skill_names or "ml" in blob or "ai" in blob:
            domains.append("ML")
        if {"Docker", "Kubernetes", "AWS"} & skill_names:
            domains.append("DevOps")
        return domains[:3] or ["Software Engineering"]

    def _career_trajectory(self, skill_names: set[str], domains: list[str]) -> str:
        if self.dataset_career_signals:
            ranked: list[tuple[int, str]] = []
            for signal in self.dataset_career_signals:
                overlap = len(skill_names.intersection(signal["skills"]))
                if overlap:
                    ranked.append((overlap, signal["title"]))
            if ranked:
                ranked.sort(reverse=True)
                return ranked[0][1]
        if "ML" in domains:
            return "ML Engineer"
        if "Frontend" in domains and "Backend" in domains:
            return "Full Stack Developer"
        if "Frontend" in domains:
            return "Frontend Developer"
        if "Backend" in domains:
            return "Backend Developer"
        return "Software Developer"

    def _build_domain_table(self, title: str, description: str, tech_stack: list[str]) -> list[dict[str, str]]:
        domains = []
        if any(skill in tech_stack for skill in ["React", "HTML", "CSS", "Tailwind CSS"]):
            domains.append({"domain": "Frontend", "coreResponsibility": f"Built user-facing flows for {title}", "successMetric": "Delivered polished end-user interactions"})
        if any(skill in tech_stack for skill in ["Node.js", "FastAPI", "MongoDB", "PostgreSQL"]):
            domains.append({"domain": "Backend API", "coreResponsibility": f"Implemented backend services for {title}", "successMetric": "Enabled reliable data flow and business logic"})
        if any(skill in tech_stack for skill in ["PyTorch", "TensorFlow", "Scikit-learn", "LangChain"]):
            domains.append({"domain": "AI Pipeline", "coreResponsibility": f"Developed intelligence workflows for {title}", "successMetric": "Improved automation or recommendation quality"})
        return domains[:3] or [{
            "domain": "Product Delivery",
            "coreResponsibility": f"Owned delivery of {title}",
            "successMetric": "Converted requirements into a working project",
        }]

    def _project_summary(self, description: str, tech_stack: list[str]) -> str:
        if tech_stack:
            return f"Built with {', '.join(tech_stack[:4])}; strongest evidence appears in implementation depth and practical ownership."
        return description[:160]

    def _extract_section(self, raw_text: str, start_markers: list[str], end_markers: list[str]) -> str:
        lower = raw_text.lower()
        start_index = -1
        for marker in start_markers:
            idx = lower.find(marker)
            if idx != -1 and (start_index == -1 or idx < start_index):
                start_index = idx
        if start_index == -1:
            return ""
        end_index = len(raw_text)
        for marker in end_markers:
            idx = lower.find(marker, start_index + 1)
            if idx != -1 and idx < end_index:
                end_index = idx
        return raw_text[start_index:end_index]

    def _find_pattern(self, text: str, pattern: str) -> str | None:
        match = re.search(pattern, text, re.I)
        return match.group(1) if match and match.groups() else (match.group(0) if match else None)

    def _clean_name(self, name: str) -> str:
        cleaned = re.sub(r"[^A-Za-z.\s]", "", name).strip()
        return re.sub(r"\s{2,}", " ", cleaned)


seeker_intelligence_service = SeekerIntelligenceService()
