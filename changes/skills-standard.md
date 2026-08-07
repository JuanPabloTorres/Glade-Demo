---
taskId: skills-standard
type: patch
scope: .claude/skills operational standard
---
# Summary

Every `.claude/skills/*/SKILL.md` was rebuilt as an operational contract. The nineteen skills went
from 281 lines in total (six to forty-nine lines each, mostly a title and a paragraph of
imperatives) to 6,397 lines, each following one structure: identity and role, purpose, mission,
activation conditions including when *not* to use the skill, real system context with repository
paths, source-of-truth precedence, ownership, boundaries, numbered invariants, dependencies,
required knowledge, inputs, preconditions, a discovery procedure, a decision framework, an execution
workflow, proactive-behavior rules (local / horizontal / vertical / pattern / regression), expected
and forbidden behaviors, error handling, edge cases, a cross-system checklist, a validation strategy
with runnable commands, a definition of done, an expected output shape, escalation rules,
collaboration edges, worked examples (correct / incorrect / complex), failure scenarios and a
self-review.

The content was derived from the code rather than expanded from the previous text: the agent
scripts, the hooks, the contract registry, the repository protocols, the AI runtime and guardrails,
the component inventory, the locale validator, the Flowbite check and its exceptions registry, the
Playwright configuration and the test suite were all read first, and every path, command, threshold
and enum cited in a skill was verified to exist.

`docs/agent-system/03-skills-catalog.md` was rewritten to match, and now also records where no skill
owns a responsibility.

# User-visible behavior

None at runtime. This changes how agents work on the repository, not what the application does.

# Migration / compatibility

Skill `name` frontmatter is unchanged, so every existing reference keeps resolving:
`/flowbite-design-system`, `/create-feature-flow`, `/api-contract-change`, `/start-change`,
`/finish-change` and `/repo-baseline` are all cited from `CLAUDE.md`, `frontend/CLAUDE.md` and
`backend/CLAUDE.md`. Only `description` fields changed, which affects when a skill is offered, not
whether it can be invoked.

Stale claims corrected, each re-derived against the current tree:

- `ai-context-audit` searched `backend/app/ai/providers/ollama_provider.py`, which no longer exists.
  Ollama and OpenAI are handled by `app/ai/model_factory.py` behind `AgentRuntime`; `providers/`
  holds only `base`, `factory`, `rule_based` and `transformers_provider`. The check was re-derived
  and four more added (allow-list mirroring, role redaction, bounded loop and lazy import,
  injection/isolation test coverage).
- `ai-context-audit` described RAG as possibly ingestion-only. `bankruptcy_service.py:403` calls
  `self._document_index.search(...)` and feeds `CaseContextBuilder.build(retrieved_documents=…)`;
  `CaseContextDto.timeline` and `.recent_conversation` are populated from real repository calls.
- `release-readiness-gate` listed absent case ownership and absent login rate limiting as
  confirmed blockers. Both are present: `CaseAccessDep` is wired in `routers/bankruptcy.py:37,46`
  and `routers/documents.py:40,49` with `test_case_ownership.py`; rate limiting spans
  `core/config.py`, `core/security.py`, `routers/auth.py` and `main.py` with
  `test_login_rate_limit.py`. Repeating them would have produced a false NO-GO.
- `release-readiness-gate` cited a 55 backend / 27 frontend test baseline. Measured now: 176 backend
  test functions across 24 modules, 73 frontend unit cases, 21 e2e cases. The skill now instructs
  measuring rather than inheriting, and flags that `.claude/agents/qa-release-gate.md` still carries
  the old numbers.
- `design-system-audit` claimed only `--color-*` tokens exist and named icon-registry and hardcoded
  -copy violations that have since been fixed. Measured now: `--font-size/weight/leading-*` and
  `--space-1..10` both exist; icon-registry bypasses are 0; the tag-level hardcoded-copy heuristic
  returns 0; arbitrary `px` utilities are 0. Four real, unregistered violations were found instead
  and recorded as the new baseline: hex literals at `CaseWorkspacePage.tsx:349-350` and
  `LoginPage.tsx:87`. Four checks were added for drift no mechanical rule covers.
- `visual-qa` and `visual-acceptance` were near-duplicates. Their boundary is now explicit —
  change-scoped and self-run versus app-wide and independent — and stated in both files.

# Tests and evidence

- `npm run agent:validate` (fleet `--strict`, architecture check, Flowbite check) — green; the
  architecture check is what enforces unique frontmatter `name` across skills and agents.
- `npm run agent:verify -- targeted` — adds `version:check` and `i18n:check`; green.
- Baselines quoted in the audit skills were measured in this session with the searches the skills
  themselves prescribe, so a reader can reproduce them.

# Risks / limitations

- The measured baselines in `design-system-audit` and `release-readiness-gate` will age. Both skills
  now instruct the reader to re-measure and say so if the numbers no longer match.
- `.claude/agents/*.md` were not touched — outside this task's ownership. `qa-release-gate.md` still
  carries the stale 55/27 baseline and still asks for "at least one Ollama test against a real
  reachable instance", phrased for the pre-ADR-0002 provider layout. Worth a follow-up task.
- `docs/flows/` is referenced by `CLAUDE.md` and by `create-feature-flow` but does not exist yet;
  the skill says so explicitly rather than implying otherwise.
- No new skills were created. The catalog records the responsibilities with no first-class owner
  (authentication/JWT, document upload and RAG ingestion as a domain, test authoring) rather than
  inventing skills to fill a taxonomy.
- This work ran in the registered worktree `Glade-Demo-skills-standard` because a second agent
  registered `groq-live-fixes` in the primary checkout mid-task. Version files are untouched: the
  manifest is `mode: parallel`, so integration-manager owns the bump.
