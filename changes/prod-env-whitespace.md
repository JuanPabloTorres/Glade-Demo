---
taskId: prod-env-whitespace
type: patch
scope: settings validation, production configuration audit
---

# Summary

Production was running the agent against a model called
`llama-3.3-70b-versatile\r\n`. Found by auditing the deployment's real
configuration rather than by reading the code.

# What happened

The Vercel variables were set by piping values into `vercel env add` from
PowerShell. The pipeline appends a line ending, and Vercel stored it as part of
the value. Pulling the production environment back showed it plainly:

```
provider=openai  model='llama-3.3-70b-versatile\r\n'
base_url='https://api.groq.com/openai/v1\r\n'
```

The API key carried the same tail. Groq rejected every call — an unknown model,
and an authorization header with a newline in it. `AgentRuntime` caught each
failure and answered from the deterministic draft, exactly as designed. Nothing
in the response said why. The only symptom was an assistant that never reached
the agent, which is what the reported transcript showed: *"Esta respuesta viene
de la guía determinística: el asistente con modelo no estaba disponible."*

`ModelFactory` already stripped `openai_base_url`, which is why that one alone
would have survived. `openai_model` and the key did not.

# What changed

A `field_validator("*", mode="before")` on `Settings` strips surrounding
whitespace from every string setting. One place to absorb it beats every call
site remembering to, and the class of defect — an invisible character in a
dashboard-entered variable — is common enough that the guard belongs at the
boundary rather than at each use.

The Vercel variables were re-set without the trailing newline, and verified by
pulling them back and comparing lengths.

# Migration / compatibility

None. Values that were already clean are unchanged. A deployment carrying
padded values starts working without being touched.

# Tests and evidence

`test_settings_hygiene.py` (12 new): the model id, base URL, API key, database
URL and JWT secret each survive `\r\n`, `\n`, a space, a tab and a mixture;
non-string settings are untouched; interior whitespace is preserved.

The last one matters most: a padded `DEFAULT_JWT_SECRET` is **still rejected**
in production. That guard compares against an exact literal, so trimming has to
happen first — otherwise a trailing newline would have smuggled the public demo
signing key past it.

Backend 231 tests, `ruff` and `mypy` clean.

# What the audit also found

**Groq's free tier is 100,000 tokens per day**, and the two evidence runs used
98,000 of them. Each agent turn costs roughly 12k tokens, because the
orchestrator delegates to specialists and the case context is re-sent at each
hop. That is about eight turns per day — a live demo exhausts it in minutes.

The configuration itself is now correct: the corrected run reached
`analysis_agent` before the daily limit stopped it, which is the delegation
working. But a demo on this tier needs either a leaner model
(`llama-3.1-8b-instant` costs a fraction per turn), a lower `Limits(turns=...)`,
or a paid tier. Recorded here rather than silently absorbed, because a demo that
degrades halfway through looks like the defect this change just fixed.
