#!/usr/bin/env bash
set -euo pipefail
printf '\n[agent pre-task] branch: '
git branch --show-current 2>/dev/null || true
printf '[agent pre-task] changed files:\n'
git status --short 2>/dev/null || true
printf '[agent pre-task] read AGENTS.md and project memory before editing.\n\n'
