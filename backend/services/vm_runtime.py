from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import shutil
import tarfile
from dataclasses import dataclass
from pathlib import Path
from queue import Queue
from time import perf_counter
from typing import Any

import docker
from docker.errors import DockerException, NotFound

from config import settings


logger = logging.getLogger(__name__)


class VMInfrastructureError(RuntimeError):
    status_code = 503


class VMResourceError(RuntimeError):
    status_code = 507


BANNED_MODULES = {
    "os", "sys", "subprocess", "socket", "urllib", "requests", "http", "ftplib",
    "smtplib", "importlib", "ctypes", "cffi", "multiprocessing", "threading",
    "concurrent", "shutil", "pathlib",
}

BANNED_PATTERNS = [
    r"__import__\s*\(",
    r"eval\s*\(",
    r"exec\s*\(",
    r"open\s*\(['\"]\/",
    r"os\.system",
    r"os\.popen",
    r"subprocess\.",
    r"socket\.",
    r"importlib\.",
    r"compile\s*\(",
    r"globals\s*\(\s*\)",
    r"locals\s*\(\s*\)",
    r"getattr\s*\(.*__",
    r"setattr\s*\(",
    r"delattr\s*\(",
]


def _docker_client():
    try:
        return docker.from_env()
    except DockerException as exc:
        raise VMInfrastructureError("Docker daemon not running") from exc


def security_scan(code: str) -> tuple[bool, str]:
    import ast
    import re

    for pattern in BANNED_PATTERNS:
        if re.search(pattern, code):
            return False, f"Rejected: banned pattern `{pattern}` detected"

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return False, "Rejected: syntax error in submitted code"

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [alias.name.split(".")[0] for alias in node.names]
            for name in names:
                if name in BANNED_MODULES:
                    return False, f"Rejected: import of banned module `{name}`"

    return True, "OK"


def _tar_directory(src: Path) -> bytes:
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w") as tar:
        for path in src.rglob("*"):
            arcname = path.relative_to(src)
            tar.add(path, arcname=str(arcname))
    stream.seek(0)
    return stream.read()


def _tar_single_file(filename: str, content: str) -> bytes:
    stream = io.BytesIO()
    raw = content.encode("utf-8")
    info = tarfile.TarInfo(name=filename)
    info.size = len(raw)
    with tarfile.open(fileobj=stream, mode="w") as tar:
        tar.addfile(info, io.BytesIO(raw))
    stream.seek(0)
    return stream.read()


@dataclass
class ContainerAssignment:
    container_id: str
    container_name: str
    vm_url: str


class ContainerPool:
    def __init__(self, size: int):
        self.size = size
        self.available: Queue[Any] = Queue()
        self.in_use: dict[str, str] = {}
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = _docker_client()
        return self._client

    def warm_up(self) -> None:
        for i in range(self.size):
            try:
                container = self.client.containers.run(
                    settings.VM_IMAGE_NAME,
                    name=f"vm_pool_{i}",
                    command="sleep infinity",
                    detach=True,
                    network_disabled=True,
                    user="nobody",
                    mem_limit="512m",
                    nano_cpus=500_000_000,
                    privileged=False,
                    security_opt=["no-new-privileges:true"],
                    cap_drop=["ALL"],
                    read_only=True,
                    tmpfs={"/workspace": "rw,noexec,nosuid,size=50m"},
                    working_dir="/workspace",
                )
                self.available.put(container.id)
            except DockerException as exc:
                logger.warning("Container pool warm-up failed: %s", exc)
                break

    def acquire(self, session_id: str) -> Any:
        try:
            container_id = self.available.get_nowait()
            container = self.client.containers.get(container_id)
        except Exception:
            try:
                container = self.client.containers.run(
                    settings.VM_IMAGE_NAME,
                    command="sleep infinity",
                    detach=True,
                    network_disabled=True,
                    user="nobody",
                    mem_limit="512m",
                    nano_cpus=500_000_000,
                    privileged=False,
                    security_opt=["no-new-privileges:true"],
                    cap_drop=["ALL"],
                    read_only=True,
                    tmpfs={"/workspace": "rw,noexec,nosuid,size=50m"},
                    working_dir="/workspace",
                )
            except DockerException as exc:
                if "out of memory" in str(exc).lower():
                    raise VMResourceError("Insufficient server resources. Try again in a moment.") from exc
                raise VMInfrastructureError(f"Docker error: {exc}") from exc

        try:
            container.reload()
            container.rename(f"vm_{session_id}")
        except DockerException:
            pass
        self.in_use[session_id] = container.id
        return container

    def release(self, session_id: str, destroy: bool = False) -> None:
        container_id = self.in_use.pop(session_id, None)
        if not container_id:
            return
        try:
            container = self.client.containers.get(container_id)
            try:
                container.exec_run("sh -lc 'rm -rf /workspace/* /workspace/.[!.]* /workspace/..?* 2>/dev/null || true'")
            except DockerException:
                pass
            if destroy:
                container.stop(timeout=5)
                container.remove(force=True)
                return
            self.available.put(container.id)
        except NotFound:
            return
        except DockerException as exc:
            logger.warning("Failed to release container %s: %s", container_id, exc)


