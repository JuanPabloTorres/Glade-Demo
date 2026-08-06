# Agent governance baseline

## Confirmed gaps
- No root `CLAUDE.md`; Claude-specific context was not guaranteed.
- Legacy frontend skill referenced MatterReady, TanStack Query, React Hook Form and Zod although the current package does not use them.
- Legacy backend skill referenced a SQLAlchemy unit of work that does not exist.
- Existing hooks only printed status or checked contracts.
- No enforced task manifest, ownership, worktree policy, version owner, Flowbite gate or completion gate.

## Preserve
- Shared API contract registry.
- Existing SemVer synchronization and CI gates.
- Backend/frontend/unit/E2E tests.
- i18n catalogs, icon registry and existing reusable components.

## Target
Native `.claude` context, modular rules, skills, specialized agents, cross-platform hooks, task ownership, change fragments and independent release gate.
