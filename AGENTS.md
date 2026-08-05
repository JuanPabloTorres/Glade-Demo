# AGENTS.md — MatterReady Demo

## Mission
Build a compact, production-minded legal matter intake and readiness workspace. Preserve traceability from every frontend request to a registered backend operation.

## Non-negotiable rules
1. `contracts/api-contracts.json` is the source of truth for method, path, controller, action, and operation ID.
2. Controllers only validate/translate HTTP concerns. Business logic belongs in services.
3. Services depend on repositories, units of work, and provider protocols—not concrete database or AI implementations.
4. Use DTOs at API boundaries. Never expose ORM entities directly.
5. Reuse frontend components by level: `atoms`, `molecules`, `organisms`, `pages`.
6. Do not introduce magic endpoint strings, status strings, case-type strings, or document-type strings.
7. Every feature must include tests and documentation updates.
8. Never provide legal advice. The application is an operational demo using synthetic data.

## Agent workflow
1. Read `.agents/memory/project-context.md` and relevant skill.
2. Run `.agents/hooks/pre-task.sh`.
3. Make the smallest coherent change.
4. Run `.agents/hooks/post-task.sh`.
5. Update `.agents/memory/decision-log.md` when an architectural choice changes.

## Completion gate
- API contract test passes.
- Backend tests pass.
- Frontend tests and build pass.
- No untracked secrets or generated artifacts.
- User-visible behavior is documented in `docs/DEMO-SCRIPT.md`.
