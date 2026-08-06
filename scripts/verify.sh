#!/usr/bin/env bash
set -euo pipefail

(
  cd backend
  python -m compileall -q app tests
  pytest -q
)

if command -v npm >/dev/null 2>&1; then
  (
    cd frontend
    npm run build
    npm run lint
  )
fi
