"""
Minimal retrieval layer for ARIA.

Builds a local vector index from bundled chatbot datasets and CSV files so
responses can be grounded in project data instead of prompt-only logic.
"""

from __future__ import annotations

import csv
import logging
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from .chatbot_datasets import INTERVIEW_QUESTIONS, ROLE_ROADMAPS, SKILL_RESOURCES

logger = logging.getLogger(__name__)

try:
    import faiss  # type: ignore
except Exception:  # pragma: no cover
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover
    SentenceTransformer = None  # type: ignore


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_EMBED_MODEL = os.getenv("ARIA_EMBED_MODEL", "all-MiniLM-L6-v2")
MAX_JOB_ROWS = int(os.getenv("ARIA_RAG_MAX_JOB_ROWS", "500"))
MAX_RESUME_ROWS = int(os.getenv("ARIA_RAG_MAX_RESUME_ROWS", "200"))


@dataclass
class RetrievedDocument:
    id: str
    source: str
    text: str
    score: float
    metadata: dict[str, Any]


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _tokenize(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9\+\#\.]{2,}", (value or "").lower())
        if len(token) > 1
    }


def _safe_literal_list(raw: str) -> list[str]:
    if not raw:
        return []
    cleaned = raw.strip().strip("[]")
    if not cleaned:
        return []
    return [part.strip().strip("'\"") for part in cleaned.split(",") if part.strip()]


def _build_skill_docs() -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    for skill, resource in SKILL_RESOURCES.items():
        docs.append(
            {
                "id": f"skill:{skill}",
                "source": "skill_resource",
                "text": _normalize_whitespace(
                    f"Skill: {skill}. What it is: {resource.get('what_it_is', '')}. "
                    f"Why it matters: {resource.get('why_it_matters', '')}. "
                    f"Typical learning time: {resource.get('learn_in', '')}. "
                    f"Portfolio proof: {resource.get('project_idea', '')}."
                ),
                "metadata": {"skill": skill, "difficulty": resource.get("difficulty")},
            }
        )
    return docs


def _build_roadmap_docs() -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    for role, roadmap in ROLE_ROADMAPS.items():
        for phase in roadmap.get("phases", []):
            docs.append(
                {
                    "id": f"roadmap:{role}:{phase.get('phase')}",
                    "source": "role_roadmap",
                    "text": _normalize_whitespace(
                        f"Role roadmap for {role}. Phase {phase.get('phase')}: {phase.get('name')}. "
                        f"Duration: {phase.get('duration')}. Skills: {', '.join(phase.get('skills', []))}. "
                        f"Milestone: {phase.get('milestone')}."
                    ),
                    "metadata": {"role": role, "phase": phase.get("phase")},
                }
            )
    return docs


def _build_interview_docs() -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    for role, question_bank in INTERVIEW_QUESTIONS.items():
        for category, questions in question_bank.items():
            for index, question in enumerate(questions, start=1):
                docs.append(
                    {
                        "id": f"interview:{role}:{category}:{index}",
                        "source": "interview_question",
                        "text": _normalize_whitespace(
                            f"Interview prep for {role}. Category: {category}. Question: {question}"
                        ),
                        "metadata": {"role": role, "category": category},
                    }
                )
    return docs


def _load_job_market_docs() -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    csv_path = ROOT_DIR / "ai_job_market_2026.csv"
    if not csv_path.exists():
        return docs

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader):
            if index >= MAX_JOB_ROWS:
                break
            skills = row.get("Top_Skills", "")
            docs.append(
                {
                    "id": row.get("Job_ID") or f"job:{index}",
                    "source": "job_market",
                    "text": _normalize_whitespace(
                        f"Job listing for {row.get('Job_Title', 'Unknown role')} at {row.get('Company_Name', 'Unknown company')}. "
                        f"Industry: {row.get('Industry', 'Unknown')}. "
                        f"Location: {row.get('Location', 'Unknown')}. "
                        f"Experience level: {row.get('Experience_Level', 'Unknown')}. "
                        f"Employment type: {row.get('Employment_Type', 'Unknown')}. "
                        f"Top skills: {skills}. "
                        f"Salary USD: {row.get('Salary_USD', 'Unknown')}. "
                        f"Remote allowed: {row.get('Remote_Allow_Percentage', 'Unknown')} percent. "
                        f"AI adoption: {row.get('AI_Adoption_Level', 'Unknown')}."
                    ),
                    "metadata": {
                        "job_title": row.get("Job_Title"),
                        "company": row.get("Company_Name"),
                        "location": row.get("Location"),
                        "skills": skills,
                    },
                }
            )
    return docs


