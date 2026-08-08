---
taskId: attorney-demo-case-seed
type: patch
scope: demo seed fixture
---
# Summary

Closes the blocker `changes/demo-close-integration.md` recorded: opening a case
as the attorney produced a reproducible `HTTP 404` from
`POST /api/v1/bankruptcy/analyze`, so the review workspace rendered with no cash
flow, no debt composition and no missing items — the entire professional half of
the demo, failing silently.

`case-miguel-demo`, the case the attorney queue opens, now has a server-side
fixture.

# Why the fix is data, not authorization

The authorization rule is correct and is unchanged.
`CaseAccessService.authorize_for_submission` creates a missing case only for its
owning *client*; an attorney gets 404 rather than being able to bring a case into
existence. That is the right boundary.

The defect was that the demo's attorney-facing case existed only in the browser
seed (`BankruptcyWorkspaceContext.seedState()`). A case reaches the database only
after its own client analyzes it, and this one belongs to a client nobody signs
in as — so on any fresh database it was never there to review.

Fixing it by relaxing the rule would have traded a demo gap for a security hole.
The seam was closed with data.

# What changed

`_seed_attorney_review_case` adds a submitted case mirroring the figures the UI
seeds: married household of four in Caguas with an urgent collection action,
$3,400 gross monthly wages, four essential expenses, a delinquent mortgage with a
collection lawsuit, unsecured medical debt, the residence as a jointly-owned
asset, an open review task, an attorney note and a timeline entry.

Its owner is a **user row, not a demo account**. Miguel is the subject of a case
the attorney reviews, not a persona anyone signs in as, and `cases.owner_user_id`
has a foreign key to `users.id` — the row exists to satisfy that relationship and
keep ownership checks meaningful, not to add a third login.

Extracted to its own function rather than inlined: the two fixtures are read for
different reasons — one is a client's in-progress workspace, the other is what
professional review looks like — and one 150-line block made them look like
duplicated data.

**The enum caught an invented string.** The first version recorded the submission
with `event_type="case_submitted"`, which is not a `TimelineEventType` member and
is exactly the magic-string pattern the repository forbids. Submission is a status
change, so it is `CASE_UPDATED`; adding an enum member is a domain change, not a
seed fixture's business.

# User-visible behavior

An attorney opening the queued case sees a real analysis: preparation score,
cash flow, debt composition, assets, missing items. Previously the request failed
and the workspace fell back to a local estimate with no server-derived figures.

Unchanged for the client, and unchanged for any case that genuinely does not
exist — an attorney still gets 404 there.

# Migration / compatibility

Additive to the seed. `reset_demo_data` wipes before writing, and
`seed_demo_data_if_absent` still writes only into an empty database, so an
existing deployment is unaffected until it is reset.

`SEED_DEMO_DATA_ON_STARTUP` remains `false` by default. Its comment explains why
an implicit default is wrong, and that reasoning is untouched: a demo deployment
must still opt in.

# Tests and evidence

- New `tests/test_attorney_case_access.py`, 6 cases. Backend **277 → 283
  passed**, `ruff` clean, `mypy` clean (69 files).
- **The regression tests were confirmed to fail without the fixture**: disabling
  the seed call turns 4 of the 6 red, including the 404 itself. A suite that had
  only ever been seen passing would prove nothing.
- One test asserts the identifiers as literals rather than comparing the
  constants to themselves — the cross-language agreement with the UI seed is the
  thing at risk, and this is the only place it can be checked at all.
- One test asserts a 200 *and* that the analysis carries
  `monthly_cash_flow`, `total_debt`, `total_asset_value`, `completion_score`,
  `missing_items` and `next_steps`: a 200 with an empty body would satisfy the
  status check and still leave the attorney looking at nothing.
- One test asserts an unknown case **still** returns 404, so a future change
  cannot silently close the seam by weakening authorization instead.
- Browser, fresh database with seeding on: attorney logs in, opens
  `case-miguel-demo`, the preparation score renders **100%** from the server
  analysis, and the console is **clean** — the same journey previously produced
  eight errors including the 404s.

# Risks / limitations

**Demo data still has two homes.** The browser seed and the server seed now name
the same two cases and carry the same figures, but nothing enforces that they
stay in agreement — `test_case_ids_match_the_ones_the_ui_seeds` pins the
identifiers and not the contents. A single declared fixture, generated into both,
is the durable fix and is a larger change than this one.

**The figures are duplicated, not shared.** If someone edits Miguel's income in
the frontend seed, the server fixture keeps the old number and only the
identifiers test would stay green.

**Seeding is still opt-in,** so a demo deployment that forgets
`SEED_DEMO_DATA_ON_STARTUP=true` reproduces the original symptom. That default is
deliberate and was left alone; it belongs in the deployment checklist rather than
in the code.
