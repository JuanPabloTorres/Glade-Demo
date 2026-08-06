# AGENTS.md — FreshStart Bankruptcy Guide

## Mission
Build a production-minded bankruptcy-preparation workspace for a client and attorney: organize household, income, expenses, debt, assets and evidence; surface missing information; and prepare questions for professional review. Preserve traceability from every frontend request to a registered backend operation. Never provide automated legal advice, chapter selection or eligibility determination.

## Non-negotiable rules
1. `contracts/api-contracts.json` is the operation source of truth.
2. Routers translate HTTP concerns; business orchestration belongs in services.
3. Depend on provider protocols and repository abstractions (`backend/app/repositories/protocols.py`) — never call SQLAlchemy directly from a router or service. Real persistence (SQLAlchemy + Alembic) is implemented; see `docs/audits/GLADE-DEMO-PHASE1-RESOLUTION-2026-08-06.md`. Case-scoped endpoints must enforce server-side ownership (`CaseAccessService`) — never trust a client-claimed `owner_user_id`.
4. Use typed DTOs at API boundaries.
5. Reuse the governed Flowbite/design-system layers before page-specific markup.
6. Do not introduce magic endpoint, status, case or document strings.
7. Every feature includes tests, i18n and documentation.
8. AI receives authorized, role-redacted case context and always has guardrails/fallback.
9. All demo data is synthetic.

## Governed workflow
1. Read `CLAUDE.md`, nested instructions and applicable `.claude/rules`.
2. Run `/repo-baseline` when context is uncertain.
3. Run `/start-change` before editing; create a branch or registered worktree and claim paths.
4. Load the relevant skill and make the smallest coherent change.
5. Run targeted verification during implementation.
6. Create a change fragment; use an ADR/flow spec when required.
7. Parallel worktrees do not edit version/release files; integration-manager owns the final bump.
8. Run `/finish-change`; release-gate independently decides readiness.

## Completion gate
- Governance and ownership checks pass.
- API contracts and generated metadata are synchronized.
- Backend lint/type/tests pass.
- Frontend i18n/lint/tests/build pass.
- Affected journeys and responsive/a11y evidence pass.
- No secrets, real personal data, generated drift or unresolved P0/P1.
- Version and release notes follow the delivery strategy.
