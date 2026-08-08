---
taskId: product-intelligence-skill
type: docs
scope: product domain knowledge for agents
---
# Summary

Adds `.claude/skills/glade-product-intelligence/SKILL.md`: the product-level
understanding an agent needs to work on FreshStart as one system — actors,
journeys, stages, financial analysis, evidence pipeline, AI purpose and limits,
persistence and ownership model, product invariants, and a definition of done
that is about the capability rather than the file.

It fills a real gap. The nineteen existing skills are all *process* skills —
how to open a change, how to verify it, how to close it. None of them says what
the product is for, who uses it, or what the case journey means. An agent could
follow every one of them perfectly and still build a coherent-looking feature
that makes no product sense.

# What was changed from the supplied draft, and why

The draft was accurate in most of its claims. Three changes were made, all for
the same reason: `docs/agent-system/11-intelligence-rebuild-brief.md` §0
established that this repository's recurring failure is not vague agent prose
but *confidently wrong* agent prose, and a new artifact must not reproduce it.

**§12 Persistence was rewritten, because as drafted it would mislead.** The
draft said agents "must not rely on older documentation that describes
browser-only localStorage as the complete persistence architecture". That is
half true and the missing half matters. Verified:

- Server-side authorization is real: `CaseAccessService.authorize_for_submission`
  and `.authorize_for_case_id`, wired into `routers/bankruptcy.py` and
  `routers/documents.py`.
- Backend persistence is real: SQLAlchemy + Alembic behind
  `repositories/protocols.py`.
- **But there is no case CRUD API.** `contracts/api-contracts.json` registers
  eight operations and none of them creates, lists, reads, updates or deletes a
  case. `analyze` and `guide` carry the whole case in the request body.
- The snapshot is persisted as a *side effect* of those two calls —
  `routers/bankruptcy.py:54` and `:99`.
- The client's working case therefore lives in `localStorage` under
  `freshstart-bankruptcy-workspace-v2`, and no frontend code reads a case back
  from the server.

An agent reading the draft would have concluded the frontend loads cases from
the backend and made a wrong change. The section now states both halves, names
the two beliefs that are each wrong, and records that moving the workspace
behind the API is a new API surface — a MAJOR contract change needing an ADR —
rather than a refactor.

**§4.2 Attorney workflow gained an implementation-status note.** The draft lists
sixteen attorney capabilities hedged with "where supported". Verified against
the contract registry, only authentication, analysis, assistance and document
analysis have a registered operation; requesting evidence, professional notes,
status changes and review summaries are product intent, client-side, or absent
(`CaseRepositoryProtocol.add_note` exists with no endpoint). The hedge was too
quiet to stop an agent treating them as existing.

**Every factual claim now carries how to re-check it,** and the file is dated to
`4.8.0`. This is the rule the rebuild brief imposes on agent artifacts; a new
skill that exempted itself would have contradicted it on the day it landed.

Two smaller additions, both drawn from defects found this week rather than
invented: §11 records that intent recognition happens before reasoning and that
guardrails cannot catch an off-topic answer, with the eval gate to run; §14
records that the repeated i18n defect is copy *persisted* in one language, and
that runtime-generated copy should persist the key rather than the sentence.

# User-visible behavior

None. Agent-facing documentation.

# Migration / compatibility

New directory. Nothing existing was edited. `/glade-product-intelligence`
becomes invokable.

**This branch cannot merge until `docs/skills-standard` lands.** That task, in
the `Glade-Demo-skills-standard` checkout, claims `.claude/skills/**`, and
`npm run agent:fleet --strict` reports a hard `claim-overlap` against it — so
`npm run agent:validate`, and therefore CI's governance job, fails while both
manifests are active. Registration was accepted with `--allow-overlap` and the
reason recorded, but registration is not the gate. The order is: land
`skills-standard`, then this.

# Tests and evidence

- `npm run agent:validate` passes once this task's manifest is completed and the
  overlapping claim is released; it fails while both are active, which is the
  system behaving correctly.
- Claims verified in-session: the contract registry by reading
  `contracts/api-contracts.json`; the router operations by
  `grep -rn "@router\." backend/app/api/routers`; the snapshot writes at
  `routers/bankruptcy.py:54,99`; `CaseAccessService` by reading it; the seven
  document-pipeline stages by listing `backend/app/services/documents/`;
  `CaseContextDto`'s `timeline` / `recent_conversation` / `retrieved_documents`
  and role-gated `attorney_notes` by reading `schemas/assistant.py`;
  `_monthly_amount` in `services/bankruptcy_service.py`; the localStorage key in
  `BankruptcyWorkspaceContext.tsx`.

# Risks / limitations

**This skill will decay like the others.** It is dated and it says so, and every
claim carries a re-check command — but that is mitigation, not immunity. The
durable fix is the drift check the rebuild brief asks Phase 2 to build.

**It overlaps the existing skills in places** — governed viewports, contract
discipline, i18n rules and the design-system hierarchy all appear in
`.claude/rules/` and in individual skills too. That redundancy is deliberate for
a context-setting document, but it is a second place to update, and if the two
ever disagree the rules win (§23 records the precedence).

**It is long.** ~20 KB, the same weight as the existing skills, and it loads
before any code is read. It is a candidate for the same `references/` split the
brief recommends for the skill layer once `skills-standard` lands.
