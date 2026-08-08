---
taskId: attorney-portfolio
type: minor
scope: cross-case foundation
---
# Summary

The foundation for attorney cross-case reasoning: an authorized, triage-shaped
listing of the cases an identity may review, plus the differentiated demo
dataset that makes ranking them mean anything.

`CaseAccessService.attorney_portfolio(current_user)` is the whole security
design. It takes an identity and nothing else — there is no parameter a model
could populate, so no prompt can widen the result. Authorization happens before
anything reaches an agent, and what reaches it is a collection that was already
filtered. That is the only shape a model cannot talk its way around, and it is
the same reasoning `CaseTools` uses when it closes over its case instead of
accepting one.

A client is **refused**, not filtered to their own case. Returning a one-item
list for a client would make a role check look like a filter, so a wiring
mistake would read as working software.

# The list ranks cases; it does not read them

`CasePortfolioEntry` carries the case id, client name, status, owner, the two
urgency signals, five counts and `updated_at`. No balances, no incomes, no
completion score.

Two reasons, and the second is the one that matters. Hydrating a client's
finances to render a list would put them in memory — and, once an agent tool is
layered on top, in a model's context — to answer "which of these needs
attention". And a completion score comes from `BankruptcyAnalysisService`, so
computing it per row would run the full analysis N times to sort a table; a tool
that needs it for one case can ask for that case.

The counts are computed in SQL with `func.count(distinct(...))` over left joins.
Left, not inner, because a case with nothing attached is precisely one an
attorney needs to chase; `distinct`, because without it the joins multiply across
each other and a case with 1 income, 4 expenses and 2 debts reports 8 incomes. A
test asserts those three numbers for exactly that reason.

# A third seeded case, deliberately thin

The portfolio only demonstrates triage if the cases differ in the signals triage
uses:

| Case | Status | Signals |
| --- | --- | --- |
| Elena | collecting information | no urgency, partial data |
| Miguel | submitted | urgent collection action, active lawsuit, full data |
| Rosa | collecting information | household only — nothing attached |

Rosa is the second kind of "needs attention": waiting on the client rather than
on the attorney. Three healthy cases would let a ranking answer look correct
while ranking on nothing.

# What this is not yet

**No Strands tool is registered.** This is the repository, service, entity and
dataset; the agent-facing tool is a thin layer on top and is the next increment.
The `AGENTIC` half of R3 is not done, and the live attorney acceptance in §11 of
the demo gate cannot pass until it is.

# User-visible behavior

None yet. No endpoint exposes the portfolio and no tool consumes it.

# Migration / compatibility

`CaseRepositoryProtocol` gains `list_portfolio`. Any future implementation of
that protocol must provide it; `SqlAlchemyCaseRepository` is the only one today.

`reset_demo_data` now seeds a third case and a third user row. Additive, and
`seed_demo_data_if_absent` still writes only into an empty database.

# Tests and evidence

- New `tests/test_attorney_portfolio.py`, 9 cases. Backend **302 → 311 passed**,
  `ruff` clean, `mypy` clean (70 files).
- One test asserts the *signature*, not a behaviour: `attorney_portfolio` takes
  only an identity. A security property that can be checked structurally should
  be, because a behavioural test only covers the inputs someone thought of.
- One asserts the entry type carries no financial field, so a future addition has
  to fail a test before it can put a balance into a triage row.
- One empties the case table through the ORM and asserts an empty portfolio is a
  list, not an error — emptied for real rather than by skipping the seed, since a
  `[]` produced by never running the query would prove nothing.

# Risks / limitations

**Every attorney currently sees every persisted case.** That is the demo — one
attorney, a shared queue — and it is exactly what `_ensure_role_can_access`
already grants case by case. When per-attorney assignment exists,
`attorney_portfolio` is the single method that changes and every caller inherits
it. Until then, "assigned" and "all cases" are the same set, and no test should
be read as proving otherwise.

**The urgency signals are two booleans.** `urgent_collection_action` and
`has_collection_lawsuit` distinguish the seeded cases well, but real triage would
weigh arrears, deadlines and time since last activity. The entry carries
`updated_at` for the third of those; the rest are not modelled.
