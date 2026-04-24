import asyncio
import logging
import os
import shutil
import tempfile
import time
from typing import Any

import docker

logger = logging.getLogger(__name__)

DOCKER_IMAGES = {
    "python": "python:3.11-alpine",
    "javascript": "node:20-alpine",
    "java": "openjdk:17-alpine",
    "cpp": "gcc:13",
}

FILE_NAMES = {
    "python": "solution.py",
    "javascript": "solution.js",
    "java": "Main.java",
    "cpp": "code.cpp",
}

LANGUAGE_ALIASES = {
    "js": "javascript",
    "node": "javascript",
    "py": "python",
    "python3": "python",
    "c++": "cpp",
    "c": "cpp",
}

TIMEOUT_SECONDS = 10
MEMORY_LIMIT = "128m"
NANO_CPUS = 500_000_000
PID_LIMIT = 64
MAX_OUTPUT_CHARS = 10_000


def normalize_language(language: str) -> str:
    lowered = (language or "").strip().lower()
    return LANGUAGE_ALIASES.get(lowered, lowered)


def _build_command(language: str, has_stdin: bool) -> list[str]:
    stdin_suffix = " < /workspace/stdin.txt" if has_stdin else ""
    commands = {
        "python": ["sh", "-c", f"python /workspace/solution.py{stdin_suffix}"],
        "javascript": ["sh", "-c", f"node /workspace/solution.js{stdin_suffix}"],
        "java": ["sh", "-c", f"cd /workspace && javac Main.java 2>&1 && java Main{stdin_suffix}"],
        "cpp": ["sh", "-c", f"cd /workspace && g++ -O2 -o out code.cpp 2>&1 && ./out{stdin_suffix}"],
    }
    return commands[language]


def _truncate_output(value: str) -> str:
    if len(value) <= MAX_OUTPUT_CHARS:
        return value
    return value[:MAX_OUTPUT_CHARS] + "\n...[output truncated]"


def run_code_sync(language: str, code: str, stdin: str = "") -> dict[str, Any]:
    start = time.time()
    normalized = normalize_language(language)
    if normalized not in DOCKER_IMAGES:
        return {
            "stdout": "",
            "stderr": f"Unsupported language: {language}",
            "exitCode": 1,
            "timedOut": False,
            "executionTimeMs": 0,
        }

    temp_dir = tempfile.mkdtemp(prefix="assessment_exec_")
    client = None
    container = None

    try:
        source_path = os.path.join(temp_dir, FILE_NAMES[normalized])
        with open(source_path, "w", encoding="utf-8") as handle:
            handle.write(code or "")
        if stdin:
            with open(os.path.join(temp_dir, "stdin.txt"), "w", encoding="utf-8") as handle:
                handle.write(stdin)

        client = docker.from_env()
        image_name = DOCKER_IMAGES[normalized]
        try:
            client.images.get(image_name)
        except docker.errors.ImageNotFound:
            logger.info("Pulling execution image %s", image_name)
            client.images.pull(image_name)

        container = client.containers.run(
            image=image_name,
            command=_build_command(normalized, bool(stdin)),
            detach=True,
            stdout=True,
            stderr=True,
            remove=False,
            network_disabled=True,
            mem_limit=MEMORY_LIMIT,
            nano_cpus=NANO_CPUS,
            pids_limit=PID_LIMIT,
            working_dir="/workspace",
            volumes={
                temp_dir: {
                    "bind": "/workspace",
                    "mode": "rw",
                }
            },
        )

        timed_out = False
        try:
            result = container.wait(timeout=TIMEOUT_SECONDS)
            exit_code = int(result.get("StatusCode", 1))
        except Exception:
            timed_out = True
            exit_code = 124
            try:
                container.kill()
            except Exception:
                logger.exception("Failed to kill timed-out container")

        stdout_bytes = container.logs(stdout=True, stderr=False) or b""
        stderr_bytes = container.logs(stdout=False, stderr=True) or b""
        stdout = _truncate_output(stdout_bytes.decode("utf-8", errors="replace").strip())
        stderr = _truncate_output(stderr_bytes.decode("utf-8", errors="replace").strip())
        elapsed_ms = int((time.time() - start) * 1000)

        if timed_out:
            stderr = f"{stderr}\nTime limit exceeded ({TIMEOUT_SECONDS}s).".strip()

        return {
            "stdout": stdout,
            "stderr": stderr,
            "exitCode": exit_code,
            "timedOut": timed_out,
            "executionTimeMs": elapsed_ms,
        }
    except docker.errors.DockerException as exc:
        logger.exception("Docker execution failed")
        return {
            "stdout": "",
            "stderr": f"Execution environment unavailable: {exc}",
            "exitCode": 1,
            "timedOut": False,
            "executionTimeMs": 0,
        }
    except Exception as exc:
        logger.exception("Unexpected execution error")
        return {
            "stdout": "",
            "stderr": f"Internal execution error: {exc}",
            "exitCode": 1,
            "timedOut": False,
            "executionTimeMs": 0,
        }
    finally:
        if container is not None:
            try:
                container.remove(force=True)
            except Exception:
                logger.exception("Failed to remove container")
        if client is not None:
            try:
                client.close()
            except Exception:
                logger.exception("Failed to close docker client")
        shutil.rmtree(temp_dir, ignore_errors=True)


async def run_code(language: str, code: str, stdin: str = "") -> dict[str, Any]:
    return await asyncio.to_thread(run_code_sync, language, code, stdin or "")
