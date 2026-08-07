---
name: architecture-decision
description: Write and land a durable ADR in docs/decisions/ before adopting a dependency, changing the persistence or auth model, breaking a contract, or introducing a transversal abstraction — with context, forces, options actually considered, the decision, consequences, migration, rollback and validation. Blocks implementation until accepted; supersede rather than rewrite an existing decision.
---

# Architecture decision

## 1. Identity

**Skill name:** `architecture-decision`
**Domain:** architecture / durable decisions

**Role.** You act as the engineer who writes down *why* the system is shaped the way it is, at the
moment the shape is being decided — including the options that were rejected and what would have to
change for the decision to be revisited. An ADR here is not a formality: `AGENTS.md` and
`.claude/rules/04-documentation.md` make an accepted ADR a precondition for implementing the class
of change it covers.

## 2. Purpose

The expensive mistakes in this codebase are the ones that get made twice because nobody recorded why
the first answer was chosen. ADR 0001 established a deterministic provider as the floor; ADR 0002
replaced the model-rewrite architecture with agent orchestration while explicitly preserving that
floor. Neither of those constraints is derivable from reading the code — a later agent that only
reads `runtime.py` will see defensive-looking complexity and be tempted to simplify away a product
boundary.

An ADR exists so the constraint survives the person who imposed it.

## 3. Mission

Produce an accepted decision record that a future agent can use to understand the constraint, decide
whether their change violates it, and — if the world has changed — supersede it deliberately rather
than erode it accidentally.

## 4. Activation conditions

### Use this skill when

- Adopting, replacing or removing a runtime dependency (`frontend/CLAUDE.md` names TanStack Query,
  React Hook Form and Zod explicitly; the backend equivalent is any new library reaching a request
  path).
- Changing the persistence strategy: a new store, a new access pattern, a change to how repositories
  or protocols work.
- Changing the authentication or authorization model, including the ownership rule in
  `CaseAccessService`.
- Breaking an API contract (any MAJOR bump).
- Introducing a transversal abstraction — something pages, services or providers must all now use.
- Changing an AI boundary: what the model may decide, what context it receives, what the fallback
  guarantees.
- Deliberately accepting a limitation that future agents will be tempted to "fix".

### Do NOT use this skill when

- The change is an ordinary feature, fix or refactor within the existing architecture — that is
  `/plan-change`.
- You are choosing between two equivalent internal implementations with no lasting consequence —
  pick one and record it in the change fragment.
- The decision is about copy, layout or a single component's API — the pattern catalog and the
  change fragment are the right homes.
- You are documenting how something already works with no decision being made — that is
  `docs/architecture/`.

## 5. System context

```text
docs/decisions/
  0001-deterministic-provider.md         RuleBasedProvider is the floor; the model may not
                                         author semantic fields
  0002-strands-agent-orchestration.md    Agents-as-Tools with a server-composed response and a
                                         deterministic floor; supersedes 0001's provider half,
                                         keeps its default; amended in 4.5.0 for Vercel

.claude/templates/adr.template.md        the skeleton
docs/architecture/                       descriptive architecture, not decisions
docs/audits/                             point-in-time findings, not decisions
changes/<task-id>.md                     the delivery record that cites the ADR
```

Format actually in use (0002 is the reference, and it is richer than the bare template):

```markdown
# ADR NNNN: <decision in one line>

## Status
Accepted — YYYY-MM-DD.  [Supersedes / Superseded by / Amended in <version>]

## Context      what was true, and what problem forced a choice
## Forces       the non-negotiables, each named and attributed (AGENTS.md, a rule, a constraint)
## Options considered   numbered, each with why it was rejected or chosen
## Decision     what is now true, stated so code can be checked against it
## Consequences what this costs, what it forecloses, what it obliges
## Migration and rollback
## Validation   how we know it holds — tests, checks, greps
```

## 6. Source of truth

1. `AGENTS.md` non-negotiable rules and the product boundary — no force may override them.
2. Existing accepted ADRs; a new one must state its relationship to them.
3. The code as it is today (an ADR that misdescribes the starting point is worse than none).
4. `.claude/rules/*`, especially `04-documentation.md` for when an ADR is required.
5. `docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md` for product intent.

## 7. Ownership

**Owns:** the ADR file, its number, its status, and the statement of the constraint.

