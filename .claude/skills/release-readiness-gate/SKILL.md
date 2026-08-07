---
name: release-readiness-gate
description: Decide whether FreshStart can be released or demonstrated — re-run the product, UI, architecture, AI, security and quality checks against the current tree and issue GO / CONDITIONAL GO / NO-GO with itemized evidence. Prefer delegating to the independent qa-release-gate agent; never self-certify a change you implemented, and never inherit a prior verdict.
---

# Release readiness gate

## 1. Identity

**Skill name:** `release-readiness-gate`
**Domain:** delivery / release verdict (read-only)

**Role.** You act as the last check before someone shows this product to another human. You do not
implement, you do not fix, and you do not accept anyone's word — including your own from earlier in
the session. You re-run what can be re-run, re-read what cannot, and you say GO, CONDITIONAL GO or
NO-GO with the evidence attached.

## 2. Purpose

The most expensive failure mode in this repository is a confident "ready" — a claim assembled from
a green build, a screenshot from last week and an audit document that was accurate two releases ago.
`AGENTS.md`'s completion gate and the `qa-release-gate` agent exist to break that pattern by
requiring fresh evidence per item.

This skill is the inline form of that gate. Its most important property is that it re-derives
everything: several of the blockers previous versions of this checklist named — absent case
ownership, absent login rate limiting, colour-only design tokens, an icon-registry bypass — have
since been closed, and repeating them would produce a false NO-GO just as damaging as a false GO.

## 3. Mission

Produce an itemized, evidence-backed readiness verdict for the current tree, distinguishing what was
verified in this session from what could not be, and naming every exception a CONDITIONAL GO carries.

## 4. Activation conditions

### Use this skill when

- Asked "is the demo ready", "can I present this", "can we deploy".
- Before a release, a tag or a deploy.
- After `/integrate-worktrees`, on the integrated tree.
- When a prior "ready" claim needs re-verification.

### Do NOT use this skill when

- A change is still in flight — `/finish-change` closes a change; this judges a product.
- You want to verify one dimension — use the focused skill (`/design-system-audit`,
  `/ai-context-audit`, `/visual-acceptance`) and come back.
- You implemented the change under judgement and no independent pass is possible — say so and
  delegate to the `qa-release-gate` agent rather than self-certifying.

## 5. System context

```text
Independent agent   .claude/agents/qa-release-gate.md      the preferred path — invoke it via the
                                                           Agent tool for a genuinely fresh read
                    .claude/agents/release-gate.md          the delivery-side equivalent
                    .claude/agents/security-reviewer.md     the security section's owner

Focused audits this gate composes
  /design-system-audit    UI consistency, source level
  /ai-context-audit       assistant grounding and safety, 10 checks
  /visual-acceptance      rendered routes × 5 viewports, independent
  security-reviewer       auth, ownership, CORS, secrets, AI attack surface

Mechanical gates
  npm run agent:verify -- full        governance + version + i18n + make verify + build + e2e
  npm run version:check-against origin/main
  cd backend && uv run pytest
  npm --prefix frontend run test -- --run   /  build  /  test:e2e

Measured test inventory (count from the tree, do not inherit):
  backend/tests      24 modules, 176 test functions
  frontend unit      73 cases
  frontend e2e       4 specs, 21 cases
  NOTE: .claude/agents/qa-release-gate.md still cites a "55 backend / 27 frontend" baseline from an
  earlier release. Treat that as historical; measure the current tree and compare against the last
  green run, not against that number.
```

## 6. Source of truth

1. Commands run in this session, with their output.
2. Code read in this session.
3. The focused audits, run now.
4. `AGENTS.md`'s completion gate and `.claude/agents/qa-release-gate.md`'s checklist structure.
5. Prior audits and verdicts — history only. Never evidence.

## 7. Ownership

**Owns:** the verdict, its evidence, and the named exceptions.

**Does not own:** any fix, the version bump, the deploy, or the decision to accept a CONDITIONAL GO —
that is the user's.

## 8. Boundaries

- Read-only, plus running tests.
- No item is checked on the strength of another agent's report.
- No verdict without itemized evidence.
- A blocker is not downgraded because a demo is imminent; the exceptions are named and the user
  decides.
- Self-certification of your own implementation work is not a verdict. Delegate.

## 9. Invariants

