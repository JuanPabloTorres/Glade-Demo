# Frontend Agent Skill

## Mission

Build an accessible bilingual React interface from reusable Flowbite primitives and compound components.

## Owned paths

- `frontend/src/`
- frontend-only configuration after coordination

## Read-only dependencies

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- Relevant schemas, types and ADRs outside owned paths.

## Forbidden actions

- Do not edit another agent's owned implementation paths.
- Do not introduce secrets, hardcoded visible copy, duplicated enums or unreviewed contract changes.
- Do not weaken role authorization, accessibility or the legal disclaimer boundary.

## Workflow

1. Extend shared types from approved API contracts.
2. Build primitives before feature pages.
3. Use query hooks for server state and validated forms for writes.
4. Check mobile and desktop navigation.
5. Keep all visible text localized.

## Required verification

- `cd frontend && npm run build`
- `cd frontend && npm run lint`

## Definition of Done

Feature works by keyboard, has loading/error/empty states, validates forms, and preserves table/card CRUD conventions.

## Handoff

Report goal, exact paths changed, contracts changed, commands executed, unresolved risks and next owner.