**Does not own:** the implementation (a later change under `/plan-change` implements it), the
version bump, the release notes — though a MAJOR release must cite the ADR.

## 8. Boundaries

- An ADR is written *before* the implementation it authorizes, not as after-the-fact justification.
- An accepted ADR is never edited to say something different. It is amended (with the version that
  amended it) or superseded by a new record that names it.
- An ADR never overrides an `AGENTS.md` non-negotiable. If the decision requires that, it is a
  product decision for the user, not an architecture decision.
- An ADR states current capability and target architecture separately. Aspiration recorded as fact
  is the failure mode this repository already has in its audits.

## 9. Invariants

```text
INVARIANT-01  Numbering is sequential and unique: docs/decisions/NNNN-<slug>.md.
INVARIANT-02  Status is explicit (Proposed | Accepted | Superseded), dated, and links any
              superseded or superseding record.
INVARIANT-03  At least two genuine options are recorded, with the reason each was rejected.
INVARIANT-04  Every force is attributed to a rule, a constraint or an observed failure.
INVARIANT-05  The decision is stated so that code can be checked against it.
INVARIANT-06  Consequences include what the decision costs and forecloses, not only its benefits.
INVARIANT-07  Migration and rollback are concrete.
INVARIANT-08  Validation names the tests, checks or greps that keep the decision honest.
INVARIANT-09  Current capability and target architecture are distinguished.
INVARIANT-10  No implementation lands before the ADR is Accepted.
```

## 10. Dependencies

The rules set; existing ADRs; the code the decision constrains; the tests that will enforce it
(`backend/tests/test_agent_security.py` and `test_guardrails.py` are what actually hold ADR 0002's
boundaries in place — an ADR without such a test is an intention).

## 11. Required knowledge

The product boundary (organize information and prepare questions; never determine eligibility,
select a chapter, or advise); this codebase's layering; SemVer classification; the difference
between a decision (choice among options with consequences) and a description (how something
works).

## 12. Inputs

A proposed dependency, a plan that hits an architectural wall, a contract change that would break
consumers, an audit finding that implies a structural change, or a limitation someone wants to
accept deliberately.

## 13. Preconditions

1. The current architecture in the affected area has been read, not assumed.
2. The forces are known and attributable.
3. At least two options exist — if only one does, the question is whether a decision is needed at
   all.
4. The next free ADR number has been checked (`docs/decisions/`).

## 14. Discovery procedure

```text
1. ls docs/decisions/ — next number, and every existing record that touches this area
2. Read those records fully. A new ADR that contradicts an old one without naming it is drift.
3. Read the code the decision constrains; quote it in Context so the starting point is unambiguous.
4. Collect the forces: AGENTS.md rules, .claude/rules/*, product blueprint, deployment constraints
   (the Vercel function's trimmed dependency set is a real one), performance, security, the
   fallback guarantee.
5. Enumerate options — including "do nothing", which is always an option and is sometimes right.
6. For each option, name what it costs, not only what it gives.
7. Identify how the decision will be enforced in code and in tests.
8. Draft. Circulate as Proposed if the user should weigh in.
```

## 15. Decision framework

**Does this need an ADR?** Yes if a future agent could reasonably undo it while making an otherwise
sensible change. That is the practical test, and it is why ADR 0002's "the model never lowers
`requires_attorney_review`" is an ADR rather than a comment.

**Is there really a choice?** If every alternative is disqualified by a non-negotiable, write it as
a constraint record — short, with the disqualifying rule quoted — rather than staging a fake
comparison.

**Does it conflict with an accepted ADR?** Then it supersedes it. Say so in both files: the new one
declares what it supersedes; the old one gets a status line pointing forward. Never edit the old
decision's substance.

**Is it a small variation of an accepted decision?** Amend the existing ADR with a dated,
version-tagged section (ADR 0002 does this for the Vercel deployment) rather than opening a new
number.

**Is it reversible?** Say so, and say how. A one-way door deserves more options and more scrutiny
than a reversible one.

**Does it move a product boundary?** Stop. That is the user's decision, not an architectural one.

## 16. Execution workflow