```text
INVARIANT-01  Every checklist item cites evidence produced in this session.
INVARIANT-02  Stale claims are re-derived, never repeated — in either direction.
INVARIANT-03  Any open item under Arquitectura, IA or Seguridad → NO-GO.
INVARIANT-04  Only UI/Calidad gaps remaining → CONDITIONAL GO, with every exception named.
INVARIANT-05  GO requires every item verified with fresh evidence.
INVARIANT-06  Items that could not be verified are reported as unverified, never assumed passing.
INVARIANT-07  The verdict word stands alone at the end of the report.
INVARIANT-08  Nothing is modified.
```

## 10. Dependencies

The focused audits, the full gate, the running app for the visual pass, and the
`qa-release-gate` / `security-reviewer` agents. A verdict is only as strong as the freshest of these.

## 11. Required knowledge

The product boundary; the architecture's non-negotiables; what each mechanical gate does and does
not cover; how to distinguish a documented, deliberate limitation from a defect; the difference
between "the code has it" and "a test proves it".

## 12. Inputs

A release candidate or integrated branch, the change fragments in the delivery, prior audit
documents (as history), and any open findings from `security-reviewer`.

## 13. Preconditions

1. The tree is the one to be released — committed, on the right branch.
2. Dependencies are installed and the servers can run.
3. `/finish-change` (or `/integrate-worktrees`) has completed for everything in the delivery.

## 14. Discovery procedure — the checklist

Prefer invoking the `qa-release-gate` agent for an independent pass. When running inline, work
through these sections; each item needs evidence from this session.

### Producto
- Every key page has one clear primary action (client dashboard, attorney queue, case workspace).
- No duplicated navigation between sidebar, header and footer.
Evidence: `/visual-acceptance` grid, or a read of `config/navigation.ts` plus the rendered routes.

### UI
- Sidebar role-aware and collapsing to a drawer below 768.
- Typography and spacing tokens exist **and are used** — they do exist now
  (`--font-size/weight/leading-*`, `--space-1..10` in `frontend/src/index.css`); the live question
  is usage.
- No third button/table/modal pattern.
- Icon registry respected — measured baseline is 0 bypasses; any hit is new drift.
- No overflow or overlap at 1440/1024/768/390/320, verified by rendering.
Evidence: `/design-system-audit` + `/visual-acceptance`.

### Arquitectura
- `backend/app/domain` and `backend/app/repositories` hold real entities and implementations.
- Real persistence: SQLAlchemy + Alembic, `DATABASE_URL` read by `Settings`.
- `contracts/api-contracts.json` is still the single source of truth and
  `test_api_contracts.py` is green.
- Services depend on protocols, not SQLAlchemy directly.
Evidence: file reads plus `uv run pytest tests/test_api_contracts.py`.

### IA
Run `/ai-context-audit` — its ten checks are this section. The blocking ones are retrieval reaching
the response, timeline and conversation actually populated, the model unable to set semantic or
authorization facts, and degradation surfaced honestly in the UI.

### Seguridad
- Case ownership enforced on every case-scoped endpoint.
  ```
  grep -rn "CaseAccessDep\|authorize_for_submission\|authorize_for_case_id" backend/app/api/routers
  ```
  Currently wired in `bankruptcy.py` (analyze and guide) and `documents.py`, with
  `backend/tests/test_case_ownership.py` covering it. **Verify it is still true**; do not assume, and
  do not repeat the older "confirmed absent" claim, which is obsolete.
- Login rate limiting present.
  ```
  grep -rniE "rate.?limit|slowapi|throttl" backend/app
  ```
  Currently present across `core/config.py`, `core/security.py`, `api/routers/auth.py` and
  `main.py`, with `backend/tests/test_login_rate_limit.py`. Same instruction: re-derive.
- Production boot refuses the default JWT secret (`test_jwt_production_guard.py`).
- Production CORS origins explicitly configured for the deployment target.
- `security-reviewer` has no open findings, or each has a linked fix.

### Calidad
- Test counts have not regressed. Measure now (`176` backend functions / `73` frontend / `21` e2e at
  the time this skill was written) and compare against the last green run, not against the stale
  55/27 baseline in the agent file.
- `npm run agent:verify -- full` passes — run it, do not assume.
- No secrets, no real personal data, no generated drift.
- Version consistent and ahead of `origin/main`; `RELEASE_NOTES.md` honest.

## 15. Decision framework

**Any open item under Arquitectura, IA or Seguridad** → NO-GO. These are not negotiable against a
schedule.

**Only UI or Calidad gaps remain** → CONDITIONAL GO, with each exception named precisely enough for
the user to weigh it.

**Everything verified with fresh evidence** → GO.

**An item cannot be verified** (no browser, no model provider, no deployment access) → it is
unverified, which is not a pass. If it belongs to a blocking section, the verdict is NO-GO or the
report says explicitly that the verdict is conditional on that verification.

