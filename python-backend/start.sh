#!/bin/bash
set -e
PORT=${PORT:-8090}
PYTHON=/home/runner/workspace/.pythonlibs/bin/python3
cd "$(dirname "$0")"
exec "$PYTHON" -m uvicorn app:app --host 0.0.0.0 --port "$PORT" --workers 1