```text
DETECT      recognize the change class that requires a record
RESEARCH    read the code, the rules, and every related ADR
FRAME       state the problem so that the options are comparable
OPTIONS     at least two, honestly argued, including do-nothing
DECIDE      state the constraint in checkable terms
CONSEQUENCE cost, obligations, what is now foreclosed
MIGRATE     how the codebase gets from here to there, and back
VALIDATE    the tests/checks that will enforce it
STATUS      Proposed → user review where needed → Accepted, dated
LINK        supersede/amend relationships written in both files
IMPLEMENT   only now, under /plan-change
```

## 17. Proactive behavior

- **Local:** while reading the area, note code that already violates the decision you are about to
  record; list it as migration work rather than pretending the codebase is consistent.
- **Horizontal:** a transversal decision affects every layer — enumerate the call sites that must
  change, so the ADR's migration section is real.
- **Vertical:** state where the constraint is enforced (a service, a factory, a hook) and where it
  is only conventional; conventions decay, enforcement does not.
- **Pattern:** if you are writing the third ADR about the same seam, the seam is wrong; say so.
- **Regression risk:** name the tests that would fail if someone unpicked the decision. If none
  would, add the test as part of accepting it.

## 18. Expected agent behavior

Read the existing records before writing a new one. Quote code for the starting state. Argue the
rejected options fairly — an ADR whose alternatives are strawmen convinces nobody later. State
consequences that hurt. Make the decision testable.

## 19. Forbidden behaviors

```text
DO NOT:
- implement first and write the ADR to match;
- edit an accepted ADR to change its meaning;
- write a decision that contradicts an AGENTS.md non-negotiable;
- present one option and call it a decision;
- omit costs, obligations or foreclosed directions;
- describe target architecture as current capability;
- reuse or skip an ADR number;
- leave a decision Proposed while shipping the code it authorizes;
- record a decision with no way to tell whether the code still honors it.
```

## 20. Error handling strategy

An ADR is a document, so its failure modes are semantic:

| Failure | Response |
|---|---|
| The decision cannot be stated checkably | It is not a decision yet — sharpen it until code could be judged against it. |
| No option survives the forces | A force is wrong, or the requirement is out of bounds. Escalate to the user. |
| It contradicts an accepted ADR | Supersede explicitly, in both files, with dates. |
| Implementation later diverges | Amend the ADR with what actually shipped and why, or fix the code. A silently violated ADR is worse than no ADR. |
| The number is taken | Take the next; never renumber an existing record. |

## 21. Edge cases

- **Deployment-conditional decisions.** The Vercel function runs a trimmed dependency set; a
  decision that only holds for one target must say which, as ADR 0002's amendment does.
- **Optional dependencies.** `strands` lives in an optional extra; a decision that depends on it
  must state the behavior when it is absent — here, deterministic degradation.
- **Accepting a known gap.** `CaseAccessService` deliberately approximates attorney access as "any
  existing case" because the demo has one attorney. That kind of accepted limitation belongs in an
  ADR precisely because it looks like a bug to a future reader.
- **Reversing a decision the code never fully adopted.** State the real starting point, not the
  intended one.
- **A dependency added only for tests or tooling.** Usually no ADR; if it reaches a request path in
  any configuration, it does.

## 22. Cross-system impact checklist

```text
[ ] Product boundary respected (no eligibility, chapter selection or legal advice)
[ ] Security and authorization implications stated
[ ] Data/persistence implications and migration stated
[ ] API contract implications and SemVer impact stated
[ ] Frontend and backend obligations both named
[ ] Deployment targets considered (local, VPS, Vercel function)
[ ] Fallback/degradation behavior preserved
[ ] i18n and accessibility implications, if user-facing
[ ] Tests that enforce the decision identified or added
[ ] Existing violations listed as migration work
[ ] Related ADRs linked in both directions
```

## 23. Validation strategy

An ADR is validated by enforceability. For each constraint, name the mechanism:

- a test (`test_agent_security.py` enforces that the agent path cannot bypass authorization;
  `test_guardrails.py` enforces the softening/review rules);
- a structural check (`scripts/agent/architecture-check.mjs`, `flowbite-check.mjs`);
- a contract test (`backend/tests/test_api_contracts.py`);
- or, at minimum, a documented grep that a later audit can re-run.

If none of these can express it, say so explicitly — a convention-only decision is weaker and the
reader should know.

## 24. Definition of Done

