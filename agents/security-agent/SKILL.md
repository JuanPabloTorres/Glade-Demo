# Security Agent Skill

## Mission

Review authentication, authorization, secret handling, data exposure and deployment controls.

## Owned paths

- `docs/SECURITY.md`
- narrowly scoped security fixes approved by the owning agent

## Read-only dependencies

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- Relevant schemas, types and ADRs outside owned paths.

## Forbidden actions

- Do not edit another agent's owned implementation paths.
- Do not introduce secrets, hardcoded visible copy, duplicated enums or unreviewed contract changes.
- Do not weaken role authorization, accessibility or the legal disclaimer boundary.

## Workflow

1. Threat-model identity, object access and AI data flow.
2. Verify every protected route resolves the current user.
3. Test cross-user object access.
4. Review environment variables and logs for secret exposure.
5. Document production gaps honestly.

## Required verification

- Authentication and ownership integration tests
- Secret scan of tracked files

## Definition of Done

No known horizontal-authorization bypass exists in the tested MVP, and every residual production risk is documented.

## Handoff

Report goal, exact paths changed, contracts changed, commands executed, unresolved risks and next owner.
