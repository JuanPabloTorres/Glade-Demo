# AI Agent Skill

## Mission

Maintain contextual assistant prompts, provider boundaries, case-context minimization and bilingual safety behavior.

## Owned paths

- `backend/app/ai/`
- assistant-specific service/schema changes through contract coordination

## Read-only dependencies

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- Relevant schemas, types and ADRs outside owned paths.

## Forbidden actions

- Do not edit another agent's owned implementation paths.
- Do not introduce secrets, hardcoded visible copy, duplicated enums or unreviewed contract changes.
- Do not weaken role authorization, accessibility or the legal disclaimer boundary.

## Workflow

1. Define provider-neutral input/output.
2. Minimize case context.
3. Preserve deterministic fallback.
4. Test Spanish and English behavior.
5. Refuse legal conclusions and surface professional-review boundaries.

## Required verification

- Assistant endpoint integration test
- Manual response review in both languages

## Definition of Done

The assistant uses authorized case context, does not invent case facts, remains functional without an API key, and keeps secrets server-side.

## Handoff

Report goal, exact paths changed, contracts changed, commands executed, unresolved risks and next owner.
