---
taskId: portfolio-agent-tools
type: minor
scope: cross-case agent capability
---
# Summary

Completes R3. `PortfolioTools` gives the attorney's agent three cross-case
capabilities — list the authorized cases, list those carrying an urgency signal,
list those still waiting on the client — and a `portfolio_agent` specialist that
holds them.

# The security shape, and why it is a second class

No tool here takes a case id, an attorney id or any other authorization
parameter. The collection is closed over at construction from what
`CaseAccessService.attorney_portfolio` already filtered, so a model may call
every tool in any order with any arguments and still cannot widen what it sees.

That is why this is a separate class rather than a `case_id` parameter added to
`CaseTools`. Passing an identifier the model controls — even one a service
re-checks — puts a model-authored string on the authorization path. Two tool sets
with two closed scopes removes the class of bug instead of validating against it.

`SpecialistSpec` gains `tool_source`, so which holder a specialist resolves
against is declared in the same table as its tool names. That table is the file's
reason for existing: the grants stay reviewable in one screen.

**A portfolio specialist without a portfolio is never constructed.** Its tools
would raise on first call, so it is gated at construction exactly as the attorney
role already is, and the orchestrator has nothing to route to.

# The tools rank; they do not read

`CasePortfolioEntry` carries no balances and no incomes, so an attorney asking
"which of these needs attention" never puts three clients' finances into a
model's context to find out. When the answer is "that one", the case-level tools
take over.

A lawsuit outranks a client-reported urgency flag: one is a filed proceeding with
a clock of its own, the other is the client's assessment. Ordering them the other
way would put the case with a deadline second.

The prompts, in both languages, say urgency is *recorded fact, not judgement*,
forbid computing financial totals from a view that does not carry them, and tell
the specialist to hand off rather than guess at one case's detail.

# Five existing tests broke, and they were right to

They encoded assumptions this capability invalidates: that `attorney_agent` was
the only role-gated specialist, that every registered tool lives on `CaseTools`,
and that an attorney orchestrator holds exactly every spec.

Updated to state what still matters rather than patched to pass: the gated set is
compared as a set, so a third attorney capability needs no rewrite; tool
existence is checked against the holder the spec *names*, because a portfolio
tool asserted against `CaseTools` would fail for the right reason and prove the
wrong thing.

# User-visible behavior

None yet. `AgentRuntime.execute` accepts a `portfolio` sequence and builds the
tools when one is supplied, but no router passes it.

# Migration / compatibility

`AgentFactory.__init__` gains an optional `portfolio_tools`; existing callers are
unaffected. `execute`, `_execute` and `_run_agents` gain an optional `portfolio`
defaulting to `()`.

# Tests and evidence

- New `tests/test_portfolio_tools.py`, 11 cases. Backend **311 → 324 passed**,
  `ruff` clean, `mypy` clean (71 files).
- Signatures are asserted structurally: a behavioural test only covers the
  arguments someone thought to try, while a signature with no such parameter
  cannot be talked around at all.
- One test pins that a summary carries no financial figure, so a future addition
  has to fail a test before it can put a balance in front of a model.
- Two new wiring tests: an attorney without a portfolio gets no portfolio
  specialist, and a client never gets one.
- An empty portfolio answers `success` with zero cases rather than raising — a
  clear queue is a normal state, not an error for the model to narrate.

# Risks / limitations

**No router passes a portfolio yet**, so the capability is reachable from the
runtime API and not from HTTP. That is one call in `routers/bankruptcy.py`,
which this task does not own, plus a decision about which requests should carry
one — a case-level turn should not, and the runtime already refuses to build the
specialist when it does not.

**Every attorney still sees every persisted case.** Unchanged from
`attorney-portfolio`: that is the demo's shared queue, and `attorney_portfolio`
is the single method that changes when per-attorney assignment exists.

**The three tools cannot be exercised against a live model** while
`LIVE_AGENT_PROVIDER_VERIFICATION` is blocked. Their surface, scope and results
are tested; the model's use of them is not.
