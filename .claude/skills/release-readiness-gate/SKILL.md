---
name: release-readiness-gate
description: Runs the full FreshStart Definition of Done checklist and issues a GO / CONDITIONAL GO / NO-GO verdict, or delegates to the qa-release-gate subagent for an independent pass. Use when asked "is the demo ready", "can I present this", or before any release/deploy claim.
---

# Release readiness gate

This wraps the same checklist as the `qa-release-gate` subagent
(`.claude/agents/qa-release-gate.md`). For a genuinely independent verification (recommended before
any external presentation), invoke that agent directly via the Agent tool rather than self-certifying
inline — an agent re-reading the code fresh catches what the implementing agent's own confidence
cannot.

## Quick inline check (when a full independent agent pass isn't warranted)
Re-run the audits this skill set provides, in order:
1. `design-system-audit` — UI consistency.
2. `ai-context-audit` — assistant is actually contextual, not just described as such.
3. `visual-acceptance` — real screenshots at all 5 breakpoints.
4. Grep for the two backend blockers directly:
   ```
   grep -n "owner_user_id" backend/app/api/routers/*.py
   grep -rniE "rate.?limit|slowapi|throttl" backend/app
   ```
   Empty results on either = NO-GO (case-ownership check and login rate limiting are both
   confirmed-absent as of `docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md` — verify they've
   actually been added, don't take a prior "done" claim on faith).
5. Run the actual test suites — `pytest` in `backend/`, the frontend test command in `frontend/` —
   and confirm counts haven't regressed below the documented baseline (55 backend / 27 frontend).

## Verdict rule (same as the qa-release-gate agent)
- Any open item under Arquitectura, IA, or Seguridad in the DoD → **NO-GO**.
- Only UI/Calidad gaps remain, everything else clean → **CONDITIONAL GO**, name the exceptions.
- Everything checked with fresh evidence → **GO**.

State the verdict word alone at the end of the report, with the itemized evidence above it. Never
report "ready" without having actually re-run the checks in this session.
