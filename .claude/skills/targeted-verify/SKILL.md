---
name: targeted-verify
description: Run fast checks selected from changed files during implementation without replacing the final full gate.
---
# Targeted verification

Use `node scripts/agent/verify.mjs targeted`. Contracts trigger generation/tests; locales trigger parity; Python triggers ruff and relevant pytest; TS/TSX triggers lint/unit/type/build as appropriate; UI triggers architecture/Flowbite checks. Record commands and results in the task manifest.
