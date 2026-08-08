"""Runs scenarios through the real assistant stack and grades the results.

The stack under evaluation is the production one: `BankruptcyAnalysisService`
computes the figures, `CaseContextBuilder` reduces and redacts the context, and
`AgentRuntime.execute` composes the response. Nothing is stubbed. An eval that
built its own `CaseContextDto` would keep passing while the builder — the
component that performs the role redaction — was broken.

By default the runtime is pinned to `ai_provider="rule_based"`, which is the
deterministic path and the default deployment. That makes the suite hermetic,
free and repeatable, so it can run in CI on every push.

Set `EVAL_AI_PROVIDER` to evaluate a configured model instead. The same
scenarios and the same graders apply; only the path through `AgentRuntime`
changes. That run is not hermetic and is not part of the gate — it is how you
find out whether a prompt change helped, which is the question that currently
has no answer at all.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from app.ai.runtime import AgentRuntime
from app.core.config import get_settings
from app.schemas.assistant import CaseContextDto
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder
from app.services.documents.index import CaseDocumentIndex
from tests.evals.graders import ALL_GRADERS, Grade, Observation, Severity
from tests.evals.scenarios import Scenario


@dataclass(frozen=True)
class ScenarioResult:
    scenario: Scenario
    grades: tuple[Grade, ...]

    @property
    def blocking_failures(self) -> tuple[Grade, ...]:
        return tuple(g for g in self.grades if g.severity is Severity.BLOCKING and not g.passed)

    @property
    def signal_grades(self) -> tuple[Grade, ...]:
        return tuple(g for g in self.grades if g.severity is Severity.SIGNAL)


def provider_under_evaluation() -> str:
    """Which provider the run evaluates. Pinned to the deterministic path unless
    explicitly overridden, so a machine that happens to have Ollama running does
    not silently turn a hermetic gate into a live-model run."""
    return os.environ.get("EVAL_AI_PROVIDER", "rule_based")


def build_context(scenario: Scenario) -> CaseContextDto:
    analysis = BankruptcyAnalysisService().analyze(scenario.case, language=scenario.language)
    return CaseContextBuilder().build(
        scenario.case, analysis, scenario.role, scenario.locale
    )


def run_scenario(scenario: Scenario) -> ScenarioResult:
    settings = get_settings().model_copy(update={"ai_provider": provider_under_evaluation()})
    runtime = AgentRuntime(settings=settings, document_index=CaseDocumentIndex())
    context = build_context(scenario)
    response = runtime.execute(context=context, message=scenario.message)

    observation = Observation(
        scenario_id=scenario.id,
        case=scenario.case,
        context=context,
        message=scenario.message,
        response=response,
        expect_attorney_review=scenario.expect_attorney_review,
    )
    return ScenarioResult(scenario=scenario, grades=tuple(g(observation) for g in ALL_GRADERS))


@dataclass(frozen=True)
class SuiteResult:
    results: tuple[ScenarioResult, ...]

    @property
    def signal_score(self) -> float:
        """Fraction of signal grades that passed, across every scenario.

        Rounded to three places because the baseline is compared numerically and
        an unrounded float would make the recorded value depend on scenario
        count in a way that reads as noise in a diff.
        """
        grades = [g for r in self.results for g in r.signal_grades]
        if not grades:
            return 1.0
        return round(sum(1 for g in grades if g.passed) / len(grades), 3)

    @property
    def blocking_failures(self) -> tuple[tuple[str, Grade], ...]:
        return tuple(
            (result.scenario.id, grade)
            for result in self.results
            for grade in result.blocking_failures
        )

    def signal_breakdown(self) -> dict[str, tuple[int, int]]:
        """Per-grader (passed, total), so a score drop can be attributed to a
        grader instead of prompting a hunt through the whole dataset."""
        breakdown: dict[str, tuple[int, int]] = {}
        for result in self.results:
            for grade in result.signal_grades:
                passed, total = breakdown.get(grade.grader, (0, 0))
                breakdown[grade.grader] = (passed + int(grade.passed), total + 1)
        return breakdown


def run_suite(scenarios: tuple[Scenario, ...]) -> SuiteResult:
    return SuiteResult(results=tuple(run_scenario(scenario) for scenario in scenarios))
