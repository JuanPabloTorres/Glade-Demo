---
taskId: agentic-observability
type: minor
scope: AI runtime tracing
---
# Summary

Every assistant turn now emits one structured record. Before this, "the agent is
running" was a claim checkable only by reading the Strands SDK's stdout by eye —
which is the difference between a demo that *asserts* agentic execution and one
that *demonstrates* it.

`AgentExecutionTrace` accumulates what happened and emits once:
correlation id, provider, model, runtime mode, role, language, agent,
specialist, tools invoked with their status, duration, degraded, fallback reason
and final handler.

Real output:

```text
ai.turn provider=rule_based mode=deterministic handled_by=deterministic tools=- degraded=True duration_ms=0 id=a57694d6...
ai.turn provider=ollama     mode=deterministic handled_by=deterministic tools=- degraded=True duration_ms=0 id=a2fd6b81...
```

# What it deliberately does not carry

Operational traceability and chain-of-thought are different things. The first
says which tools ran and whether the turn degraded; the second is the model's
private deliberation, and logging it would put unreviewed generated text about a
person's finances into a log aggregator.

The guarantee is structural, not editorial: a test enumerates the fourteen
permitted fields and fails if a fifteenth appears, so a future addition has to
justify itself before it can log a case's finances. Secrets, prompts and figures
have no field to live in.

`mark_degraded` takes a value from a closed vocabulary rather than an exception
message. A raw string can carry a URL, a key fragment or the provider's echo of
the request; six enumerated causes are also what an operator can filter and count
on.

# The distinction that matters operationally

`provider_not_agentic` and `provider_cannot_force_structured_output` are separate
reasons. The second means the provider *is* agentic and still unusable — under a
single `degraded` flag it would be indistinguishable from a provider nobody
configured, which is exactly the confusion the previous session spent time
resolving by hand.

# Emitted in a `finally`

A turn that raises past every handler is the one an operator most needs to see,
so the record is written on the way out regardless. A test asserts it by making
`_compose` explode.

# Nine tests, and one thing they do not do

Assertions are on the emitted payload, not on the formatted log line. A test that
matches a log string is asserting on formatting, and would pass a record whose
fields were wrong as long as the sentence still read correctly.

# User-visible behavior

None. Logging only; no response field changed.

# Migration / compatibility

`AgentRuntime._agents_enabled` and `_run_agents` take a `trace` argument.
`_patch_agent_layer` in `test_agent_runtime.py` now absorbs it with `**_rest`
rather than naming it — that stub stands in for the agent layer and should not
need editing every time the runtime gains a collaborator it passes down.

Traces go to their own logger, `app.ai.trace`, so a deployment can route or
silence them without touching the rest of the AI logging.

# Tests and evidence

- New `tests/test_agent_tracing.py`, 10 cases. Backend **292 → 302 passed**,
  `ruff` clean, `mypy` clean (70 files).
- Verified end to end: a real turn on each of `rule_based` and `ollama` emits one
  `ai.turn` line with a distinct correlation id.

# Risks / limitations

**Tool-level detail is not populated yet.** `record_tool` exists and is tested,
but nothing calls it: Strands invokes the tools internally, and capturing them
means either wrapping each `@tool` or reading the SDK's event stream. The field
is in the contract so the shape is settled; filling it is the next increment and
is worth doing when the agentic path can actually run.

**`trace.model` reads `model_id` off whatever the factory returned**, with a
`config` fallback. If a future Strands model class exposes neither, the field is
empty rather than wrong — but it is inference about a third-party object.
