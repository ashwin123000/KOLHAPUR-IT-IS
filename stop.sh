#!/usr/bin/env bash
set -euo pipefail

for port in 5173 8000 27017; do
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:$port || true)"
    if [[ -n "$pids" ]]; then
      kill $pids 2>/dev/null || true
    fi
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi
done

echo "Stopped any process on ports 5173, 8000, and 27017."
