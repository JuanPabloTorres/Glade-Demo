"""The gate.

Two distinct failures, kept separate on purpose:

* A **blocking** grader failing is a violated product boundary. It names the
  scenario and the grader, and it fails regardless of anything else.
* The **signal score** dropping below the recorded baseline is a quality
  regression. It does not identify a broken rule; it says the assistant got
  worse and points at which grader accounts for it.

The baseline is committed (`baseline.json`) and is meant to be raised as the
assistant improves. Lowering it is allowed and is a deliberate, reviewable act —
which is precisely what "we knowingly regressed this" should look like in a
diff, rather than a silently deleted assertion.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.evals.harness import SuiteResult, provider_under_evaluation, run_suite
from tests.evals.scenarios import SCENARIOS, Scenario

BASELINE_PATH = Path(__file__).parent / "baseline.json"


@pytest.fixture(scope="module")
def suite() -> SuiteResult:
    """Run every scenario once. Each run constructs the analysis, the context and
    the runtime, so running the whole dataset per test would multiply that by the
    number of assertions for no additional coverage."""
    return run_suite(SCENARIOS)


def _baseline() -> dict[str, object]:
    return json.loads(BASELINE_PATH.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "scenario", [s for s in SCENARIOS if s.known_gap is None], ids=lambda s: s.id
)
def test_scenario_violates_no_product_boundary(scenario: Scenario, suite: SuiteResult) -> None:
    result = next(r for r in suite.results if r.scenario.id == scenario.id)
    failures = result.blocking_failures
    assert not failures, "\n".join(
        f"[{scenario.id}] {grade.grader}: {grade.detail}" for grade in failures
    )


def test_no_known_gap_has_been_silently_fixed(suite: SuiteResult) -> None:
    """Strict-xfail semantics, written out rather than delegated to a marker so
    the failure message can say what to do.

    A known gap that starts passing fails this test. That is deliberate: the
    person who fixes the provider must delete the `known_gap` field in the same
    commit, which moves the scenario into the enforced gate above. Without the
    strictness, a fix lands silently and the scenario stays parked forever —
    including after a later regression reopens the gap.

    Deliberately *not* parametrized over the known gaps. An empty parameter set
    makes pytest report a skip with a cryptic reason, and a permanently-skipped
    test in CI is noise that hides meaning. With no known gaps recorded — the
    desired state — this simply passes.
    """
    silently_fixed = [
        result.scenario.id
        for result in suite.results
        if result.scenario.known_gap is not None and not result.blocking_failures
    ]
    assert not silently_fixed, (
        f"these scenarios are marked as known gaps but now pass every blocking "
        f"grader: {silently_fixed}\n"
        f"Delete `known_gap` from each so they join the enforced gate."
    )


def test_signal_score_has_not_regressed(suite: SuiteResult) -> None:
    baseline = _baseline()
    recorded = float(baseline["signal_score"])  # type: ignore[arg-type]
    actual = suite.signal_score

    breakdown = "\n".join(
        f"  {grader}: {passed}/{total}" for grader, (passed, total) in sorted(suite.signal_breakdown().items())
    )
    assert actual >= recorded, (
        f"assistant quality regressed: {actual} < baseline {recorded}\n"
        f"per-grader results:\n{breakdown}\n"
        f"If this drop is intentional, update {BASELINE_PATH.name} in the same commit "
        f"and say why in the change fragment."
    )


def test_baseline_records_the_provider_it_was_measured_on() -> None:
    """A score measured against a live model is not comparable to one measured
    on the deterministic path. Without this, a developer with `EVAL_AI_PROVIDER`
    set could commit a baseline nobody else can reproduce."""
    baseline = _baseline()
    assert baseline["provider"] == "rule_based", (
        "baseline.json must record a rule_based measurement — it is the only "
        "hermetic, reproducible one. Model runs are for comparison, not for the gate."
    )


def test_the_gate_runs_on_the_deterministic_path_by_default() -> None:
    """Guards the hermeticity of CI itself: if this ever reads anything but
    `rule_based` on an unconfigured machine, the suite has started depending on
    a model being reachable."""
    assert provider_under_evaluation() == "rule_based" or "EVAL_AI_PROVIDER" in __import__("os").environ


def test_every_scenario_states_why_it_exists() -> None:
    """A scenario without a rationale cannot be judged when it starts failing —
    the next person cannot tell whether the assertion or the assistant is wrong."""
    undocumented = [s.id for s in SCENARIOS if not s.rationale.strip()]
    assert not undocumented, f"scenarios missing a rationale: {undocumented}"