```text
[ ] File at docs/decisions/NNNN-<slug>.md with the next free number
[ ] Status Accepted with a date, and supersede/amend links written in both files
[ ] Context quotes the real starting state
[ ] Forces attributed to rules or observed constraints
[ ] At least two options, honestly rejected
[ ] Decision stated checkably
[ ] Consequences include costs and obligations
[ ] Migration and rollback are concrete
[ ] Validation names tests or checks
[ ] Existing violations listed
[ ] Change fragment cites the ADR
[ ] Implementation has not started before acceptance
```

## 25. Expected output

```markdown
## ADR NNNN: <title> — Accepted

### Why a record was required
<the change class, and the rule that requires it>

### Decision
<one paragraph, checkable>

### Rejected options
1. <option> — <why>

### Consequences
- Costs / obligations / foreclosed directions

### Enforcement
- <test or check> holds <part of the decision>

### Migration
- <existing violation> → <work item>

### Relationship to existing records
supersedes / amends / consistent with ADR NNNN
```

## 26. Escalation rules

Escalate to the user when: the decision would move a product boundary; it would break a public
contract (MAJOR) with real consumers; it commits the project to a dependency with licensing, cost or
data-residency implications; it risks data loss; or the forces genuinely conflict and the trade-off
is a business judgement. Record the escalation in the ADR — "the user chose X over Y on <date>" is
valuable context later.

## 27. Collaboration with other skills

```text
architecture-decision
 ├── blocks    → plan-change and every implementation skill until Accepted
 ├── required by → api-contract-change for incompatible changes
 ├── required by → backend-service-change for a new persistence strategy
 ├── required by → ai-context-change for a new provider or boundary
 ├── required by → flowbite-design-system for a new UI dependency or exception
 ├── cited by  → version-release for any MAJOR
 └── consults  → repository-architect, security-reviewer
```

## 28. Examples

**Correct.** ADR 0002. It quotes the invariant it is replacing ("the model could only rephrase
`draft.message`"), names four forces with attribution, considers three options and explains why
option 2 — the one the plan literally asked for — was rejected (a model that emits the whole
response also emits `requires_attorney_review`), states the chosen architecture, and is enforced by
`AgentRuntime._compose`'s OR-never-assignment and by tests. A later agent tempted to "simplify"
that OR has the reason in front of them.

**Incorrect.** "ADR 0003: We will use TanStack Query. It is the standard for data fetching." No
context, no forces, no alternatives, no consequences for the existing `apiClient`/hook pattern, no
migration for the current call sites, and nothing that would fail if someone removed it.

**Complex.** Replacing the ownership approximation with real case assignments. The ADR must state
the current rule and quote `case_access_service.py:91-99`; name the forces (server-verified
isolation, no assignment table today, one attorney in the demo); consider at least "assignment
table", "attorney-of-record field on the case" and "keep the approximation, document it"; state the
decision checkably ("an attorney may access a case only if an assignment row exists"); and record
that `test_case_ownership.py` currently encodes the *old* rule and must change with it — which is
also what makes this a breaking behavior change.

## 29. Failure scenarios

```text
Scenario: A dependency is already installed and used in a branch.
Wrong:    Write the ADR to describe what was done.
Correct:  The ADR precedes implementation. Either revert the usage pending acceptance, or state
          plainly in the record that it was adopted before the decision and treat that as the
          governance finding it is.

Scenario: A new decision conflicts with ADR 0001.
Wrong:    Edit ADR 0001.
Correct:  Supersede it, as 0002 did — and be precise about which part is superseded. 0002 replaced
          the provider architecture and explicitly kept the deterministic default.

Scenario: The decision is recorded but nothing enforces it.
Wrong:    Accept it and move on.
Correct:  Add the test that would fail if the constraint were removed. An unenforced ADR is eroded
          by the first agent who finds the code puzzling.
```

## 30. Self-review

1. Could a future agent undo this while making an otherwise reasonable change? (If yes, an ADR is
   right — and it needs enforcement.)
2. Did I read every related decision before writing?
3. Are the rejected options ones a competent engineer might actually have chosen?
4. Is the decision stated so code can be judged against it?
5. Did I record what it costs and what it forecloses?
6. Is migration real, and is rollback possible?
7. What test fails if this decision is violated?
8. Did I separate what exists today from what we intend?
9. Are supersede/amend links written in *both* files?
10. Am I about to implement something that is still only Proposed?
