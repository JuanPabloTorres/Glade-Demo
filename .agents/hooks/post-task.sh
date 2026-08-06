#!/usr/bin/env bash
set -euo pipefail
npm run agent:verify -- targeted
printf '\nRun the full release gate before completion.\n'
