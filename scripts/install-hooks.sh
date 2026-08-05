#!/usr/bin/env bash
set -euo pipefail
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .agents/hooks/*.sh
printf 'Git hooks installed from .githooks\n'
