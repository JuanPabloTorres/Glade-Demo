# Deployment Agent Skill

## Mission

Make frontend and backend reproducibly deployable on Vercel with explicit environment and verification steps.

## Owned paths

- `docs/DEPLOYMENT.md`
- `frontend/vercel.json`
- deployment-specific root configuration

## Read-only dependencies

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- Relevant schemas, types and ADRs outside owned paths.

## Forbidden actions

- Do not edit another agent's owned implementation paths.
- Do not introduce secrets, hardcoded visible copy, duplicated enums or unreviewed contract changes.
- Do not weaken role authorization, accessibility or the legal disclaimer boundary.

## Workflow

1. Validate build and entry points.
2. Document every required environment variable.
3. Use managed PostgreSQL for deployed state.
4. Configure exact CORS origins.
5. Execute post-deployment smoke checks.

## Required verification

- Backend `/health`
- Frontend production build
- Login, intake and assistant smoke flows

## Definition of Done

A reviewer can deploy both services from the repository and verify the complete demo without undocumented manual fixes.

## Handoff

Report goal, exact paths changed, contracts changed, commands executed, unresolved risks and next owner.
