from __future__ import annotations

import json
import math
import re
from collections import Counter
from datetime import datetime
from statistics import mean, pstdev
from typing import Any


INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


TECH_RULES = {
    "React": {"packages": {"react", "react-dom"}, "imports": {"react"}, "readme": {"react"}},
    "Vue": {"packages": {"vue"}, "imports": {"vue"}, "readme": {"vue"}},
    "Angular": {"packages": {"@angular/core"}, "imports": {"@angular/core"}, "readme": {"angular"}},
    "Svelte": {"packages": {"svelte"}, "imports": {"svelte"}, "readme": {"svelte"}},
    "Node.js": {"packages": {"node"}, "imports": set(), "readme": {"node.js", "nodejs", "node"}},
    "Express": {"packages": {"express"}, "imports": {"express"}, "readme": {"express"}},
    "FastAPI": {"packages": {"fastapi"}, "imports": {"fastapi"}, "readme": {"fastapi"}},
    "Flask": {"packages": {"flask"}, "imports": {"flask"}, "readme": {"flask"}},
    "Django": {"packages": {"django"}, "imports": {"django"}, "readme": {"django"}},
    "SQLAlchemy": {"packages": {"sqlalchemy"}, "imports": {"sqlalchemy"}, "readme": {"sqlalchemy"}},
    "Prisma": {"packages": {"prisma", "@prisma/client"}, "imports": {"@prisma/client", "prisma"}, "readme": {"prisma"}},
    "Mongoose": {"packages": {"mongoose"}, "imports": {"mongoose"}, "readme": {"mongoose"}},
    "MongoDB": {"packages": {"mongodb", "mongoose", "pymongo", "motor"}, "imports": {"mongodb", "mongoose", "pymongo", "motor"}, "readme": {"mongodb", "mongo"}},
    "PostgreSQL": {"packages": {"pg", "psycopg2", "psycopg2-binary", "asyncpg", "pgvector"}, "imports": {"pg", "psycopg2", "asyncpg", "pgvector"}, "readme": {"postgres", "postgresql"}},
    "MySQL": {"packages": {"mysql", "mysql2", "pymysql"}, "imports": {"mysql", "mysql2", "pymysql"}, "readme": {"mysql"}},
    "Docker": {"packages": set(), "imports": set(), "readme": {"docker"}},
    "Kubernetes": {"packages": set(), "imports": set(), "readme": {"kubernetes", "k8s"}},
    "Terraform": {"packages": set(), "imports": set(), "readme": {"terraform"}},
    "GitHub Actions": {"packages": set(), "imports": set(), "readme": {"github actions"}},
    "PyTorch": {"packages": {"torch", "pytorch"}, "imports": {"torch"}, "readme": {"pytorch", "torch"}},
    "TensorFlow": {"packages": {"tensorflow"}, "imports": {"tensorflow"}, "readme": {"tensorflow"}},
    "Scikit-learn": {"packages": {"scikit-learn", "sklearn"}, "imports": {"sklearn"}, "readme": {"scikit-learn", "sklearn"}},
    "XGBoost": {"packages": {"xgboost"}, "imports": {"xgboost"}, "readme": {"xgboost"}},
    "LightGBM": {"packages": {"lightgbm"}, "imports": {"lightgbm"}, "readme": {"lightgbm"}},
    "Transformers": {"packages": {"transformers"}, "imports": {"transformers"}, "readme": {"transformers"}},
    "OpenAI API": {"packages": {"openai"}, "imports": {"openai"}, "readme": {"openai", "gpt-4", "gpt"}},
    "LangChain": {"packages": {"langchain"}, "imports": {"langchain"}, "readme": {"langchain"}},
    "LangGraph": {"packages": {"langgraph"}, "imports": {"langgraph"}, "readme": {"langgraph"}},
    "Pandas": {"packages": {"pandas"}, "imports": {"pandas"}, "readme": {"pandas"}},
    "NumPy": {"packages": {"numpy"}, "imports": {"numpy"}, "readme": {"numpy"}},
    "Spark": {"packages": {"pyspark"}, "imports": {"pyspark"}, "readme": {"spark", "pyspark"}},
    "Airflow": {"packages": {"apache-airflow"}, "imports": {"airflow"}, "readme": {"airflow"}},
    "dbt": {"packages": {"dbt-core"}, "imports": {"dbt"}, "readme": {"dbt"}},
    "Kafka": {"packages": {"kafka", "kafka-python", "confluent-kafka"}, "imports": {"kafka", "confluent_kafka"}, "readme": {"kafka"}},
    "Flink": {"packages": set(), "imports": set(), "readme": {"flink"}},
    "BigQuery": {"packages": {"google-cloud-bigquery"}, "imports": {"google.cloud.bigquery"}, "readme": {"bigquery"}},
    "Redshift": {"packages": set(), "imports": set(), "readme": {"redshift"}},
    "HTML": {"packages": set(), "imports": set(), "readme": {"html"}},
    "CSS": {"packages": set(), "imports": set(), "readme": {"css"}},
    "JavaScript": {"packages": set(), "imports": set(), "readme": {"javascript"}},
    "TypeScript": {"packages": {"typescript"}, "imports": set(), "readme": {"typescript"}},
    "Swift": {"packages": set(), "imports": set(), "readme": {"swift"}},
    "Kotlin": {"packages": set(), "imports": set(), "readme": {"kotlin"}},
    "Dart": {"packages": set(), "imports": set(), "readme": {"dart"}},
    "React Native": {"packages": {"react-native"}, "imports": {"react-native"}, "readme": {"react native"}},
    "Go": {"packages": set(), "imports": set(), "readme": {"golang", "go"}},
    "Rust": {"packages": set(), "imports": set(), "readme": {"rust"}},
    "C++": {"packages": set(), "imports": set(), "readme": {"c++"}},
}

TUTORIAL_NAMES = {
    "todo-app",
    "weather-app",
    "netflix-clone",
    "iris-classification",
    "movie-recommender",
    "blog-app",
    "chat-app",
    "portfolio-template",
}


def _safe_str(value: Any) -> str:
    return "" if value is None else str(value)


def _lower_set(values: list[str] | set[str]) -> set[str]:
    return {_safe_str(v).strip().lower() for v in values if _safe_str(v).strip()}


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", _safe_str(text)).strip()