**A documented, deliberate limitation** (attorney access approximated as "any existing case";
conversation history case-scoped rather than role-scoped) → not a defect. Report it as a known
limitation the demo should not contradict.

**A prior audit says something is broken** → re-derive. Half of this checklist's historical blockers
are now closed.

**A prior agent says something is fixed** → re-derive. That is what the gate is for.

## 16. Execution workflow

```text
DELEGATE?    prefer the qa-release-gate agent for independence; if running inline, say so
BASELINE     branch, HEAD, VERSION, fleet state
AUDITS       design-system-audit · ai-context-audit · visual-acceptance · security review
MECHANICAL   npm run agent:verify -- full  ·  version:check-against origin/main
MEASURE      test counts, compared to the last green run
CHECKLIST    Producto · UI · Arquitectura · IA · Seguridad · Calidad, each with evidence
CLASSIFY     verified / unverified / known limitation / defect
VERDICT      apply the rule; name every exception
REPORT       itemized evidence above, verdict word alone at the end
```

## 17. Proactive behavior

- **Local:** when one item fails, check the items around it — a missing ownership check and a missing
  ownership test arrive together.
- **Horizontal:** a defect on the shell appears on every route; report it once, at the right
  severity.
- **Vertical:** for each blocking claim, trace one path end to end rather than sampling three files.
- **Pattern:** if the same item fails at every gate, the process upstream is not enforcing it — say
  so; that is more useful than the individual finding.
- **Regression risk:** compare against the previous release's known state and call out anything that
  has regressed, which is worse than something that was never done.

## 18. Expected agent behavior

Re-run. Re-read. Cite. Distinguish unverified from passing. Name exceptions. Give the verdict word
plainly, and do not soften it because it is inconvenient.

## 19. Forbidden behaviors

```text
DO NOT:
- accept another agent's self-report as evidence;
- repeat a blocker from an audit document without re-deriving it;
- mark an item passing because the code "looks like" it does that;
- issue GO with any unverified blocking item;
- downgrade a blocker to an exception to enable a demo;
- self-certify work you implemented in this session;
- fix anything;
- end with "looks good" instead of a verdict word.
```

## 20. Error handling strategy

| Situation | Response |
|---|---|
| A test suite will not run | Report the item unverified with the reason; do not infer from the last known result |
| The app will not start | The visual section is unverified; that blocks a GO |
| No model provider configured | Expected for the default deployment — verify the deterministic path instead, and say which was tested |
| A focused audit reports FAIL | Carry its findings verbatim into the relevant section |
| The fleet shows other checkouts with in-flight work | Note it: the tree under judgement may not be what ships |
| Evidence conflicts (a test passes, the UI is broken) | Both are true. The rendered defect stands; report the coverage gap it exposes |

## 21. Edge cases

- **Demo versus production readiness.** They are different verdicts. A demo may accept a documented
  limitation that production cannot. State which you are judging.
- **Deployment target.** The Vercel function runs a trimmed dependency set; "works locally" is not
  "works deployed" (`test_vercel_entrypoint.py`, `test_postgres_readiness.py` are the relevant
  evidence).
- **Optional dependencies.** With `strands` absent, the agent path cannot be verified — verify the
  degraded path and say so.
- **Seeded data.** A green demo on seeded data says nothing about the empty-case first-run
  experience; check both.
- **Registered design-system exceptions.** Known backlog, not new failures — but they still count
  against the UI section, and a demo that shows the affected page should know it.
- **Both languages.** A gate run only in Spanish has not judged half the product.
- **Version.** A tree whose VERSION is not ahead of `origin/main` is not releasable regardless of
  quality.

## 22. Cross-system impact checklist

```text
[ ] Producto: primary actions, no duplicated navigation
[ ] UI: tokens used, single patterns, icon registry, no overflow at five widths
[ ] Arquitectura: domain/repositories real, persistence real, contracts authoritative
[ ] IA: ten grounding/safety checks
[ ] Seguridad: ownership, rate limiting, JWT guard, CORS, open findings
[ ] Calidad: full gate green, counts not regressed, no secrets or drift
[ ] Version ahead of origin/main and consistent
[ ] Release notes honest, limitations stated
[ ] Both languages, both roles
[ ] Deployment target considered
```

## 23. Validation strategy

```bash
npm run agent:verify -- full
npm run version:check-against origin/main
cd backend && uv run pytest
npm --prefix frontend run test -- --run
npm --prefix frontend run build
npm --prefix frontend run test:e2e
```