def _load_resume_docs() -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = []
    csv_path = ROOT_DIR / "resume_data.csv"
    if not csv_path.exists():
        return docs

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader):
            if index >= MAX_RESUME_ROWS:
                break
            skills = ", ".join(_safe_literal_list(row.get("skills", ""))[:12])
            positions = ", ".join(_safe_literal_list(row.get("positions", ""))[:5])
            target_role = row.get("job_position_name") or row.get("\ufeffjob_position_name") or ""
            docs.append(
                {
                    "id": f"resume:{index}",
                    "source": "resume_profile",
                    "text": _normalize_whitespace(
                        f"Candidate profile. Career objective: {row.get('career_objective', '')}. "
                        f"Skills: {skills}. Previous positions: {positions}. "
                        f"Target role: {target_role}. "
                        f"Required skills in matching job: {row.get('skills_required', '')}. "
                        f"Match score: {row.get('matched_score', '')}."
                    ),
                    "metadata": {"target_role": target_role, "skills": skills},
                }
            )
    return docs


def _build_corpus() -> list[dict[str, Any]]:
    docs = []
    docs.extend(_build_skill_docs())
    docs.extend(_build_roadmap_docs())
    docs.extend(_build_interview_docs())
    docs.extend(_load_job_market_docs())
    docs.extend(_load_resume_docs())
    return [doc for doc in docs if doc["text"]]


class LocalVectorStore:
    def __init__(self) -> None:
        self.documents = _build_corpus()
        self.texts = [doc["text"] for doc in self.documents]
        self.tokens = [_tokenize(text) for text in self.texts]
        self.model = None
        self.index = None
        self.embeddings = None

        if not self.documents:
            logger.warning("ARIA vector store initialized with no documents.")
            return

        if faiss is None or SentenceTransformer is None:
            logger.warning("FAISS or sentence-transformers unavailable. Falling back to lexical retrieval.")
            return

        try:
            logger.info("Loading ARIA embedding model: %s", DEFAULT_EMBED_MODEL)
            self.model = SentenceTransformer(DEFAULT_EMBED_MODEL)
            embeddings = self.model.encode(self.texts, convert_to_numpy=True, show_progress_bar=False)
            embeddings = np.asarray(embeddings, dtype="float32")
            faiss.normalize_L2(embeddings)
            self.index = faiss.IndexFlatIP(embeddings.shape[1])
            self.index.add(embeddings)
            self.embeddings = embeddings
            logger.info("ARIA vector store ready with %s documents", len(self.documents))
        except Exception as exc:  # pragma: no cover
            logger.warning("Vector index setup failed, using lexical fallback: %s", exc)
            self.model = None
            self.index = None
            self.embeddings = None

    def retrieve(self, query: str, k: int = 5) -> list[RetrievedDocument]:
        query = _normalize_whitespace(query)
        if not query or not self.documents:
            return []

        if self.model is not None and self.index is not None:
            try:
                query_embedding = self.model.encode([query], convert_to_numpy=True)
                query_embedding = np.asarray(query_embedding, dtype="float32")
                faiss.normalize_L2(query_embedding)
                scores, indices = self.index.search(query_embedding, min(k, len(self.documents)))
                return [
                    RetrievedDocument(
                        id=self.documents[idx]["id"],
                        source=self.documents[idx]["source"],
                        text=self.documents[idx]["text"],
                        score=float(score),
                        metadata=self.documents[idx]["metadata"],
                    )
                    for score, idx in zip(scores[0], indices[0])
                    if idx >= 0
                ]
            except Exception as exc:  # pragma: no cover
                logger.warning("Vector retrieval failed, switching to lexical scoring: %s", exc)

        query_tokens = _tokenize(query)
        scored: list[tuple[float, int]] = []
        for index, tokens in enumerate(self.tokens):
            overlap = len(query_tokens & tokens)
            if not overlap:
                continue
            score = overlap / max(len(query_tokens), 1)
            scored.append((score, index))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [
            RetrievedDocument(
                id=self.documents[index]["id"],
                source=self.documents[index]["source"],
                text=self.documents[index]["text"],
                score=float(score),
                metadata=self.documents[index]["metadata"],
            )
            for score, index in scored[:k]
        ]


@lru_cache(maxsize=1)
def get_vector_store() -> LocalVectorStore:
    return LocalVectorStore()


def retrieve(query: str, k: int = 5) -> list[RetrievedDocument]:
    return get_vector_store().retrieve(query, k=k)


def format_retrieved_context(documents: list[RetrievedDocument], max_items: int = 4) -> str:
    if not documents:
        return ""
    lines = ["## Retrieved Context"]
    for document in documents[:max_items]:
        source_label = document.source.replace("_", " ")
        lines.append(f"- [{source_label}] {document.text}")
    return "\n".join(lines)
