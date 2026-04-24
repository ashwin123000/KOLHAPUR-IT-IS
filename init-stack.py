import os
import socket
import subprocess
import sys
import time
from pathlib import Path

from pymongo import MongoClient
from pymongo.errors import OperationFailure, PyMongoError
from redis import Redis
from redis.exceptions import RedisError
from redisvl.index import SearchIndex


ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "KOLHAPUR-IT-IS-main" / "frontend"
PYTHON_REQUIREMENTS = ROOT / "requirements.txt"
NODE_HOME = ROOT / "tools" / "node-v20.11.1-win-x64"
NPM_CMD = NODE_HOME / "npm.cmd"

MONGO_URL = os.getenv(
    "MONGO_URL",
    os.getenv("MONGODB_URI", "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true"),
)
MONGO_INIT_URL = os.getenv("MONGO_INIT_URL", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", os.getenv("MONGODB_DB", "freelancer_db"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


def run_command(args: list[str], cwd: Path | None = None) -> None:
    print(f"[init-stack] Running: {' '.join(args)}")
    subprocess.run(args, cwd=str(cwd) if cwd else None, check=True)


def wait_for_port(host: str, port: int, timeout_seconds: int = 120) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f"[init-stack] {host}:{port} is reachable")
                return
        except OSError:
            time.sleep(2)
    raise TimeoutError(f"Timed out waiting for {host}:{port}")


def install_dependencies() -> None:
    run_command([sys.executable, "-m", "pip", "install", "-r", str(PYTHON_REQUIREMENTS)], cwd=ROOT)

    npm = str(NPM_CMD if NPM_CMD.exists() else "npm")
    run_command([npm, "install"], cwd=FRONTEND_DIR)


def init_mongo_replica_set() -> None:
    client = MongoClient(MONGO_INIT_URL, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        try:
            client.admin.command("replSetGetStatus")
            print("[init-stack] MongoDB replica set already initialized")
        except OperationFailure as exc:
            if exc.code not in {94, 76} and "not yet initialized" not in str(exc):
                raise
            print("[init-stack] Initializing MongoDB replica set rs0")
            client.admin.command(
                "replSetInitiate",
                {"_id": "rs0", "members": [{"_id": 0, "host": "localhost:27017"}]},
            )

        deadline = time.time() + 60
        while time.time() < deadline:
            hello = client.admin.command("hello")
            if hello.get("isWritablePrimary") or hello.get("secondary"):
                print("[init-stack] MongoDB replica set is ready")
                return
            time.sleep(2)
        raise TimeoutError("MongoDB replica set did not become ready in time")
    finally:
        client.close()


def init_redis_index() -> None:
    redis_client = Redis.from_url(REDIS_URL, decode_responses=False)
    try:
        redis_client.ping()
    except RedisError as exc:
        raise RuntimeError(f"Redis is not ready: {exc}") from exc

    schema = {
        "index": {
            "name": "job_index",
            "prefix": "job:",
            "storage_type": "hash",
        },
        "fields": [
            {"name": "job_id", "type": "tag"},
            {"name": "title", "type": "text"},
            {
                "name": "embedding",
                "type": "vector",
                "attrs": {
                    "algorithm": "flat",
                    "dims": 1536,
                    "distance_metric": "cosine",
                    "datatype": "float32",
                },
            },
        ],
    }

    try:
        index = SearchIndex.from_dict(schema, redis_url=REDIS_URL)
    except TypeError:
        from redisvl.schema import IndexSchema

        index = SearchIndex(schema=IndexSchema.from_dict(schema), redis_url=REDIS_URL)

    try:
        exists = index.exists()
    except AttributeError:
        exists = False

    if exists:
        print("[init-stack] Redis index job_index already exists")
        return

    try:
        index.create(overwrite=False)
    except TypeError:
        index.create()
    print("[init-stack] Redis index job_index is ready")


def verify_mongo_schema_collection() -> None:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    try:
        database = client[MONGO_DB_NAME]
        database.users.create_index("email", unique=True)
        database.users.create_index("aadhaar_lookup", unique=True, sparse=True)
        print(f"[init-stack] MongoDB database {MONGO_DB_NAME} verified")
    finally:
        client.close()


def main() -> None:
    install_dependencies()
    wait_for_port("localhost", 27017)
    wait_for_port("localhost", 6379)
    init_mongo_replica_set()
    verify_mongo_schema_collection()
    init_redis_index()
    print("[init-stack] Stack initialization complete")


if __name__ == "__main__":
    try:
        main()
    except (subprocess.CalledProcessError, PyMongoError, RedisError, TimeoutError, RuntimeError) as exc:
        print(f"[init-stack] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
