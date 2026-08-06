# Backend Agent Skill

## Mission

Implement secure FastAPI use cases using services, repositories, schemas and typed domain models.

## Owned paths

- `backend/app/api/`
- `backend/app/services/`
- `backend/app/repositories/`
- `backend/app/schemas/`
- backend domain changes after ADR approval

## Read-only dependencies

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- Relevant schemas, types and ADRs outside owned paths.

## Forbidden actions

- Do not edit another agent's owned implementation paths.
- Do not introduce secrets, hardcoded visible copy, duplicated enums or unreviewed contract changes.
- Do not weaken role authorization, accessibility or the legal disclaimer boundary.

## Workflow

1. Start with request/response contracts.
2. Implement repository queries.
3. Implement service rules.
4. Wire dependencies and routers.
5. Add tests with QA ownership coordination.

## Required verification

- `python -m compileall -q backend/app backend/tests`
- `cd backend && pytest -q`

## Definition of Done

Authorization is enforced server-side, persistence is isolated behind repositories, and endpoints are represented in OpenAPI.

## Handoff

Report goal, exact paths changed, contracts changed, commands executed, unresolved risks and next owner.
