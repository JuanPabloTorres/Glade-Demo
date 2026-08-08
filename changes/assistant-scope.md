---
taskId: assistant-scope
type: minor
scope: assistant scope routing
---
# Summary

The portfolio was attached to **every** attorney guide request, including
case-level questions that never use it. `GuidanceRequestDto` gains
`assistant_scope`, and the router now builds a portfolio only when the role
allows it *and* the surface asks for it.

I recorded this as a limitation when wiring the endpoint; this closes it.

# Two independent conditions, and both must hold

**The role is the authorization.** A client never carries a portfolio whatever
it sends — a test posts `assistant_scope: "portfolio"` from a client session and
asserts it gets nothing, so a client that learns the field name gains nothing by
it.

**The scope is the product decision.** An attorney asking about the case they
have open does not need every other case in context, and attaching one would
widen the data surface and the ambiguity of the answer for nothing.

The collection is still resolved server-side from the session identity. The hint
chooses *which* authorized scope to build, never *what* is in it.

# Why a hint rather than classifying the sentence

The UI already knows whether the user is in the attorney dashboard or inside a
case workspace. That is cheaper and far more reliable than deciding from the
text — a keyword classifier would have to guess at "¿qué le falta a este caso?"
versus "¿cuáles necesitan atención?", and would guess wrong in both directions on
the phrasings that matter.

What the client cannot do is grant itself anything, which is why the hint is
paired with the authenticated role rather than trusted alone.

`assistant_scope` defaults to `case`, so an older client that sends nothing keeps
its current behaviour and never accidentally opens the wider surface.

# User-visible behavior

None yet from the UI: the frontend does not send `assistant_scope`, so every
request defaults to case mode. That is a deliberate default — the attorney's
portfolio questions will start working the moment the client sends the field, and
until then nothing regresses.

# Migration / compatibility

Additive optional field on `GuidanceRequestDto` with a safe default. No entry in
`contracts/api-contracts.json` changes: it registers operations, not schemas.

# Tests and evidence

- Backend **327 → 329 passed**, `ruff` clean, `mypy` clean (71 files).
- An attorney in case mode carries no portfolio; in portfolio mode carries one.
- The default with the field absent is case mode.
- A client asking for portfolio scope explicitly still gets nothing.
- The structural half is already covered in `test_agent_wiring_integration.py`: a
  client factory never constructs `portfolio_agent`, so this does not rely on a
  tool failing later.

# Risks / limitations

**The frontend does not send the field yet.** One line in the API client, plus
the decision of where the scope comes from — `ChatPanelContext` already resolves
`routeContext`, which is exactly the signal. Until then the attorney's portfolio
capability is reachable by an API client and not from the app.

**`assistant_scope` is a two-value enum.** A third surface (a cross-client report,
say) would need a new value and a new authorization rule; the pairing with role
is per-value, not generic.
