#!/usr/bin/env bash
set -euo pipefail
printf '\n[agent post-task] validating shared contracts...\n'
(cd frontend && npm run contracts:generate)
(cd backend && uv run pytest tests/test_api_contracts.py)
printf '[agent post-task] run make verify before declaring completion.\n\n'
