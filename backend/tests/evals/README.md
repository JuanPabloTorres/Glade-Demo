# Assistant evaluation harness

## Why this exists

Every AI defect this project has fixed was found the same way: someone ran the
app, read an answer, noticed it was wrong, and a change fragment was written
about it afterwards — `live-run-defects.md`, `groq-live-fixes.md`,
`assistant-usefulness.md`, `ai-context-grounding`. That loop finds real defects.
It cannot tell you whether a change to `app/ai/prompts/**` made things better or
worse, because there was no number to compare.

This harness is that number, plus a gate under it.

## What it runs

The production stack, unstubbed: `BankruptcyAnalysisService` computes the
figures, `CaseContextBuilder` reduces and redacts the context, and
`AgentRuntime.execute` composes the response. A harness that built its own
`CaseContextDto` would keep passing while the builder — the component that
performs role redaction — was broken.

```text
profiles.py    synthetic cases (inputs)
scenarios.py   the golden dataset: one turn each, with the rule it probes
graders.py     named checks, each traceable to a documented product rule
harness.py     runs a scenario through the real stack and grades the result
report.py      printable scorecard
baseline.json  the recorded signal score
```

## Two kinds of check, on purpose

**Blocking** graders compare against server-owned constants and exact
allow-lists — the disclaimer catalogue, `ALLOWED_ACTION_RESOURCES`, the
guardrails' own compiled patterns. They have no false positives by construction,
so any failure fails the suite.

**Signal** graders are heuristics that can be wrong in both directions ("is this
answer substantive", "is it in the session's language"). They never fail the
suite alone. They are scored, and a *drop* below `baseline.json` fails. Putting
a heuristic in the blocking set is how gates become flaky, and flaky gates get
disabled.

## Running it

```bash
cd backend
uv run pytest tests/evals              # the gate
uv run python -m tests.evals.report    # the scorecard

EVAL_AI_PROVIDER=ollama uv run python -m tests.evals.report
```

The gate always runs on `rule_based`: hermetic, free, repeatable, and the
default deployment. The `EVAL_AI_PROVIDER` form runs the same scenarios and the
same graders against a configured model. That is not part of the gate — a score
measured against a live model is not reproducible — but it is how you answer
"did that prompt change help?" with evidence.

## Known gaps

A scenario may carry `known_gap`. Its assertion still describes what *should*
happen; the suite records the failure instead of enforcing it, and fails if the
scenario starts **passing**. That strictness is the point: whoever fixes the
defect must delete the field in the same commit, which moves the scenario into
the enforced gate. Without it, a fix lands silently and the scenario stays
parked forever — including after a later regression reopens the gap.

A known gap is not permission to leave a defect open. It is how to state a
defect in executable form when the fix belongs to a different change.

## Adding a scenario

Add it to `SCENARIOS` with a `rationale` saying which rule it probes —
`test_every_scenario_states_why_it_exists` enforces that. Set
`expect_attorney_review` only when a documented rule determines it; `None` means
"no principled expectation", which is honest and skips the grader. Pinning an
incidental observed value turns an accident into a requirement.

## Why the graders have their own tests

`test_graders.py` feeds each grader a deliberately violating response and
asserts it is caught. A grader that returns `True` unconditionally produces the
same green run as a correct one, so a suite observed only passing proves
nothing.
