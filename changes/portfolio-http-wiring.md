---
taskId: portfolio-http-wiring
type: patch
scope: cross-case HTTP wiring
---
# Summary

Closes R3. The attorney's authorized portfolio now reaches the agent from a real
HTTP request, so the cross-case capability is reachable in the product rather
than only from the runtime API.

`guide_case` resolves the portfolio from the authenticated session and hands it
down already filtered. A client's request carries nothing, so the cross-case
specialist is never even constructed for them.

# Where the authorization decision lives

`BankruptcyGuidanceService` has a case repository and could read every case
itself — which is exactly why it does not. Authorizing a *collection* is the
router's decision, made against the authenticated identity, and a service able to
widen its own scope would put that decision two layers away from the identity it
depends on. `guide` takes `portfolio` as a parameter and never fetches one.

That keeps the chain the same shape it has everywhere else: identity → access
service → filtered collection → tools → model. Nothing downstream names a case.

# A test-ordering bug in my own test, fixed rather than worked around

The wiring tests passed alone and failed in a full run.
`test_attorney_portfolio.py` empties the case table to prove an empty portfolio
is safe, so anything assuming seeded rows inherits an empty database depending on
order.

The fixture now seeds explicitly. Worth naming because the failure mode is
deceptive: a test that passes alone and fails together looks like the feature is
broken, and the instinct is to go debug the feature.

# User-visible behavior

An attorney's assistant request now carries the triage collection, which is what
lets the portfolio specialist answer "which of my cases need attention". A
client's is unchanged.

# Tests and evidence

- New `tests/test_portfolio_wiring.py`, 3 cases. Backend **324 → 327 passed**,
  `ruff` clean, `mypy` clean (71 files).
- The spy *wraps* `guide` rather than replacing it, so real authorization,
  context building and the runtime still run — the test asserts on the wiring
  without turning the endpoint into a mock of itself.
- One test asserts the entries are triage-shaped and not full cases, so a future
  change cannot quietly start sending a client's finances across the boundary.
- The client test is the security half: enforced by the role check in the router,
  before any model is involved.

# Risks / limitations

**Every attorney still sees every persisted case.** Unchanged, and recorded in
two earlier fragments: that is the demo's shared queue, and `attorney_portfolio`
is the single method that changes when per-attorney assignment exists.

**The portfolio is resolved on every attorney guide request**, including
case-level questions that will not use it. One query per turn, and the specialist
is not constructed unless the collection is non-empty — but a busier deployment
would want it resolved lazily.

**Still unproven: that a live model actually invokes the portfolio tool.** The
surface, scope, results and wiring are tested; the model's use of them needs
either a credential or a fake Strands model at the provider boundary. That is the
next increment and the last piece of §8 of the execution order.
