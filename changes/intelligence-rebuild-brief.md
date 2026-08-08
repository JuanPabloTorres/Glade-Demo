---
taskId: intelligence-rebuild-brief
type: docs
scope: agent-system documentation
---
# Summary

Adds `docs/agent-system/11-intelligence-rebuild-brief.md`: a master brief for a
fresh session whose only mission is to audit and rebuild `.claude/`'s agent
layer and the system intelligence it reads from — not to fix product defects.

It was written against a review arguing that Glade's agents, skills, rules and
hooks are too vague, and that the fix is to rebuild all of them. Three of that
review's premises hold against this tree, one does not, and the highest risk it
identifies is not the one it names. The brief records which is which, with the
evidence, so the rebuild does not repeat finished work or the failure that made
the rebuild necessary.

# What the audit found

**The agent layer is bimodal.** Nine of sixteen agents are 10–13 lines — a role
name and a paragraph of imperatives, exactly the weakness described. Seven are
36–59 lines, specific and grounded.

**The seven detailed ones are stale, which is worse.**
`.claude/agents/frontend-shell-engineer.md` carries a section titled
`## Ground truth (verified)` asserting *"There is no sidebar"* and a tab race
condition at `CaseWorkspacePage.tsx:73-74` driven by
`ATTORNEY_REVIEW_TAB_INDEX = 10`. `AppShell.tsx` renders `<Sidebar />` and
`<BottomNavigation />`; the constant does not exist and the page derives its
stage from the URL. A vague agent investigates; a confidently-wrong agent acts
on a lie.

This is not new. `changes/skills-standard.md` records the same decay one
generation earlier: skills searching for a deleted `ollama_provider.py`, and
`release-readiness-gate` listing case ownership and login rate limiting as
confirmed blockers when both were implemented — a false NO-GO.

**The skills do not need rebuilding.** `.claude/skills/` is already 19 skills of
~6,400 lines carrying the exact contract such a rebuild would specify —
ownership, numbered invariants, discovery, decision framework, execution loop,
proactive behaviour, anti-patterns, escalation, validation, definition of done.
That work sits uncommitted in the `Glade-Demo-skills-standard` checkout. What
they need is a *split* for progressive disclosure — ~20 KB per skill is 5–7k
tokens spent before a line of code is read — not a rewrite.

**Three artifacts are genuinely absent,** verified: `docs/system/KNOWN-PATTERNS.md`,
`.claude/architecture/`, `.claude/workflows/`.

**Governance is defined but not adopted.** `npm run agent:fleet` reports six of
eight live checkouts with no manifest, every run. The hooks enforce correctly;
the checkouts simply never registered.

# The design conclusion the brief is built on

Prose that describes the system decays silently; a check that executes against
the system cannot. Every defect found in the session that produced this brief
was found by something executable — `uv lock --check` for a CI that had been red
on `main` for every PR, a golden-dataset grader for an assistant that answered
"should I file for bankruptcy?" with document boilerplate in both languages, a
browser measuring pixels for a login card clipped 47px at 320px where the
overflow assertion reported green.

So the brief requires that an agent file may state a fact about the code only if
it also states how to re-verify it, that every map carries its regeneration
command, and that each phase gate is a command that fails rather than a document
that is read. It also extends the proactive-completion rule with an eighth step:
anything found and not fixed is recorded as a failing-but-registered check,
modelled on `backend/tests/evals/scenarios.py`'s `known_gap`, which fails if the
defect is silently fixed.

# User-visible behavior

None. Documentation only.

# Migration / compatibility

No code, contract, agent, skill, rule or hook was changed. The brief explicitly
instructs the session that acts on it not to touch `.claude/skills/**` while
`docs/skills-standard` is in flight in a sibling checkout.

# Tests and evidence

- `npm run agent:validate` passes.
- Every repository fact cited was verified in-session: the agent line counts by
  measurement, the two false claims by reading `frontend-shell-engineer.md`
  against `AppShell.tsx` and `CaseWorkspacePage.tsx`, the absent directories by
  `Test-Path`, the fleet state by `npm run agent:fleet`, the skill contract by
  reading `visual-qa/SKILL.md` in full.

# Risks / limitations

**This brief will decay too, and it says so.** It is dated to `4.8.0` and
instructs its reader to re-verify every fact before relying on it. That is
mitigation, not a fix; the fix is the drift check the brief asks Phase 2 to
build.

**Consolidating sixteen agents into five loses specificity if done carelessly.**
The seven detailed agents contain real, useful knowledge alongside their stale
claims. The brief says to keep the specifics once corrected, but a session that
treats consolidation as deletion would trade one failure mode for another.

**The adoption gap may not be solvable by documentation.** Six unregistered
checkouts is a behaviour, and the brief's Phase 5 asks for a workflow change and
a better default rather than another rule — but if agents keep skipping
registration, the answer is a harder gate, which is a governance decision rather
than a documentation one.