container_pool = ContainerPool(size=settings.VM_POOL_SIZE)


def ensure_workspace(session_id: str) -> Path:
    path = Path(settings.WORKSPACE_BASE_PATH) / session_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def cleanup_workspace(session_id: str) -> None:
    shutil.rmtree(Path(settings.WORKSPACE_BASE_PATH) / session_id, ignore_errors=True)


async def seed_workspace(container: Any, session_id: str, project: Any) -> str:
    workspace = ensure_workspace(session_id)
    codebase_path = getattr(project, "codebase_path", None)
    repo_url = getattr(project, "repo_url", None)
    if codebase_path and Path(codebase_path).exists():
        source = Path(codebase_path)
        if source.is_dir():
            data = _tar_directory(source)
        else:
            target_dir = workspace / "project"
            target_dir.mkdir(exist_ok=True)
            shutil.copy2(source, target_dir / source.name)
            data = _tar_directory(workspace)
        container.put_archive("/workspace", data)
    elif repo_url:
        starter = f"# Repository reference:\n# {repo_url}\n"
        container.put_archive("/workspace", _tar_single_file("project/README_REPO_URL.txt", starter))

    starter_code = getattr(project, "starter_code", None) or (
        "# Write your solution here\n\n"
        "def main():\n"
        "    pass\n\n"
        "if __name__ == '__main__':\n"
        "    main()\n"
    )
    container.put_archive("/workspace", _tar_single_file("main.py", starter_code))
    container.exec_run("sh -lc 'mkdir -p /workspace/.run_history /workspace/project'")
    reqs = "/workspace/requirements.txt"
    if container.exec_run(f"sh -lc 'test -f {reqs}'").exit_code == 0:
        await asyncio.to_thread(container.exec_run, "pip install -r requirements.txt --quiet", workdir="/workspace")
    return str(workspace)


async def write_main_file(container: Any, code: str) -> None:
    encoded = base64.b64encode(code.encode("utf-8")).decode("utf-8")
    command = f"sh -lc \"printf '%s' '{encoded}' | base64 -d > /workspace/main.py\""
    await asyncio.to_thread(container.exec_run, command, workdir="/workspace")


async def exec_code(container: Any, language: str) -> dict[str, Any]:
    language_command = {
        "python": "python /workspace/main.py",
        "javascript": "node /workspace/main.py",
        "java": "sh -lc 'javac /workspace/main.py && java -cp /workspace main'",
        "cpp": "sh -lc 'g++ /workspace/main.py -o /workspace/a.out && /workspace/a.out'",
    }.get(language, "python /workspace/main.py")
    start = perf_counter()
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(container.exec_run, language_command, workdir="/workspace", demux=True),
            timeout=10,
        )
        stdout, stderr = result.output if hasattr(result, "output") else result
        exit_code = result.exit_code if hasattr(result, "exit_code") else 0
        duration_ms = int((perf_counter() - start) * 1000)
        return {
            "stdout": (stdout or b"").decode("utf-8", errors="replace"),
            "stderr": (stderr or b"").decode("utf-8", errors="replace"),
            "exit_code": int(exit_code),
            "execution_time_ms": duration_ms,
        }
    except asyncio.TimeoutError:
        return {
            "stdout": "",
            "stderr": "Execution timed out after 10 seconds.",
            "exit_code": 124,
            "execution_time_ms": int((perf_counter() - start) * 1000),
        }

