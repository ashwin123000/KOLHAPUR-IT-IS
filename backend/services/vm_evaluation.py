from __future__ import annotations

import ast
import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Any, TypedDict

from config import settings


logger = logging.getLogger(__name__)

COMMON_ENGLISH_WORDS = {
    "this", "that", "with", "from", "have", "when", "where", "because", "chosen",
    "would", "there", "about", "their", "answer", "question", "index", "line",
}


def split_code_into_chunks(code: str, chunk_size: int = 300, overlap: int = 50) -> list[str]:
    if not code.strip():
        return []
    chunks: list[str] = []
    start = 0
    while start < len(code):
        end = start + chunk_size
        chunks.append(code[start:end])
        if end >= len(code):
            break
        start = max(0, end - overlap)
    return chunks


def add_line_numbers(code: str) -> str:
    return "\n".join(f"{i + 1:>4}: {line}" for i, line in enumerate(code.splitlines()))


def count_nested_loops(tree: ast.AST) -> int:
    total = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.While)):
            children = [child for child in ast.iter_child_nodes(node) if isinstance(child, (ast.For, ast.While))]
            total += len(children)
    return total


def compute_max_nesting_depth(tree: ast.AST, level: int = 0) -> int:
    max_depth = level
    for child in ast.iter_child_nodes(tree):
        next_level = level + 1 if isinstance(child, (ast.For, ast.While, ast.If, ast.Try, ast.With, ast.FunctionDef)) else level
        max_depth = max(max_depth, compute_max_nesting_depth(child, next_level))
    return max_depth


def analyze_code_quality(code: str) -> dict[str, Any]:
    try:
        from radon.complexity import cc_visit
    except Exception:
        cc_visit = None

    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return {"syntax_error": str(exc), "quality_score": 0}

    functions = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
    classes = [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
    loops = [n for n in ast.walk(tree) if isinstance(n, (ast.For, ast.While))]
    nested_loops = count_nested_loops(tree)
    max_nesting = compute_max_nesting_depth(tree)
    docstrings = sum(1 for f in functions if ast.get_docstring(f))
    complexity_results = cc_visit(code) if cc_visit else []
    avg_complexity = sum(r.complexity for r in complexity_results) / max(len(complexity_results), 1) if complexity_results else 1

    quality_score = 100
    if avg_complexity > 10:
        quality_score -= 20
    if max_nesting > 4:
        quality_score -= 15
    if nested_loops > 2:
        quality_score -= 10
    if len(functions) == 0:
        quality_score -= 20
    if docstrings / max(len(functions), 1) < 0.3:
        quality_score -= 10

    return {
        "function_count": len(functions),
        "class_count": len(classes),
        "loop_count": len(loops),
        "nested_loop_count": nested_loops,
        "max_nesting_depth": max_nesting,
        "avg_cyclomatic_complexity": round(avg_complexity, 2),
        "docstring_coverage_pct": round(docstrings / max(len(functions), 1) * 100),
        "quality_score": max(0, quality_score),
    }


def _get_enclosing_function_name(node: ast.AST, tree: ast.AST) -> str | None:
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            if child is node and isinstance(parent, ast.FunctionDef):
                return parent.name
    return None


def run_deterministic_checks(code: str, answers: list[dict]) -> dict[str, Any]:
    tree = ast.parse(code)
    results: dict[str, int] = {}
    has_recursion = any(
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == _get_enclosing_function_name(node, tree)
        for node in ast.walk(tree)
    )
    nested_loops = count_nested_loops(tree)
    defined_functions = {node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)}

    for ans in answers:
        text = ans["answer"].lower()
        if "recursion" in text and not has_recursion:
            results["recursion_mismatch"] = -15
        if "o(n)" in text and nested_loops > 0:
            results["complexity_mismatch"] = -10
        words = set(re.findall(r"\b[a-z_]{3,}\b", text))
        phantom_refs = words - defined_functions - COMMON_ENGLISH_WORDS
        if len(phantom_refs) > 3:
            results["phantom_references"] = -8
        if len(ans["answer"].strip()) < 30:
            results[f"too_short_q{ans['question_index']}"] = -20

    total_penalty = sum(results.values())
    return {"penalties": results, "total_penalty": total_penalty}


def compute_execution_behavior_score(metrics: Any) -> int:
    score = 100
    if metrics.run_count > 15:
        score -= min(30, (metrics.run_count - 15) * 2)
    error_rate = metrics.error_count / max(metrics.run_count, 1)
    if error_rate > 0.5:
        score -= round(error_rate * 20)
    if getattr(metrics, "minutes_to_first_clean_run", 999) < 10:
        score += 10
    if metrics.run_count == 1 and getattr(metrics, "first_run_was_clean", False):
        score -= 5
    return max(0, min(100, score))


def compute_final_score(llm_raw_score: int, rule_penalties: int, code_quality_score: int, execution_behavior_score: int, participation_score: int = 100) -> int:
    weighted = (
        0.50 * llm_raw_score +
        0.20 * code_quality_score +
        0.20 * execution_behavior_score +
        0.10 * participation_score
    )
    penalized = weighted + rule_penalties
    return max(0, min(100, round(penalized)))


def persist_chunks(session_id: str, chunks: list[str]) -> None:
    base = Path(settings.CHROMA_PERSIST_DIR)
    base.mkdir(parents=True, exist_ok=True)
    (base / f"{session_id}.json").write_text(json.dumps(chunks), encoding="utf-8")


def load_chunks(session_id: str) -> list[str]:
    path = Path(settings.CHROMA_PERSIST_DIR) / f"{session_id}.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def retrieve_relevant_chunks(session_id: str, answer_text: str, k: int = 3) -> list[str]:
    chunks = load_chunks(session_id)
    if not chunks:
        return []
    answer_terms = set(re.findall(r"\w+", answer_text.lower()))
    ranked = sorted(
        chunks,
        key=lambda chunk: len(answer_terms & set(re.findall(r"\w+", chunk.lower()))),
        reverse=True,
    )
    return ranked[:k]


def fallback_generate_questions(code: str) -> list[dict[str, Any]]:
    lines = [line for line in code.splitlines() if line.strip()]
    selected = lines[:3] if len(lines) >= 3 else lines + ["pass"] * (3 - len(lines))
    types = ["tradeoff", "optimization", "edge_case"]
    questions = []
    for idx, line in enumerate(selected, start=1):
        snippet = " ".join(line.strip().split()[:10])
        questions.append({
            "index": idx,
            "type": types[idx - 1],
            "line_reference": idx,
            "code_snippet": snippet,
            "text": f"On line {idx}, you wrote `{snippet}`. Explain the {types[idx - 1]} behind that choice.",
        })
    return questions


def fallback_score_answer(question_text: str, answer_text: str, relevant_chunks: list[str]) -> dict[str, Any]:
    score = 40
    if len(answer_text.strip()) > 80:
        score += 20
    overlap = len(set(re.findall(r"\w+", answer_text.lower())) & set(re.findall(r"\w+", " ".join(relevant_chunks).lower())))
    score += min(40, overlap * 2)
    return {
        "score": max(0, min(100, score)),
        "feedback": f"The answer addressed the question with {'good' if score >= 70 else 'limited'} grounding in the submitted code.",
    }


class EvalState(TypedDict, total=False):
    session_id: str
    code: str
    ast_metrics: dict[str, Any]
    questions: list[dict[str, Any]]
    answers: list[dict[str, Any]]
    per_answer_scores: list[dict[str, Any]]
    final_score: int
    reasoning: str