def _to_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _parse_json_like(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _parse_dependency_lines(raw: str) -> set[str]:
    deps: set[str] = set()
    for line in _safe_str(raw).splitlines():
        cleaned = line.strip()
        if not cleaned or cleaned.startswith("#"):
            continue
        cleaned = re.split(r"[<>=~!\[\s]", cleaned, maxsplit=1)[0]
        if cleaned:
            deps.add(cleaned.lower())
    return deps


def _parse_go_mod(raw: str) -> set[str]:
    deps: set[str] = set()
    for line in _safe_str(raw).splitlines():
        cleaned = line.strip()
        if cleaned.startswith("require "):
            parts = cleaned.split()
            if len(parts) >= 2:
                deps.add(parts[1].lower())
    return deps


def _flatten_file_tree(file_tree: Any) -> list[str]:
    if isinstance(file_tree, list):
        return [_safe_str(item) for item in file_tree]
    if isinstance(file_tree, str):
        return [line.strip() for line in file_tree.splitlines() if line.strip()]
    return []


def _extract_imports_from_code(content: str, filename: str) -> set[str]:
    imports: set[str] = set()
    ext = filename.lower()
    for line in _safe_str(content).splitlines():
        stripped = line.strip()
        py_import = re.match(r"(?:from|import)\s+([a-zA-Z0-9_\.]+)", stripped)
        js_import = re.match(r"(?:import .* from|const .* = require\()\s*[\"']([^\"']+)", stripped)
        if py_import:
            imports.add(py_import.group(1).split(".")[0].lower())
        elif js_import:
            imports.add(js_import.group(1).split("/")[0].lower())
        elif ext.endswith(".go"):
            if stripped.startswith('"') and stripped.endswith('"'):
                imports.add(stripped.strip('"').split("/")[0].lower())
    return imports


def _collect_imports(payload: dict[str, Any]) -> dict[str, list[str]]:
    provided = payload.get("import_scan")
    if isinstance(provided, dict) and provided:
        normalized: dict[str, list[str]] = {}
        for filename, modules in provided.items():
            normalized[_safe_str(filename)] = [str(module).lower() for module in _to_list(modules)]
        return normalized

    derived: dict[str, list[str]] = {}
    for file in _to_list(payload.get("sample_code_files")):
        if not isinstance(file, dict):
            continue
        filename = _safe_str(file.get("filename"))
        derived[filename] = sorted(_extract_imports_from_code(_safe_str(file.get("content")), filename))
    return derived


def _readme_mentions(text: str, tech: str) -> bool:
    rules = TECH_RULES.get(tech, {})
    haystack = _safe_str(text).lower()
    return any(term in haystack for term in rules.get("readme", set()))


def _determine_domain(payload: dict[str, Any], dependencies: set[str], files: list[str]) -> tuple[str, str]:
    languages = payload.get("languages") or {}
    language_share = {str(k).lower(): float(v or 0) for k, v in languages.items()} if isinstance(languages, dict) else {}
    lower_files = [path.lower() for path in files]

    frontend_signal = (
        sum(language_share.get(name, 0) for name in ("javascript", "typescript", "html", "css")) >= 60
        or any(dep in dependencies for dep in {"react", "vue", "@angular/core", "svelte"})
        or any(part in path for path in lower_files for part in ("components/", "pages/", "index.html"))
    )
    backend_signal = (
        any(dep in dependencies for dep in {"express", "fastapi", "flask", "django", "sqlalchemy", "mongoose", "prisma", "pg"})
        or any(part in path for path in lower_files for part in ("routes/", "controllers/", "handlers/", "middleware/"))
    )
    ml_signal = (
        language_share.get("python", 0) >= 40
        and any(dep in dependencies for dep in {"torch", "tensorflow", "scikit-learn", "sklearn", "xgboost", "lightgbm", "transformers"})
    ) or any(path.endswith(".ipynb") or "/models/" in path or "/notebooks/" in path for path in lower_files)
    devops_signal = any(
        token in path
        for path in lower_files
        for token in ("dockerfile", "docker-compose", ".github/workflows", ".tf", "k8s", "helm", "ansible", "jenkinsfile")
    )
    mobile_signal = any(token in path for path in lower_files for token in ("android/", "ios/", "podfile", "build.gradle", "pubspec.yaml")) or any(
        dep in dependencies for dep in {"react-native"}
    )
    data_eng_signal = any(dep in dependencies for dep in {"apache-airflow", "pyspark", "dbt-core", "kafka", "confluent-kafka"}) or any(
        token in path for path in lower_files for token in ("dags/", "pipelines/", "transformations/")
    )
    systems_signal = any(name in language_share for name in ("c", "c++", "rust", "go")) and any(
        token in path for path in lower_files for token in ("makefile", "cmakelists.txt")
    )

    if frontend_signal and backend_signal:
        return "Full Stack", "Domain 5"
    if ml_signal:
        return "ML-AI", "Domain 3"
    if devops_signal:
        return "DevOps", "Domain 4"
    if mobile_signal:
        return "Mobile", "Domain 6"
    if data_eng_signal:
        return "Data Eng", "Domain 7"
    if systems_signal:
        return "Systems", "Domain 8"
    if backend_signal:
        return "Backend", "Domain 2"
    if frontend_signal:
        return "Web", "Domain 1"
    return "INSUFFICIENT_DATA", INSUFFICIENT_DATA


def _extract_dependencies(payload: dict[str, Any]) -> set[str]:
    deps: set[str] = set()
    package_json = _parse_json_like(payload.get("package_json"))
    for section in ("dependencies", "devDependencies", "peerDependencies"):
        values = package_json.get(section) or {}
        if isinstance(values, dict):
            deps.update(str(name).lower() for name in values.keys())
    deps.update(_parse_dependency_lines(_safe_str(payload.get("requirements_txt"))))
    deps.update(_parse_go_mod(_safe_str(payload.get("go_mod"))))
    deps.update(_parse_dependency_lines(_safe_str(payload.get("other_deps"))))
    return deps


def _extract_stack(payload: dict[str, Any], dependencies: set[str], import_scan: dict[str, list[str]]) -> dict[str, Any]:
    readme = _safe_str(payload.get("readme_content"))
    files = _flatten_file_tree(payload.get("file_tree"))
    lower_files = [path.lower() for path in files]
    import_modules = {module for modules in import_scan.values() for module in modules}

    confirmed_used: list[str] = []
    confirmed_only: list[str] = []
    claimed_only: list[str] = []
    inferred: list[str] = []

    for tech, rule in TECH_RULES.items():
        in_deps = bool(rule["packages"] & dependencies)
        in_imports = bool(rule["imports"] & import_modules) if rule["imports"] else False
        in_readme = _readme_mentions(readme, tech)
        inferred_hit = False
        if tech == "Docker":
            inferred_hit = any("dockerfile" in path or "docker-compose" in path for path in lower_files)
        elif tech == "Terraform":
            inferred_hit = any(path.endswith(".tf") for path in lower_files)
        elif tech == "GitHub Actions":
            inferred_hit = any(".github/workflows" in path for path in lower_files)
        elif tech == "Kubernetes":
            inferred_hit = any(token in path for path in lower_files for token in ("k8s", "deployment.yaml", "service.yaml"))
        elif tech == "HTML":
            inferred_hit = any(path.endswith(".html") for path in lower_files)
        elif tech == "CSS":
            inferred_hit = any(path.endswith(".css") for path in lower_files)
        elif tech == "JavaScript":
            inferred_hit = any(path.endswith((".js", ".jsx")) for path in lower_files)
        elif tech == "TypeScript":
            inferred_hit = any(path.endswith((".ts", ".tsx")) for path in lower_files)
        elif tech == "Go":
            inferred_hit = any(path.endswith(".go") for path in lower_files)
        elif tech == "Rust":
            inferred_hit = any(path.endswith(".rs") for path in lower_files)
        elif tech == "C++":
            inferred_hit = any(path.endswith((".cpp", ".cc", ".hpp", ".h")) for path in lower_files)

        if in_deps and (in_imports or not rule["imports"] and inferred_hit):
            confirmed_used.append(tech)
        elif in_deps:
            confirmed_only.append(tech)
        elif in_imports:
            inferred.append(tech)
        elif in_readme:
            claimed_only.append(tech)
        elif inferred_hit:
            inferred.append(tech)

    deduped = lambda values: sorted(dict.fromkeys(values))
    confirmed_used = deduped(confirmed_used)
    confirmed_only = [item for item in deduped(confirmed_only) if item not in confirmed_used]
    claimed_only = [item for item in deduped(claimed_only) if item not in confirmed_used and item not in confirmed_only]
    inferred = [item for item in deduped(inferred) if item not in confirmed_used and item not in confirmed_only and item not in claimed_only]

    total = len(confirmed_used) + len(confirmed_only) + len(claimed_only) + len(inferred)
    completeness = "HIGH" if total >= 6 else "MEDIUM" if total >= 3 else "LOW"
    return {
        "confirmed_used_stack": confirmed_used or [INSUFFICIENT_DATA] if total == 0 else confirmed_used,
        "confirmed_only_stack": confirmed_only or ([] if total else [INSUFFICIENT_DATA]),
        "claimed_only": claimed_only or ([] if total else [INSUFFICIENT_DATA]),
        "inferred_stack": inferred or ([] if total else [INSUFFICIENT_DATA]),
        "stack_completeness": completeness if total else INSUFFICIENT_DATA,
    }


def _check_execution(payload: dict[str, Any]) -> dict[str, Any]:
    attempted = payload.get("execution_attempted")
    status = _safe_str(payload.get("execution_status")).upper()
    logs = _safe_str(payload.get("execution_logs"))
    endpoint = payload.get("endpoint_test_result") or {}
    build_success = payload.get("build_success")
    flags: list[str] = []
    endpoint_verified = "NOT_TESTED"
    bonus = 0
    impact = "Execution verification skipped."

    if attempted is False or not status:
        return {
            "execution_status": "NOT_ATTEMPTED",
            "endpoint_verified": "NOT_TESTED",
            "execution_flags": ["Execution verification was not attempted."],
            "execution_impact": impact,
            "execution_bonus": 0,
        }

    if endpoint:
        endpoint_verified = "YES" if int(endpoint.get("status_code") or 0) < 400 else "NO"

    if status == "SUCCESS":
        bonus = 15
        impact = "Strong authenticity signal because the project executed successfully."
        if build_success is False:
            flags.append("Build flag contradicts success status.")
    elif status == "PARTIAL":
        impact = "Project appears partially runnable; likely environment-specific configuration is missing."
        flags.append("Project runs partially or requires additional configuration.")
    elif status == "FAILED":
        lowered = logs.lower()
        bonus = -10
        impact = "Execution failure weakens authenticity unless environment setup is clearly missing."
        if "syntaxerror" in lowered or "syntax error" in lowered:
            flags.append("Syntax error detected during execution.")
        elif "module not found" in lowered or "no module named" in lowered or "cannot find module" in lowered:
            flags.append("Dependency or import error detected during execution.")
        else:
            flags.append("Runtime startup error detected during execution.")
        if endpoint:
            endpoint_verified = "NO"
    else:
        status = "NOT_ATTEMPTED"
        flags.append("Execution status missing or unrecognized.")

    return {
        "execution_status": status,
        "endpoint_verified": endpoint_verified,
        "execution_flags": flags or ([] if status == "SUCCESS" else ["No detailed execution issues provided."]),
        "execution_impact": impact,
        "execution_bonus": bonus,
    }


def _usage_verification(payload: dict[str, Any], dependencies: set[str], import_scan: dict[str, list[str]], stack: dict[str, Any]) -> dict[str, Any]:
    import_modules = {module for modules in import_scan.values() for module in modules}
    major_deps = set()
    for tech in stack.get("confirmed_used_stack", []) + stack.get("confirmed_only_stack", []):
        rule = TECH_RULES.get(tech)
        if rule:
            major_deps.update(rule["packages"])

    actively_used: list[str] = []
    unused: list[str] = []
    flags: list[str] = []

    for dep in sorted(major_deps):
        if dep in import_modules or any(module.startswith(dep) for module in import_modules):
            actively_used.append(dep)
        else:
            unused.append(dep)

    ml_unused = any(dep in unused for dep in {"torch", "tensorflow", "scikit-learn", "sklearn", "xgboost", "lightgbm", "transformers"})
    if ml_unused:
        flags.append("ML library installed but no usage evidence found.")
    if "express" in unused or "fastapi" in unused:
        flags.append("Web framework installed but no routing usage found.")
    if "openai" in unused:
        flags.append("OpenAI dependency present but no usage evidence found.")

    total = len(actively_used) + len(unused)
    if not import_scan:
        score = "NOT_VERIFIED"
    elif total == 0:
        score = INSUFFICIENT_DATA
    else:
        ratio = len(actively_used) / max(total, 1)
        score = "HIGH" if ratio > 0.8 else "MEDIUM" if ratio >= 0.5 else "LOW"

    return {
        "actively_used_deps": actively_used or ([INSUFFICIENT_DATA] if not import_scan else []),
        "unused_deps": unused or ([] if total else [INSUFFICIENT_DATA]),
        "actual_usage_score": score,
        "usage_flags": flags,
        "usage_verified_count": f"{len(actively_used)}/{total}" if total else INSUFFICIENT_DATA,
        "dead_dependency_count": len(unused),
    }


def _dependency_validation(payload: dict[str, Any], dependencies: set[str], category: str, stack: dict[str, Any]) -> dict[str, Any]:
    lower_deps = dependencies
    missing: list[str] = []
    irrelevant: list[str] = []
    verdict = "VALID"

    if category == "Backend":
        if not lower_deps & {"express", "fastapi", "flask", "django"}:
            missing.append("Missing backend framework")
        if not lower_deps & {"pg", "mongoose", "sqlalchemy", "prisma", "psycopg2", "asyncpg", "mongodb", "motor", "pymongo"}:
            missing.append("Missing database driver or ORM")
        if not lower_deps & {"dotenv", "python-dotenv"}:
            missing.append("Missing environment configuration dependency")
    elif category == "ML-AI":
        if not lower_deps & {"torch", "tensorflow", "scikit-learn", "sklearn", "xgboost", "lightgbm", "transformers"}:
            missing.append("Missing core ML library")
        if not lower_deps & {"pandas", "numpy"}:
            missing.append("Missing data processing dependency")
    elif category == "DevOps":
        files = [path.lower() for path in _flatten_file_tree(payload.get("file_tree"))]
        if not any(token in path for path in files for token in ("dockerfile", ".github/workflows", ".tf", "k8s", "helm", "ansible", "jenkinsfile")):
            missing.append("Missing core infrastructure files")
    elif category == "Full Stack":
        if not lower_deps & {"react", "vue", "@angular/core", "svelte"}:
            missing.append("Missing frontend framework dependency")
        if not lower_deps & {"express", "fastapi", "flask", "django", "nestjs"}:
            missing.append("Missing backend framework dependency")

    if category == "Backend" and lower_deps & {"torch", "tensorflow"} and not stack.get("confirmed_used_stack"):
        irrelevant.extend(sorted(lower_deps & {"torch", "tensorflow"}))

    if missing:
        verdict = "INCONSISTENT" if len(missing) >= 2 else "PARTIAL"

    confidence = "HIGH" if verdict == "VALID" else "MEDIUM" if verdict == "PARTIAL" else "LOW"
    return {
        "dependency_verdict": verdict,
        "missing_critical_deps": missing or ([] if dependencies else [INSUFFICIENT_DATA]),
        "irrelevant_deps": irrelevant,
        "dep_confidence": confidence if dependencies else INSUFFICIENT_DATA,
    }


def _structure_analysis(payload: dict[str, Any], category: str) -> dict[str, Any]:
    files = [path.lower() for path in _flatten_file_tree(payload.get("file_tree"))]
    tests = _to_list(payload.get("test_files"))
    has_tests = "YES" if tests else "NO"
    if not tests and any("test" in path for path in files):
        has_tests = "PARTIAL"
    has_ci_cd = "YES" if any(token in path for path in files for token in (".github/workflows", "jenkinsfile", ".gitlab-ci.yml")) else "NO"
    docs_hits = [path for path in files if any(token in path for token in ("readme", "docs/", "contributing", "openapi", "swagger"))]
    has_docs = "YES" if len(docs_hits) >= 2 else "PARTIAL" if docs_hits else "NO"

    module_hits = sum(
        1 for token in ("src/", "lib/", "tests/", "config/", "utils/", "docs/", "routes/", "models/", "controllers/", "middleware/", "client/", "server/", "backend/", "frontend/")
        if any(token in path for path in files)
    )
    quality = "EMPTY" if not files else "FLAT" if len(files) <= 5 else "WEAK" if module_hits <= 1 else "ADEQUATE" if module_hits <= 4 else "STRONG"

    if category == "ML-AI" and any(path.endswith(".ipynb") for path in files) and not any("src/" in path or "app.py" in path for path in files):
        pattern = "Notebook"
    elif category == "Backend":
        pattern = "MVC" if any("controllers/" in path for path in files) else "Monolith"
    elif category == "Full Stack":
        pattern = "Monolith" if any("frontend/" in path and "backend/" in path for path in files) else "Unknown"
    elif category == "DevOps":
        pattern = "Pipeline"
    else:
        pattern = "Unknown" if quality in {"EMPTY", "FLAT"} else "Monolith"

    flags: list[str] = []
    if quality in {"FLAT", "WEAK"}:
        flags.append("Repository structure shows weak modular organization.")
    if has_tests == "NO":
        flags.append("No test files found.")
    if has_ci_cd == "NO":
        flags.append("No CI/CD configuration found.")

    return {
        "structure_quality": quality,
        "has_tests": has_tests,
        "has_ci_cd": has_ci_cd,
        "has_docs": has_docs,
        "architecture_pattern": pattern,
        "structure_flags": flags,
    }


def _readme_analysis(payload: dict[str, Any], stack: dict[str, Any], category: str) -> dict[str, Any]:
    readme = _safe_str(payload.get("readme_content"))
    if not readme:
        return {
            "readme_verdict": "MISSING",
            "overclaim_instances": [{"claim": "README missing", "evidence_against": "No project documentation provided."}],
            "template_score": 0,
            "readme_confidence": "LOW",
        }

    lowered = readme.lower()
    overclaims: list[dict[str, str]] = []
    template_score = 0
    if "production-ready" in lowered:
        template_score += 2
    if "ai-powered" in lowered:
        template_score += 2
    if "scalable" in lowered:
        template_score += 2
    if "microservices" in lowered and stack.get("stack_completeness") != "HIGH":
        overclaims.append({"claim": "microservices", "evidence_against": "Repository structure does not show multiple services."})
    if "gpt-4" in lowered and "OpenAI API" not in stack.get("confirmed_used_stack", []) and "OpenAI API" not in stack.get("confirmed_only_stack", []):
        overclaims.append({"claim": "Uses GPT-4/OpenAI", "evidence_against": "No dependency or import evidence for OpenAI API."})
    if "machine learning" in lowered and category == "ML-AI" and not any(
        tech in stack.get("confirmed_used_stack", []) for tech in ("PyTorch", "TensorFlow", "Scikit-learn", "XGBoost", "LightGBM", "Transformers")
    ):
        overclaims.append({"claim": "Machine learning project", "evidence_against": "No ML dependency usage was verified."})
    if "deployed on aws" in lowered and "Terraform" not in stack.get("confirmed_used_stack", []) and "Docker" not in stack.get("confirmed_used_stack", []):
        overclaims.append({"claim": "Deployed on AWS", "evidence_against": "Deployment evidence was not provided."})
    if "quick start" not in lowered and "installation" not in lowered and "usage" not in lowered:
        template_score += 3
    if len(readme.split()) < 80:
        template_score += 2

    verdict = "ACCURATE"
    if template_score >= 7:
        verdict = "TEMPLATE"
    if overclaims:
        verdict = "OVERCLAIMING"
    elif template_score >= 4:
        verdict = "PARTIALLY_ACCURATE"

    confidence = "HIGH" if verdict == "ACCURATE" else "MEDIUM" if verdict == "PARTIALLY_ACCURATE" else "LOW"
    return {
        "readme_verdict": verdict,
        "overclaim_instances": overclaims or [],
        "template_score": min(template_score, 10),
        "readme_confidence": confidence,
    }


def _commit_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    commit_count = int(payload.get("commit_count") or 0)
    timestamps = [ts for ts in _to_list(payload.get("commit_timestamps")) if _safe_str(ts)]
    messages = [_safe_str(msg).strip().lower() for msg in _to_list(payload.get("commit_messages")) if _safe_str(msg).strip()]
    file_counts = payload.get("commit_file_counts") or []
    flags: list[str] = []

    if not timestamps:
        quality = "WEAK" if commit_count < 10 else "ADEQUATE"
        return {
            "commit_quality": quality,
            "development_duration": INSUFFICIENT_DATA,
            "burst_detection": INSUFFICIENT_DATA,
            "message_quality": "LOW" if messages and len(set(messages)) < max(2, len(messages) // 3) else INSUFFICIENT_DATA,
            "commit_flags": ["Commit timeline unavailable."],
            "development_span_days": INSUFFICIENT_DATA,
            "burst_ratio": INSUFFICIENT_DATA,
            "avg_files_per_commit": INSUFFICIENT_DATA,
            "message_diversity_score": round(len(set(messages)) / max(len(messages), 1), 2) if messages else INSUFFICIENT_DATA,
        }

    parsed = []
    for ts in timestamps:
        try:
            parsed.append(datetime.fromisoformat(_safe_str(ts).replace("Z", "+00:00")))
        except Exception:
            continue
    parsed.sort()
    if not parsed:
        return {
            "commit_quality": "WEAK",
            "development_duration": INSUFFICIENT_DATA,
            "burst_detection": INSUFFICIENT_DATA,
            "message_quality": INSUFFICIENT_DATA,
            "commit_flags": ["Commit timestamps could not be parsed."],
            "development_span_days": INSUFFICIENT_DATA,
            "burst_ratio": INSUFFICIENT_DATA,
            "avg_files_per_commit": INSUFFICIENT_DATA,
            "message_diversity_score": INSUFFICIENT_DATA,
        }

    span_days = max((parsed[-1] - parsed[0]).days, 0)
    bucket_counts = Counter(dt.strftime("%Y-%m-%d") for dt in parsed)
    burst_ratio = round(max(bucket_counts.values()) / max(len(parsed), 1) * 100, 1)
    avg_files = round(mean([int(item.get("files_changed") or 0) for item in file_counts]), 1) if file_counts else INSUFFICIENT_DATA
    diversity = round(len(set(messages)) / max(len(messages), 1), 2) if messages else INSUFFICIENT_DATA

    if commit_count < 10:
        flags.append("Fewer than 10 commits recorded.")
    if burst_ratio != INSUFFICIENT_DATA and burst_ratio > 50:
        flags.append("More than half of commits occurred within a single 24-hour window.")
    if file_counts and int(file_counts[0].get("files_changed") or 0) >= 50:
        flags.append("Initial commit appears to contain a bulk project drop.")
    if messages and diversity != INSUFFICIENT_DATA and diversity < 0.4:
        flags.append("Commit messages show low diversity.")

    msg_quality = "HIGH" if diversity != INSUFFICIENT_DATA and diversity >= 0.8 else "MEDIUM" if diversity != INSUFFICIENT_DATA and diversity >= 0.5 else "LOW"
    if commit_count >= 20 and span_days >= 14 and burst_ratio <= 50 and msg_quality != "LOW":
        quality = "STRONG"
    elif commit_count >= 10 and span_days >= 5:
        quality = "ADEQUATE"
    elif burst_ratio > 70 or (file_counts and int(file_counts[0].get("files_changed") or 0) >= 50 and commit_count <= 3):
        quality = "SUSPICIOUS"
    else:
        quality = "WEAK"

    return {
        "commit_quality": quality,
        "development_duration": f"{span_days} days",
        "burst_detection": "YES" if burst_ratio != INSUFFICIENT_DATA and burst_ratio > 50 else "NO",
        "message_quality": msg_quality,
        "commit_flags": flags,
        "development_span_days": span_days,
        "burst_ratio": burst_ratio,
        "avg_files_per_commit": avg_files,
        "message_diversity_score": diversity,
    }


def _trajectory_analysis(payload: dict[str, Any], commit_analysis: dict[str, Any]) -> dict[str, Any]:
    timestamps = [ts for ts in _to_list(payload.get("commit_timestamps")) if _safe_str(ts)]
    file_counts = payload.get("commit_file_counts") or []
    messages = [_safe_str(msg).lower() for msg in _to_list(payload.get("commit_messages")) if _safe_str(msg)]
    if len(timestamps) < 3 or not file_counts:
        return {
            "development_maturity": "INSUFFICIENT_DATA",
            "trajectory_flags": ["Insufficient commit progression data to assess trajectory."],
            "trajectory_confidence": "LOW",
        }

    first_files = int(file_counts[0].get("files_changed") or 0)
    late_messages = " ".join(messages[max(0, len(messages) * 4 // 5):])
    early_messages = " ".join(messages[: max(1, len(messages) // 5)])
    refactor_signals = sum(1 for msg in messages if any(word in msg for word in ("refactor", "clean", "restructure")))
    bugfix_signals = sum(1 for msg in messages if any(word in msg for word in ("fix", "bug", "resolve", "patch")))
    flags: list[str] = []

    if first_files >= 50:
        maturity = "RUSHED"
        flags.append("Initial commit appears too large for organic project scaffolding.")
    elif refactor_signals or bugfix_signals:
        maturity = "ORGANIC"
        flags.append("Commit history shows refinement phases such as fixes or refactors.")
    elif commit_analysis.get("burst_detection") == "YES":
        maturity = "PATCHY"
        flags.append("Commit cadence is bursty rather than steadily progressive.")
    else:
        maturity = "PATCHY"

    if "readme" in late_messages and "init" not in early_messages and "setup" not in early_messages:
        flags.append("Documentation appears to have landed late in the timeline.")

    confidence = "HIGH" if len(file_counts) >= 5 else "MEDIUM"
    return {
        "development_maturity": maturity,
        "trajectory_flags": flags,
        "trajectory_confidence": confidence,
    }


def _originality_analysis(payload: dict[str, Any], commit_analysis: dict[str, Any]) -> dict[str, Any]:
    repo_name = _safe_str(payload.get("repo_name")).lower()
    readme = _safe_str(payload.get("readme_content")).lower()
    is_fork = bool(payload.get("is_fork"))
    evidence: list[str] = []
    verdict = "AMBIGUOUS"

    if is_fork:
        verdict = "LIKELY_FORKED"
        evidence.append("Repository is marked as a fork.")
    elif repo_name in TUTORIAL_NAMES or "tutorial" in readme or "course" in readme:
        verdict = "LIKELY_TUTORIAL"
        evidence.append("Repository naming or README suggests tutorial lineage.")
    elif "Initial commit appears to contain a bulk project drop." in commit_analysis.get("commit_flags", []):
        verdict = "AMBIGUOUS"
        evidence.append("Commit history suggests code may have been pasted in bulk.")
    else:
        files = [path.lower() for path in _flatten_file_tree(payload.get("file_tree"))]
        if len(files) > 15 and payload.get("contributors_count", 1) >= 1:
            verdict = "LIKELY_ORIGINAL"
            evidence.append("Repository shows customized structure beyond a toy template.")

    confidence = "HIGH" if verdict in {"LIKELY_FORKED", "LIKELY_TUTORIAL"} else "MEDIUM" if evidence else "LOW"
    return {
        "originality_verdict": verdict,
        "originality_evidence": evidence or [INSUFFICIENT_DATA],
        "originality_confidence": confidence,
    }


def _derive_code_depth(payload: dict[str, Any], structure: dict[str, Any], usage: dict[str, Any], execution: dict[str, Any]) -> str:
    sample_files = [file for file in _to_list(payload.get("sample_code_files")) if isinstance(file, dict)]
    score = 0
    score += min(len(sample_files), 8) * 6
    score += 15 if structure.get("structure_quality") == "STRONG" else 8 if structure.get("structure_quality") == "ADEQUATE" else 0
    score += 10 if structure.get("has_tests") == "YES" else 4 if structure.get("has_tests") == "PARTIAL" else 0
    score += 10 if usage.get("actual_usage_score") == "HIGH" else 5 if usage.get("actual_usage_score") == "MEDIUM" else 0
    score += 8 if execution.get("execution_status") == "SUCCESS" else 0
    if not sample_files:
        return "CANNOT_DETERMINE"
    if score >= 55:
        return "HIGH"
    if score >= 28:
        return "MEDIUM"
    return "LOW"


def _jd_match(payload: dict[str, Any], stack: dict[str, Any], code_depth: str, category: str, structure: dict[str, Any]) -> dict[str, Any]:
    required = [_safe_str(skill).strip() for skill in _to_list(payload.get("jd_required_skills")) if _safe_str(skill).strip()]
    preferred = [_safe_str(skill).strip() for skill in _to_list(payload.get("jd_preferred_skills")) if _safe_str(skill).strip()]
    role = _safe_str(payload.get("jd_role_category"))
    seniority = _safe_str(payload.get("jd_seniority")).lower()
    if not required and not preferred and not role:
        return {
            "jd_match_score": 0,
            "stack_coverage": {"matched_required": [INSUFFICIENT_DATA], "missing_required": [INSUFFICIENT_DATA]},
            "bonus_skills_found": [INSUFFICIENT_DATA],
            "complexity_alignment": INSUFFICIENT_DATA,
            "domain_relevance": INSUFFICIENT_DATA,
            "jd_match_breakdown": {"stack": 0, "complexity": 0, "domain": 0, "production": 0},
        }

    verified = _lower_set(stack.get("confirmed_used_stack", []))
    confirmed = verified | _lower_set(stack.get("confirmed_only_stack", []))
    claimed = confirmed | _lower_set(stack.get("claimed_only", []))
    matched_required: list[str] = []
    missing_required: list[str] = []
    stack_points = 0.0
    for skill in required:
        key = skill.lower()
        if key in verified:
            matched_required.append(skill)
            stack_points += 100 / max(len(required), 1)
        elif key in confirmed:
            matched_required.append(skill)
            stack_points += 70 / max(len(required), 1)
        elif key in claimed:
            matched_required.append(skill)
            stack_points += 30 / max(len(required), 1)
        else:
            missing_required.append(skill)

    bonus_found = [skill for skill in preferred if skill.lower() in claimed]
    stack_dimension = min(40, round(stack_points * 0.4 + min(len(bonus_found) * 5, 20) * 0.4))

    complexity_dimension = 15
    alignment = "ALIGNED"
    if seniority == "entry":
        complexity_dimension = 30 if code_depth in {"LOW", "MEDIUM"} else 28
    elif seniority == "mid":
        if code_depth == "MEDIUM":
            complexity_dimension = 30
        elif code_depth == "HIGH":
            complexity_dimension = 33
            alignment = "OVERQUALIFIED"
        else:
            complexity_dimension = 15
            alignment = "UNDERQUALIFIED"
    elif seniority in {"senior", "staff"}:
        if code_depth == "HIGH":
            complexity_dimension = 30
        elif code_depth == "MEDIUM":
            complexity_dimension = 18
            alignment = "UNDERQUALIFIED"
        else:
            complexity_dimension = 8
            alignment = "UNDERQUALIFIED"
    else:
        complexity_dimension = 20 if code_depth == "MEDIUM" else 26 if code_depth == "HIGH" else 12

    role_lower = role.lower()
    if "backend" in role_lower and category == "Backend":
        domain_dimension = 20
        domain_relevance = "HIGH"
    elif "backend" in role_lower and category == "Full Stack":
        domain_dimension = 15
        domain_relevance = "MEDIUM"
    elif "ml" in role_lower or "ai" in role_lower:
        domain_dimension = 20 if category == "ML-AI" else 8
        domain_relevance = "HIGH" if category == "ML-AI" else "LOW"
    elif "devops" in role_lower or "infra" in role_lower:
        domain_dimension = 20 if category == "DevOps" else 8
        domain_relevance = "HIGH" if category == "DevOps" else "LOW"
    else:
        domain_dimension = 14 if category not in {INSUFFICIENT_DATA} else 0
        domain_relevance = "MEDIUM" if domain_dimension else INSUFFICIENT_DATA

    production_dimension = 0
    if structure.get("has_tests") == "YES":
        production_dimension += 4
    elif structure.get("has_tests") == "PARTIAL":
        production_dimension += 2
    if structure.get("has_ci_cd") == "YES":
        production_dimension += 3
    if structure.get("has_docs") == "YES":
        production_dimension += 3

    jd_score = max(0, min(100, stack_dimension + complexity_dimension + domain_dimension + production_dimension))
    return {
        "jd_match_score": jd_score,
        "stack_coverage": {
            "matched_required": matched_required or ([] if required else [INSUFFICIENT_DATA]),
            "missing_required": missing_required or ([] if required else [INSUFFICIENT_DATA]),
        },
        "bonus_skills_found": bonus_found or ([] if preferred else [INSUFFICIENT_DATA]),
        "complexity_alignment": alignment if seniority else INSUFFICIENT_DATA,
        "domain_relevance": domain_relevance,
        "jd_match_breakdown": {
            "stack": stack_dimension,
            "complexity": complexity_dimension,
            "domain": domain_dimension,
            "production": production_dimension,
        },
    }


def _compile_flags(
    payload: dict[str, Any],
    execution: dict[str, Any],
    usage: dict[str, Any],
    dep_validation: dict[str, Any],
    structure: dict[str, Any],
    readme: dict[str, Any],
    commit_analysis: dict[str, Any],
    trajectory: dict[str, Any],
    originality: dict[str, Any],
) -> tuple[list[dict[str, str]], dict[str, int]]:
    flags: list[dict[str, str]] = []

    def add(severity: str, flag: str, evidence: str, step: str) -> None:
        flags.append({"severity": severity, "flag": flag, "evidence": evidence, "step_source": step})

    if any("Syntax error" in item for item in execution.get("execution_flags", [])):
        add("CRITICAL", "Project failed execution due to syntax errors.", "Execution logs reported a syntax error.", "Step 0")
    if execution.get("execution_status") == "NOT_ATTEMPTED":
        add("MINOR", "Execution was not attempted.", "No runtime verification data was provided.", "Step 0")
    if execution.get("execution_status") == "PARTIAL":
        add("MODERATE", "Project only partially executed.", execution.get("execution_impact", ""), "Step 0")

    for flag in usage.get("usage_flags", []):
        severity = "CRITICAL" if "ML library" in flag else "MODERATE"
        add(severity, flag, flag, "Step 3")
    if usage.get("actual_usage_score") == "LOW":
        add("MODERATE", "Dependency usage coverage is low.", f"Only {usage.get('usage_verified_count')} major dependencies were verified in code.", "Step 3")

    if dep_validation.get("dependency_verdict") == "INCONSISTENT":
        add("MODERATE", "Dependency set is inconsistent with the claimed project type.", "; ".join(dep_validation.get("missing_critical_deps", [])), "Step 4")

    if structure.get("structure_quality") in {"FLAT", "WEAK"}:
        add("MODERATE", "Repository structure is weak or flat.", "; ".join(structure.get("structure_flags", [])), "Step 5")
    if structure.get("has_tests") == "NO":
        add("MODERATE", "No tests were found.", "Testing evidence is absent.", "Step 5")
    if structure.get("has_docs") == "NO":
        add("MINOR", "Documentation is sparse beyond code.", "No README depth or docs folder evidence was found.", "Step 5")

    if readme.get("readme_verdict") == "MISSING":
        add("MINOR", "No README provided.", "Documentation is missing.", "Step 6")
    if readme.get("readme_verdict") == "TEMPLATE":
        add("MODERATE", "README appears template-like.", f"Template score was {readme.get('template_score')}/10.", "Step 6")
    if readme.get("readme_verdict") == "OVERCLAIMING":
        for instance in readme.get("overclaim_instances", []):
            add("CRITICAL", f"README overclaim: {instance.get('claim')}", instance.get("evidence_against", ""), "Step 6")

    if commit_analysis.get("commit_quality") == "SUSPICIOUS":
        add("CRITICAL", "Commit history appears suspicious.", "; ".join(commit_analysis.get("commit_flags", [])), "Step 7")
    elif commit_analysis.get("commit_quality") == "WEAK":
        add("MODERATE", "Commit history is weak.", "; ".join(commit_analysis.get("commit_flags", [])), "Step 7")

    if trajectory.get("development_maturity") == "RUSHED":
        add("MODERATE", "Development trajectory looks rushed.", "; ".join(trajectory.get("trajectory_flags", [])), "Step 8")
    if trajectory.get("trajectory_confidence") == "LOW":
        add("MINOR", "Trajectory confidence is low.", "Commit progression data was sparse.", "Step 8")

    if originality.get("originality_verdict") == "LIKELY_FORKED":
        add("CRITICAL", "Repository appears to be a fork presented as original work.", "; ".join(originality.get("originality_evidence", [])), "Step 9")
    elif originality.get("originality_verdict") == "LIKELY_TUTORIAL":
        add("MODERATE", "Repository appears tutorial-derived.", "; ".join(originality.get("originality_evidence", [])), "Step 9")
    elif originality.get("originality_verdict") == "AMBIGUOUS":
        add("MINOR", "Project originality could not be confirmed.", "; ".join(originality.get("originality_evidence", [])), "Step 9")

    counts = {
        "critical": sum(1 for flag in flags if flag["severity"] == "CRITICAL"),
        "moderate": sum(1 for flag in flags if flag["severity"] == "MODERATE"),
        "minor": sum(1 for flag in flags if flag["severity"] == "MINOR"),
    }
    return flags or [{"severity": "MINOR", "flag": "No major issues detected.", "evidence": "Analysis completed without disqualifying evidence.", "step_source": "Step 11"}], counts


def _score_authenticity(code_depth: str, commit_quality: str, readme_verdict: str, structure_quality: str, originality_verdict: str, dep_verdict: str, usage_score: str, trajectory: str, execution_bonus: int) -> int:
    code_score = {"LOW": 20, "MEDIUM": 55, "HIGH": 85, "CANNOT_DETERMINE": 35}.get(code_depth, 35)
    commit_score = {"SUSPICIOUS": 5, "WEAK": 30, "ADEQUATE": 60, "STRONG": 90}.get(commit_quality, 30)
    readme_score = {"TEMPLATE": 10, "OVERCLAIMING": 20, "PARTIALLY_ACCURATE": 60, "ACCURATE": 90, "MISSING": 25}.get(readme_verdict, 25)
    structure_score = {"EMPTY": 5, "FLAT": 20, "WEAK": 35, "ADEQUATE": 60, "STRONG": 85}.get(structure_quality, 35)
    originality_score = {"LIKELY_FORKED": 10, "LIKELY_TUTORIAL": 35, "AMBIGUOUS": 55, "LIKELY_ORIGINAL": 90}.get(originality_verdict, 55)
    dep_score = {"INCONSISTENT": 15, "PARTIAL": 50, "VALID": 85}.get(dep_verdict, 35)
    usage_numeric = {"LOW": 20, "MEDIUM": 55, "HIGH": 85, "NOT_VERIFIED": 40}.get(usage_score, 40)
    trajectory_score = {"RUSHED": 20, "PATCHY": 45, "ORGANIC": 85, "INSUFFICIENT_DATA": 50}.get(trajectory, 50)

    weighted = (
        code_score * 0.20
        + commit_score * 0.18
        + originality_score * 0.15
        + readme_score * 0.13
        + structure_score * 0.12
        + dep_score * 0.09
        + usage_numeric * 0.08
        + trajectory_score * 0.05
    )
    return max(0, min(100, round(weighted + execution_bonus)))


def _production_readiness(structure: dict[str, Any], files: list[str]) -> int:
    score = 0
    score += 30 if structure.get("has_tests") == "YES" else 15 if structure.get("has_tests") == "PARTIAL" else 0
    score += 25 if structure.get("has_ci_cd") == "YES" else 0
    score += 20 if structure.get("has_docs") == "YES" else 10 if structure.get("has_docs") == "PARTIAL" else 0
    deployment_evidence = any(token in path.lower() for path in files for token in ("dockerfile", "docker-compose", "render.yaml", "vercel.json", "terraform", "k8s", ".github/workflows"))
    score += 25 if deployment_evidence else 0
    return min(100, score)


def _score_band(score: int) -> str:
    if score >= 85:
        return "EXCEPTIONAL"
    if score >= 70:
        return "STRONG"
    if score >= 55:
        return "ADEQUATE"
    if score >= 40:
        return "WEAK"
    if score >= 25:
        return "POOR"
    return "REJECT"


def _estimated_dev_hours(code_depth: str, commit_count: int, structure_quality: str) -> str:
    base = {"LOW": 18, "MEDIUM": 55, "HIGH": 110, "CANNOT_DETERMINE": 30}.get(code_depth, 30)
    if structure_quality == "STRONG":
        base += 15
    if commit_count >= 20:
        base += 20
    if commit_count >= 50:
        base += 25
    return f"{max(8, base)} hours"


def _llm_reasoning(payload: dict[str, Any], category: str, code_depth: str, stack: dict[str, Any], flags: list[dict[str, str]], score_band: str) -> dict[str, Any]:
    sample_files = [file for file in _to_list(payload.get("sample_code_files")) if isinstance(file, dict)]
    architecture = "CANNOT_ASSESS"
    edge_flags: list[str] = []

    if sample_files:
        content_blob = " ".join(_safe_str(file.get("content")) for file in sample_files[:3]).lower()
        if any(token in content_blob for token in ("router", "service", "middleware", "schema", "class ", "def ")):
            architecture = "STRONG" if code_depth == "HIGH" else "ADEQUATE"
        else:
            architecture = "WEAK"

    if category == "ML-AI" and code_depth == "LOW":
        edge_flags.append("The repository looks closer to an exploratory notebook than a production ML system.")
    if category == "Backend" and "OpenAI API" in stack.get("claimed_only", []):
        edge_flags.append("The README suggests AI integration, but the implementation evidence is missing.")
    if any(flag["severity"] == "CRITICAL" for flag in flags) and score_band in {"STRONG", "EXCEPTIONAL"}:
        edge_flags.append("Numeric strength is offset by authenticity concerns that should be manually verified.")

    seniority = _safe_str(payload.get("jd_seniority")).lower()
    if not seniority:
        seniority_note = "Seniority alignment could not be fully assessed because the JD seniority field was missing."
    elif seniority in {"senior", "staff"} and code_depth != "HIGH":
        seniority_note = "For a senior-level role, the project does not yet show enough implementation depth or production evidence."
    elif seniority == "entry":
        seniority_note = "For an entry-level role, this project is directionally appropriate if the candidate can explain the implementation choices clearly."
    else:
        seniority_note = "The project depth is broadly aligned with the stated seniority target."

    actions = []
    if not _safe_str(payload.get("execution_status")) or _safe_str(payload.get("execution_status")).upper() == "NOT_ATTEMPTED":
        actions.append("Add a reproducible run path with build or startup proof so the project can be execution-verified.")
    if not _to_list(payload.get("test_files")):
        actions.append("Add focused tests for the most important flows to improve production readiness and recruiter trust.")
    if stack.get("claimed_only"):
        actions.append("Remove unsupported README claims or add the missing code usage so the documented stack matches reality.")
    if len(actions) < 3:
        actions.append("Document architectural decisions and setup trade-offs in the README to make originality and intent easier to verify.")

    return {
        "architecture_judgment": architecture,
        "seniority_alignment_note": seniority_note,
        "llm_edge_flags": edge_flags or [INSUFFICIENT_DATA],
        "improvement_actions": actions[:3],
    }


def _recruiter_summary(repo_name: str, category: str, practical_score: int, jd_match_score: int, flags: dict[str, int], execution_status: str) -> str:
    return (
        f"{repo_name} reads as a {category.lower()} repository with a practical score of {practical_score} and JD match of {jd_match_score}. "
        f"The strongest signal is verified implementation structure, while the main risk is {flags['critical']} critical and {flags['moderate']} moderate flags. "
        f"Execution status is {execution_status.lower()}, so interview progression should reflect that verification confidence."
    )


def _candidate_feedback(reasoning: dict[str, Any]) -> str:
    actions = reasoning.get("improvement_actions") or []
    if not actions:
        return INSUFFICIENT_DATA
    return " ".join(actions[:2])


def _hiring_signal(practical_score: int, critical_flags: int, jd_match_score: int, execution_status: str, commit_quality: str, code_depth: str) -> str:
    if practical_score >= 78 and critical_flags == 0 and jd_match_score >= 65 and execution_status != "FAILED":
        return "STRONG HIRE"
    if 58 <= practical_score <= 77 and critical_flags <= 1 and jd_match_score >= 45:
        return "CONSIDER"
    if practical_score < 35 or critical_flags >= 3 or (execution_status == "FAILED" and commit_quality == "SUSPICIOUS"):
        return "REJECT"
    if practical_score <= 57 or critical_flags >= 2 or jd_match_score < 40 or (commit_quality == "SUSPICIOUS" and code_depth == "LOW"):
        return "RISKY"
    return "CONSIDER"


def analyze_repository(payload: dict[str, Any]) -> dict[str, Any]:
    files = _flatten_file_tree(payload.get("file_tree"))
    dependencies = _extract_dependencies(payload)
    import_scan = _collect_imports(payload)
    category, domain = _determine_domain(payload, dependencies, files)
    stack = _extract_stack(payload, dependencies, import_scan)
    execution = _check_execution(payload)
    usage = _usage_verification(payload, dependencies, import_scan, stack)
    dep_validation = _dependency_validation(payload, dependencies, category, stack)
    structure = _structure_analysis(payload, category)
    readme = _readme_analysis(payload, stack, category)
    commit_analysis = _commit_analysis(payload)
    trajectory = _trajectory_analysis(payload, commit_analysis)
    originality = _originality_analysis(payload, commit_analysis)
    code_depth = _derive_code_depth(payload, structure, usage, execution)
    claimed_vs_actual = "MATCH"
    mismatch_details = []
    if readme.get("readme_verdict") == "OVERCLAIMING":
        claimed_vs_actual = "MISMATCH"
        mismatch_details = [item.get("claim") for item in readme.get("overclaim_instances", [])]
    elif readme.get("readme_verdict") in {"TEMPLATE", "PARTIALLY_ACCURATE"}:
        claimed_vs_actual = "PARTIAL_MATCH"

    jd = _jd_match(payload, stack, code_depth, category, structure)
    red_flags, flag_summary = _compile_flags(payload, execution, usage, dep_validation, structure, readme, commit_analysis, trajectory, originality)

    authenticity_subscore = _score_authenticity(
        code_depth=code_depth,
        commit_quality=commit_analysis.get("commit_quality", "WEAK"),
        readme_verdict=readme.get("readme_verdict", "MISSING"),
        structure_quality=structure.get("structure_quality", "WEAK"),
        originality_verdict=originality.get("originality_verdict", "AMBIGUOUS"),
        dep_verdict=dep_validation.get("dependency_verdict", "PARTIAL"),
        usage_score=usage.get("actual_usage_score", "NOT_VERIFIED"),
        trajectory=trajectory.get("development_maturity", "INSUFFICIENT_DATA"),
        execution_bonus=execution.get("execution_bonus", 0),
    )
    production_score = _production_readiness(structure, files)
    penalties = flag_summary["critical"] * 8 + flag_summary["moderate"] * 3 + flag_summary["minor"] * 1
    composite = authenticity_subscore * 0.45 + jd["jd_match_score"] * 0.35 + production_score * 0.20
    practical_score = max(5, round(composite - penalties))
    band = _score_band(practical_score)
    reasoning = _llm_reasoning(payload, category, code_depth, stack, red_flags, band)
    hiring_signal = _hiring_signal(
        practical_score=practical_score,
        critical_flags=flag_summary["critical"],
        jd_match_score=jd["jd_match_score"],
        execution_status=execution["execution_status"],
        commit_quality=commit_analysis["commit_quality"],
        code_depth=code_depth,
    )

    repo_name = _safe_str(payload.get("repo_name")) or INSUFFICIENT_DATA
    project_summary = (
        f"{repo_name} appears to be a {category.lower()} project with verified stack evidence in "
        f"{', '.join(stack.get('confirmed_used_stack', [])[:4]) or 'limited areas'}."
        if category != INSUFFICIENT_DATA
        else INSUFFICIENT_DATA
    )

    return {
        "project_card": {
            "repo_name": repo_name,
            "github_url": _safe_str(payload.get("github_url")) or INSUFFICIENT_DATA,
            "description": project_summary,
            "category": category,
            "domain": domain,
            "claimed_vs_actual": claimed_vs_actual,
        },
        "tech_analysis": {
            "confirmed_used_stack": stack["confirmed_used_stack"],
            "confirmed_only_stack": stack["confirmed_only_stack"],
            "claimed_only": stack["claimed_only"],
            "stack_completeness": stack["stack_completeness"],
            "actual_usage_score": usage["actual_usage_score"],
            "unused_dependencies": usage["unused_deps"],
        },
        "execution": {
            "execution_status": execution["execution_status"],
            "endpoint_verified": execution["endpoint_verified"],
            "execution_flags": execution["execution_flags"],
        },
        "authenticity": {
            "authenticity_score": authenticity_subscore,
            "authenticity_label": _score_band(authenticity_subscore),
            "code_depth": code_depth,
            "commit_quality": commit_analysis["commit_quality"],
            "readme_verdict": readme["readme_verdict"],
            "originality_verdict": originality["originality_verdict"],
            "structure_quality": structure["structure_quality"],
            "development_maturity": trajectory["development_maturity"],
            "has_tests": structure["has_tests"],
            "has_ci_cd": structure["has_ci_cd"],
            "estimated_dev_hours": _estimated_dev_hours(code_depth, int(payload.get("commit_count") or 0), structure["structure_quality"]),
            "trajectory_flags": trajectory["trajectory_flags"],
        },
        "red_flags": red_flags,
        "flag_summary": flag_summary,
        "jd_match": jd,
        "scoring": {
            "authenticity_subscore": authenticity_subscore,
            "jd_match_subscore": jd["jd_match_score"],
            "production_readiness_score": production_score,
            "penalty_points": penalties,
            "practical_score": practical_score,
            "score_band": band,
        },
        "llm_reasoning": reasoning,
        "hiring_signal": hiring_signal,
        "recruiter_summary": _recruiter_summary(repo_name, category, practical_score, jd["jd_match_score"], flag_summary, execution["execution_status"]),
        "candidate_feedback": _candidate_feedback(reasoning),
    }


def analyze_candidate(payload: dict[str, Any]) -> dict[str, Any]:
    repos = [repo for repo in _to_list(payload.get("candidate_repos")) if isinstance(repo, dict)]
    analyses = [analyze_repository(repo) for repo in repos]
    if not analyses:
        return {
            "candidate_profile": {
                "candidate_name": _safe_str(payload.get("candidate_name")) or INSUFFICIENT_DATA,
                "repos_analyzed": 0,
                "candidate_score": 0,
                "candidate_band": INSUFFICIENT_DATA,
                "best_project": INSUFFICIENT_DATA,
                "confirmed_skills_union": [INSUFFICIENT_DATA],
                "skill_diversity": INSUFFICIENT_DATA,
                "development_growth": INSUFFICIENT_DATA,
                "per_repo_scores": [],
                "candidate_hiring_signal": "REJECT",
                "candidate_summary": "No repository payloads were provided for candidate-level analysis.",
            }
        }

    repo_scores = [analysis["scoring"]["practical_score"] for analysis in analyses]
    best_idx = max(range(len(repo_scores)), key=lambda idx: repo_scores[idx])
    best_score = repo_scores[best_idx]
    avg_score = mean(repo_scores)
    consistency_score = max(0, 100 - min(100, pstdev(repo_scores) * 3)) if len(repo_scores) > 1 else 100
    unique_domains = {analysis["project_card"]["category"] for analysis in analyses if analysis["project_card"]["category"] != INSUFFICIENT_DATA}
    skill_union = sorted({
        skill
        for analysis in analyses
        for skill in analysis["tech_analysis"]["confirmed_used_stack"]
        if skill != INSUFFICIENT_DATA
    })
    diversity_score = min(100, len(unique_domains) * 20)
    candidate_score = round(best_score * 0.45 + avg_score * 0.25 + consistency_score * 0.20 + diversity_score * 0.10)
    band = _score_band(candidate_score)

    growth = INSUFFICIENT_DATA
    dated = []
    for repo, analysis in zip(repos, analyses):
        created_at = _safe_str(repo.get("created_at"))
        try:
            dated.append((datetime.fromisoformat(created_at.replace("Z", "+00:00")), analysis["scoring"]["practical_score"]))
        except Exception:
            pass
    if len(dated) >= 2:
        dated.sort(key=lambda item: item[0])
        if dated[-1][1] > dated[0][1]:
            growth = "POSITIVE"
        elif dated[-1][1] < dated[0][1]:
            growth = "DECLINING"
        else:
            growth = "STABLE"

    critical_total = sum(analysis["flag_summary"]["critical"] for analysis in analyses)
    if candidate_score >= 78 and critical_total == 0:
        hiring_signal = "STRONG HIRE"
    elif candidate_score >= 58 and critical_total <= 1:
        hiring_signal = "CONSIDER"
    elif candidate_score < 35 or critical_total >= 3:
        hiring_signal = "REJECT"
    else:
        hiring_signal = "RISKY"

    return {
        "candidate_profile": {
            "candidate_name": _safe_str(payload.get("candidate_name")) or INSUFFICIENT_DATA,
            "repos_analyzed": len(analyses),
            "candidate_score": candidate_score,
            "candidate_band": band,
            "best_project": analyses[best_idx]["project_card"]["repo_name"],
            "confirmed_skills_union": skill_union or [INSUFFICIENT_DATA],
            "skill_diversity": f"{len(unique_domains)} verified domain(s)",
            "development_growth": growth,
            "per_repo_scores": [
                {
                    "repo_name": analysis["project_card"]["repo_name"],
                    "practical_score": analysis["scoring"]["practical_score"],
                    "hiring_signal": analysis["hiring_signal"],
                }
                for analysis in analyses
            ],
            "candidate_hiring_signal": hiring_signal,
            "candidate_summary": (
                f"Best project scored {best_score}, portfolio average is {round(avg_score)}, and skill diversity spans {len(unique_domains)} verified domain(s). "
                f"Candidate-level recommendation is {hiring_signal.lower()} based on consistency, best-work quality, and cross-project breadth."
            ),
        }
    }


def analyze_github_project_payload(payload: dict[str, Any]) -> dict[str, Any]:
    repos = [repo for repo in _to_list(payload.get("candidate_repos")) if isinstance(repo, dict)]
    if len(repos) >= 2:
        return analyze_candidate(payload)
    return analyze_repository(payload)
