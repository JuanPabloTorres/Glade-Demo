"""Scorecard for the assistant, printable without running the test suite.

    cd backend
    uv run python -m tests.evals.report
    EVAL_AI_PROVIDER=ollama uv run python -m tests.evals.report

The point of the second form: a prompt or guardrail change can now be answered
with a number instead of an anecdote. Run it before, change the prompt, run it
after, compare. Model runs are never the gate — `test_assistant_evals.py` pins
the baseline to `rule_based` — but they are the only way to see whether a change
to `app/ai/prompts/**` did anything.

Exit code is 1 when a blocking grader failed, so this is also usable as a
pre-commit or manual check.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from tests.evals.harness import provider_under_evaluation, run_suite
from tests.evals.scenarios import SCENARIOS

BASELINE_PATH = Path(__file__).parent / "baseline.json"


def main() -> int:
    provider = provider_under_evaluation()
    suite = run_suite(SCENARIOS)

    print(f"assistant eval — provider={provider}, {len(SCENARIOS)} scenarios\n")

    real_failures = 0
    resolved_gaps = 0

    for result in suite.results:
        failures = result.blocking_failures
        signals = result.signal_grades
        passed_signals = sum(1 for g in signals if g.passed)
        gap = result.scenario.known_gap

        # A known gap failing is the recorded state, not news. A known gap
        # *passing* is news, and the kind that gets missed: it means someone
        # fixed the defect and the scenario is still parked outside the gate.
        if gap and failures:
            status = "gap "
        elif gap:
            status = "FIXED"
            resolved_gaps += 1
        elif failures:
            status = "FAIL"
            real_failures += 1
        else:
            status = "ok  "

        print(f"  {status:<5} {result.scenario.id:<38} signal {passed_signals}/{len(signals)}")
        for grade in failures:
            marker = "-" if gap else "!"
            print(f"       {marker} {grade.grader}: {grade.detail}")
        if status == "FIXED":
            print(f"       + known gap no longer reproduces: {gap}")
            print("       + delete `known_gap` from this scenario to enforce it")
        for grade in signals:
            if not grade.passed:
                print(f"       ~ {grade.grader}: {grade.detail}")

    print("\nsignal graders:")
    for grader, (passed, total) in sorted(suite.signal_breakdown().items()):
        print(f"  {grader:<40} {passed}/{total}")

    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    recorded = float(baseline["signal_score"])
    delta = suite.signal_score - recorded
    comparable = baseline["provider"] == provider

    print(f"\nsignal score  {suite.signal_score}")
    if comparable:
        print(f"baseline      {recorded}  (delta {delta:+.3f})")
    else:
        print(f"baseline      {recorded}  measured on provider={baseline['provider']} — not comparable")

    open_gaps = sum(1 for r in suite.results if r.scenario.known_gap and r.blocking_failures)
    if open_gaps:
        print(f"known gaps    {open_gaps} still open (recorded, not enforced)")

    if real_failures:
        print(f"\n{real_failures} blocking failure(s).")
        return 1
    if resolved_gaps:
        print(f"\n{resolved_gaps} known gap(s) no longer reproduce — update scenarios.py.")
        return 1
    print("\nno blocking failures.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