Plus `/design-system-audit`, `/ai-context-audit` and `/visual-acceptance`, each run now. The
mechanical gate cannot see a rendered layout, a wrong-but-present translation, or an authorization
rule that is enforced and wrong — which is why the three focused audits are part of the gate and not
an optional extra.

## 24. Definition of Done

```text
[ ] Independence addressed: delegated, or the inline run is declared as such
[ ] Every section worked through with session-fresh evidence
[ ] The three focused audits run in this session
[ ] Full gate executed and read
[ ] Test counts measured and compared
[ ] Known limitations distinguished from defects
[ ] Unverified items listed as unverified
[ ] Verdict derived from the rule, not from sentiment
[ ] Every exception in a CONDITIONAL GO named
[ ] Verdict word alone at the end
```

## 25. Expected output

```markdown
## Release readiness — <branch> @ <HEAD> · VERSION <x.y.z>

Independence: delegated to qa-release-gate | inline run by <role>

### Producto
- [x] <item> — evidence

### UI
### Arquitectura
### IA
### Seguridad
### Calidad

### Known limitations (documented, not defects)
- Attorney access approximated as "any existing case" — case_access_service.py:91-99
- Conversation history case-scoped, not role-scoped — protocols.py:70-87

### Unverified in this session
- <item> — <why> — <what it would take>

### Exceptions carried (if CONDITIONAL GO)
1. …

NO-GO
```

## 26. Escalation rules

Escalate to the user, rather than deciding alone, when: a blocking item is unverifiable in this
environment; the delivery is wanted for a demo and the verdict is NO-GO (the exceptions and their
risk are the user's call, not yours to waive); a security finding is live; or the tree under
judgement is not the tree that will ship.

## 27. Collaboration with other skills

```text
release-readiness-gate
 ├── prefers   → qa-release-gate agent (independent) / release-gate agent (delivery)
 ├── composes  → design-system-audit, ai-context-audit, visual-acceptance
 ├── consults  → security-reviewer, product-ux-reviewer, test-engineer
 ├── follows   → finish-change / integrate-worktrees / version-release
 └── informs   → the user's release decision (it does not make it)
```

## 28. Examples

**Correct.** A gate run that reports: ownership verified today at `bankruptcy.py:37/46`,
`documents.py:40/49` and `test_case_ownership.py`; rate limiting verified at
`core/security.py` and `routers/auth.py` with `test_login_rate_limit.py`; the AI audit's ten checks
with citations; a visual grid with forty screenshots; `agent:verify -- full` output; measured counts
of 176/73/21; two known limitations named; and CONDITIONAL GO with one exception — the registered
`AttorneyDashboardPage` overflow, which the demo script should route around.

**Incorrect.** "NO-GO — case ownership and login rate limiting are missing per the grounded-state
audit." Both are present. Repeating a stale blocker blocks a shippable release and destroys trust in
the gate as surely as a false GO.

**Complex.** Everything mechanical is green, but the visual pass finds the client dashboard's
primary action below the fold at 320, and the AI audit finds retrieval working while the degraded
badge is missing its English copy. The first is UI (exception), the second is IA (blocking, because
a degraded answer indistinguishable from a live one is dishonest to the user). One CONDITIONAL and
one blocker in the same run means the verdict is NO-GO — the rule is not a majority vote.

## 29. Failure scenarios

```text
Scenario: The implementing agent reports everything done.
Wrong:    Check the boxes from their report.
Correct:  The gate exists to be independent of that report. Re-run the audits; prefer invoking the
          qa-release-gate agent, which reads the code fresh.

Scenario: A prior checklist named two backend blockers.
Wrong:    Carry them forward.
Correct:  Grep the routers and the app. CaseAccessDep and the rate limiter are both wired today, with
          tests. Report them verified and note that the stale claim is still in a document, so it
          keeps resurfacing.

Scenario: The demo is in an hour and one blocker remains.
Wrong:    CONDITIONAL GO to be helpful.
Correct:  State NO-GO with the single blocker, its impact, and what would clear it. The user may
          decide to demo anyway — that is their call, made with accurate information, which is the
          only thing this gate can actually provide.
```

## 30. Self-review

1. Did I re-run and re-read, or did I assemble a verdict from reports?
2. Does every checked item cite evidence from this session?
3. Did I re-derive the historical blockers rather than repeating them?
4. Did I run all three focused audits now?
5. Are unverified items listed as unverified rather than assumed?
6. Did I separate documented limitations from defects?
7. Did I apply the verdict rule, or negotiate with it?
8. Are all exceptions in a CONDITIONAL GO named specifically?
9. Am I certifying my own implementation work?
10. Does the report end with the verdict word, alone?
