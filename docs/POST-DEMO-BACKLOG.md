# Post-demo backlog

Findings surfaced during the release close-out that are **not** P0/P1 and were
deliberately not fixed. Recorded here instead of implemented, so the release stays
scoped and nothing is quietly forgotten.

Each entry says what it is, why it was not a blocker, and what closing it would take.
Nothing here blocks the demo.

---

## Architecture

### The document index is in-memory and process-wide
`CaseDocumentIndex` is a dict of vectors held in one Python process. It does not survive
a restart, and a multi-worker deployment gives each worker its own — so a document
uploaded through one worker is invisible to the next request if it lands elsewhere.

*Not a blocker:* the demo runs single-process, and the seed populates the index at
startup so a fresh boot is never empty.

*To close:* implement the same interface over the optional `rag` dependency group
(FAISS/Chroma). The interface was designed for this; `CaseDocumentIndex`'s docstring
says so.

### Two seeds describe the same demo cases
`BankruptcyWorkspaceContext.tsx` seeds the browser workspace and
`app/repositories/seed.py` seeds the database. They agree on case ids and roughly on
figures, and nothing enforces that agreement — a change to one can silently diverge.

*Not a blocker:* they agree today, and `DEMO_CASE_ID`'s docstring records why the ids
must match.

*To close:* generate the browser seed from the server fixture, or add a test that reads
both and asserts they describe the same cases.

### Conversation continuity is scoped by case, not by role
`ai_conversations` is keyed by `case_id` alone, so two attorneys on one case share a
transcript and a client sees turns an attorney typed on their case.

*Not a blocker:* the demo has one client and one attorney, and the content is synthetic.
`AIConversationRepositoryProtocol`'s docstring already records the gap.

*To close:* add `role` (or the author's user id) to the table and filter `list_recent`
by what the current caller may read.

---

## Design system

### `FileField`'s two icon buttons are not `IconButton`
They share a local `ICON_BUTTON` constant whose sizing is a documented choice — padding
rather than a fixed square, so the controls do not compete with the file name for width.

*Not a blocker:* they are consistent with each other, labelled, and keyboard reachable.

*To close:* add a third `IconButton` size whose frame is padding-based, then migrate.

### `ActionGroup`'s menu trigger is deliberately not `IconButton`
It is a segment of a compound control: joined to the primary button, carrying
`aria-haspopup`/`aria-expanded`/`aria-controls` and a forwarded ref for overlay
positioning. Routing it through `IconButton` would mean overriding the frame it sets on
purpose and threading a ref through for no gain.

*Not a blocker, and arguably not a defect at all* — recorded so the next audit does not
re-raise it as one.

---

## Tooling and governance

### Playwright can silently test another checkout's code
`reuseExistingServer: !process.env.CI` means a local run adopts whatever already answers
on the configured port. With eight checkouts live, that is not hypothetical: during this
release regression a full 95-test run was served by **another worktree's** dev server —
the fetched `LoginPage` module had `heroBadge` before `login.title` and contained neither
`CheckboxField` nor `IconButton`. Every result in that run, the 92 passes and the 3
failures alike, described code that was not under test.

`--strictPort` does not help, because reuse happens before the command ever runs, and the
env-overridable ports do not help if the port chosen happens to be occupied.

*Not a product defect* — nothing ships wrong because of it. It is a defect in the
verification, which is worse in one specific way: it fails toward green.

*Workaround used for this release:* run with `CI=1` (which turns reuse off) on ports
verified free. Recorded rather than fixed because `playwright.config.ts` is outside this
release's scope.

*To close:* drop `reuseExistingServer` locally, or have the web server expose a build
identity the spec asserts against before running anything.

### `active-task.json` cross-checkout fallback
A checkout with no manifest falls back to shared state, so `agent:fleet` reports six
worktrees as "edits fall back to shared state". Two checkouts could then edit the same
file without the ownership guard firing.

*Not a blocker:* it is agent tooling, not product runtime, and the release was delivered
from a single checkout with a registered manifest throughout.

*To close:* require a manifest per checkout rather than falling back, and add a
regression test that two checkouts without manifests cannot both claim one path.

### `backend/pyproject.toml` version has drifted from `VERSION`
`VERSION` is 4.10.0; `backend/pyproject.toml` still says `4.0.0`. It has been behind for
several releases.

*Not a blocker:* nothing the demo does reads it.

*To close:* decide whether the Python package version tracks the product version at all —
if it does, add it to the integration-manager bump step; if not, say so in
`docs/VERSIONING.md` so the next reader does not treat it as drift.

### `CHANGELOG.md` and `changes/changelog-ledger.md` are unowned
Both sit untracked in the integration checkout and belong to no active task. They were
left untouched for the whole release — not committed, not deleted, not absorbed.

*To close:* whoever owns them registers a task and commits them, or they are dropped
deliberately.

### Nothing enforces the changelog convention
`changes/changelog-ledger.md` states that every governed delivery updates `CHANGELOG.md`,
and no hook or `agent:verify` step fails when one does not.

*To close:* a verify step asserting that a commit touching `changes/*.md` also touches
`CHANGELOG.md`.

---

## Test coverage

### Retrieval quality is not asserted, only routing and isolation
`CaseDocumentIndex.search` has no score threshold — it returns the top *k* whatever the
query. Tests prove the right case's chunks reach the model, not that the most relevant
chunk ranks first.

*To close:* a relevance threshold plus a small golden set of query→expected-chunk pairs.

### The topic-switch instruction is prompt text, not an assertion
The `EARLIER TURNS` block tells the model to answer a new subject rather than the earlier
one. A fake provider picks tools from a scripted list, so it cannot show that a real
model obeys.

*To close:* assert it in the live-provider gate, where a real model is answering.

### English coverage is the three AI answer states, not the whole panel
The offline notice, the action chips and the card view are asserted only in Spanish. No
evidence suggests they are hardcoded; this is a scope statement, not a clean bill.

---

## Frontend

### Ten pre-existing ESLint warnings
Six `react-refresh/only-export-components` and several `react-hooks/exhaustive-deps`.
Zero errors. Untouched during the release because none of them affects behaviour.
