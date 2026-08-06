# Agent Coordination

## Parallel work model

Agents work in isolated path ownership and communicate through contracts rather than editing the same files concurrently.

| Agent | Primary ownership |
|---|---|
| Product architect | `docs/`, cross-feature decisions |
| Backend | `backend/app/api`, `services`, `repositories`, `schemas` |
| Frontend | `frontend/src` |
| AI | `backend/app/ai`, assistant contracts/prompts |
| Security | security reviews and narrowly scoped security patches |
| QA | `backend/tests`, future browser tests, CI validation |
| Deployment | deployment docs/configuration and environment contracts |

## Conflict prevention

- Shared-file changes require an ADR or handoff note.
- An agent may inspect any file but edits only its owned paths.
- Contract changes are completed first, then consumers update in separate commits.
- Agents do not run broad formatters across the repository.
- Handoffs list exact paths and verification commands.
