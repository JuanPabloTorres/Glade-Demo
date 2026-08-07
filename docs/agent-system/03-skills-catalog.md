# Skills catalog

Nineteen skills live in `.claude/skills/<name>/SKILL.md`. Each one is an operational contract, not a
description: identity and role, purpose and mission, activation conditions (including when *not* to
use it), the real system context with repository paths, source-of-truth precedence, ownership and
boundaries, numbered invariants, a discovery procedure, a decision framework, an execution workflow,
proactive-behavior rules (local / horizontal / vertical / pattern / regression), forbidden
behaviors, error handling, edge cases, a validation strategy with real commands, a definition of
done, an expected output shape, escalation rules, collaboration edges, worked examples, failure
scenarios and a self-review.

`scripts/agent/architecture-check.mjs` requires a unique frontmatter `name` in every file; the
`description` is what decides whether a skill is loaded, so it states the trigger conditions
explicitly.

## Lifecycle

| Skill | Owns |
|---|---|
| `repo-baseline` | Evidence-classified baseline: branch, HEAD, version, fleet, architecture, tests. Read-only. |
| `start-change` | Branch or worktree decision, task manifest, non-overlapping `ownedPaths`. Mandatory before the first edit. |
| `plan-change` | Implementation-ready plan grounded in read code; escalates to an ADR when required. |
| `targeted-verify` | The fast change-scoped check loop during implementation. |
| `finish-change` | The full gate, scope and documentation checks; hands off to an independent verdict. |

## Product engineering

| Skill | Owns |
|---|---|
| `create-feature-flow` | Whole user journeys; orchestrates the skills below. |
| `api-contract-change` | `contracts/api-contracts.json` → routers → generated client, one-to-one. |
| `backend-service-change` | Services, repositories behind protocols, migrations, server-side ownership. |
| `ai-context-change` | `app/ai/**` and the case-context builder, preserving the deterministic floor. |
| `flowbite-design-system` | Shared components, tokens, icon registry, responsive and accessible UI. |
| `i18n-change` | ES/EN parity across the 14 namespaces, and localized backend messages. |

## Architecture and delivery

| Skill | Owns |
|---|---|
| `architecture-decision` | ADRs in `docs/decisions/`; blocks implementation until accepted. |
| `integrate-worktrees` | Parallel-worktree consolidation; integration-manager only. |
| `version-release` | SemVer classification, synchronized bump, honest release notes. |

## Verification

| Skill | Scope |
|---|---|
| `design-system-audit` | Source-level UI compliance, including what `agent:flowbite` does not enforce. Read-only. |
| `ai-context-audit` | Ten grounding and safety checks against current code. Read-only. |
| `visual-qa` | The implementer's change-scoped rendered pass at five viewports. |
| `visual-acceptance` | The independent, app-wide rendered pass before a release verdict. Read-only. |
| `release-readiness-gate` | GO / CONDITIONAL GO / NO-GO, composing the audits above. Read-only. |

`visual-qa` and `visual-acceptance` are deliberately distinct: change-scoped and self-run versus
app-wide and independent. Running one does not satisfy the other.

## Coverage gaps

No skill currently owns, as a first-class contract: authentication and JWT specifics, document
upload and RAG ingestion as a domain (it is covered incidentally by `ai-context-change` and
`backend-service-change`), or test authoring (the `test-engineer` agent covers it, with no matching
skill). Add one only when a real responsibility has no owner — not to fill a taxonomy.
