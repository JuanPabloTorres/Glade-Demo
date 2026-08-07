---
taskId: groq-live-fixes
type: patch
scope: assistant action contract, AI health model reporting, evidence harness
---

# Summary

Two defects the first run against a hosted provider exposed. Both were
invisible until something other than Ollama was pointed at this layer, and both
made the agent look broken for reasons nothing in the response explained.

# What the run showed

Real turns through `AgentRuntime` against Groq (`llama-3.3-70b-versatile`):
**4 of 8 answered by real specialists** — `documents_agent`, `analysis_agent`,
`case_agent` — with `degraded: false`. The agent layer works through an
OpenAI-compatible provider, which 4.6.0 could only assert about the wiring.

Every one of the four that degraded failed on the same error:

```
tool call validation failed: parameters for tool AgentAnswer did not match
schema: errors: [`/actions/0`: missing properties: 'id']
```

# 1. An identifier the model had no basis to invent

`AssistantAction.id` was required. It is a React list key — it carries no
meaning a model could know, so a required field meant the model had to guess
one, on every action, on every turn.

Providers differ in how strictly they validate structured output. Ollama
tolerated the omission; Groq rejects the whole tool call. So the agent path
worked or failed *depending on which vendor was configured*, and because
`AgentRuntime` converts a failed call into the deterministic draft, the failure
surfaced as a silent degrade rather than as an error anyone could act on.

The field is optional now. `AgentRuntime._allowed_actions` assigns one where
it is missing, after the allow-list filter so the numbering has no gaps, and
only where absent so a model that did supply an id keeps it.

# 2. The header contradicted the answer beneath it

`AIHealthService._agent_model_id` returned `settings.ai_model_id` for any
non-Ollama provider. That setting belongs to the transformers provider and
defaults to `Qwen/Qwen3-0.6B`, a HuggingFace repo id.

So `/ai/health` reported `Qwen/Qwen3-0.6B` while the assistant was answering
through Groq with `llama-3.3-70b-versatile`. The chat header renders that value
as a badge, which means during a demo the screen would have named a model that
was not answering. Same root cause as the `ModelFactory` fix in 4.5.0, in the
one place that had been missed.

# 3. The evidence harness only knew one provider

`live_agent_turns.py` hardcoded `AI_PROVIDER=ollama` — the one path the
deployed demo does not run. It honours the environment now, so the provider the
deployment actually uses is the provider that can be captured.

# User-visible behavior

The assistant's suggested actions survive a strict provider's validation, so
turns that previously fell back to the deterministic draft are now answered by
the agent. The model named in the chat header is the model that answered.

# Migration / compatibility

No contract change on the wire: `AssistantAction.id` is still always present in
the response, it is simply filled server-side rather than demanded from the
model. Frontend untouched.

# Tests and evidence

- `test_agent_runtime.py` (4 new): an action without an id is accepted by the
  contract; the runtime fills every missing id; an id the model did supply is
  kept; and numbering has no gaps when the allow-list drops an action.
- Backend 200 tests, `ruff` and `mypy` clean.
- Live run against Groq as described above.

# Risks / limitations

**The improvement is not measured.** The fix removes the single cause of all
four degradations in the captured run, but the follow-up run to confirm the new
ratio was cut short for time. The claim here is "the error that caused them is
gone", not "8 of 8 now succeed".

**Free-tier rate limits remain.** The captured run also logged one
`rate limit error` from Groq and one `Failed to call a function` unrelated to
the id schema. Both degrade correctly; neither is addressed here. A demo that
fires questions in quick succession will still see the occasional deterministic
answer.

`docs/evidence/live-agent-turns.json` still records the Ollama run. It was not
overwritten with the Groq capture, which was written outside the repository
while another session held this checkout.
