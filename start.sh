#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$ROOT/KOLHAPUR-IT-IS-main"
LOG_DIR="$ROOT/logs"
DATA_DIR="$ROOT/data/mongo"
BACKEND_DIR="$APP_ROOT/fastapi_backend"
FRONTEND_DIR="$APP_ROOT/frontend"
if [[ -f "$ROOT/venv/bin/python" ]]; then
  VENV_PYTHON="$ROOT/venv/bin/python"
else
  VENV_PYTHON="$ROOT/venv/Scripts/python.exe"
fi

mkdir -p "$LOG_DIR" "$DATA_DIR"

cleanup() {
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${MONGO_PID:-}" ]] && kill "$MONGO_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

if ! command -v mongod >/dev/null 2>&1; then
  echo "[MongoDB] mongod not found. Install MongoDB or add mongod to PATH, then rerun ./start.sh."
  exit 1
fi

if [[ ! -f "$VENV_PYTHON" ]]; then
  echo "[Backend] Python virtualenv not found at $VENV_PYTHON"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[Frontend] npm not found."
  exit 1
fi

echo "[MongoDB] Starting..."
mongod --dbpath "$DATA_DIR" --port 27017 --bind_ip 127.0.0.1 >"$LOG_DIR/mongo.log" 2>"$LOG_DIR/mongo.err.log" &
MONGO_PID=$!

echo "[Backend] Starting..."
(cd "$BACKEND_DIR" && "$VENV_PYTHON" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 >"$LOG_DIR/backend.log" 2>"$LOG_DIR/backend.err.log") &
BACKEND_PID=$!

echo "[Frontend] Starting..."
(cd "$FRONTEND_DIR" && npm run dev >"$LOG_DIR/frontend.log" 2>"$LOG_DIR/frontend.err.log") &
FRONTEND_PID=$!

echo "All services running. Open http://localhost:5173"

wait
