"""
Agent construction for the Strands orchestration layer (ADR 0002).

Shape: one orchestrator whose only tools are specialist agents
(`Agent.as_tool()` — the Agents-as-Tools pattern). The orchestrator holds no
data tool of its own, so every fact in an answer has to have come through a
specialist that was granted the matching tool.

The five specialists are declared as data in `SPECIALISTS` rather than as five
near-identical modules. Each one differs only in prompt name, tool set and
description; expressing that as a table keeps the tool-to-agent grants
readable in one screen, which is the property that actually matters for
review — `attorney_agent` being the only holder of
`get_attorney_review_notes` is a fact you can check here without opening six
files.

Everything is built per request. `Agent` objects are never cached: they carry
conversation state and are bound to one case's `CaseTools`, so a process-wide
instance would be shared memory between users.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from strands import Agent

from app.ai.prompts import load_prompt
from app.ai.tools.case_tools import CaseTools
from app.ai.tools.portfolio_tools import PortfolioTools

logger = logging.getLogger(__name__)

ATTORNEY_AGENT = "attorney_agent"


PORTFOLIO_AGENT = "portfolio_agent"


@dataclass(frozen=True)
class SpecialistSpec:
    name: str
    prompt: str
    tool_names: tuple[str, ...]
    description: str
    attorney_only: bool = False
    tool_source: str = "case"
    """Which tool holder `tool_names` resolve against.

    Two holders, two closed authorization scopes: `case` is bound to one
    authorized case, `portfolio` to the collection the access service already
    filtered. Naming the source per specialist keeps that grant reviewable in
    the same table as the tool names — the property this file exists to make
    checkable in one screen."""


SPECIALISTS: tuple[SpecialistSpec, ...] = (
    SpecialistSpec(
        name="case_agent",
        prompt="case_agent",
        tool_names=("get_case_summary", "get_missing_information"),
        description=(
            "Reads and summarizes the case's stage, progress and outstanding "
            "information. Use for 'where am I' and 'what is missing'."
        ),
    ),
    SpecialistSpec(
        name="analysis_agent",
        prompt="analysis_agent",
        tool_names=("get_financial_snapshot", "get_review_questions"),
        description=(
            "Explains the case's calculated income, expenses, cash flow, debt "
            "and asset totals, and the questions prepared for the attorney."
        ),
    ),
    SpecialistSpec(
        name="documents_agent",
        prompt="documents_agent",
        tool_names=("get_pending_documents", "search_case_documents", "get_case_timeline"),
        description=(
            "Reports outstanding documents, searches the case's uploaded "
            "documents, and reads recent case activity."
        ),
    ),
    SpecialistSpec(
        name="support_agent",
        prompt="support_agent",
        tool_names=(),
        description=(
            "Explains how the application and its sections work. Has no access "
            "to case data."
        ),
    ),
    SpecialistSpec(
        name=ATTORNEY_AGENT,
        prompt="attorney_agent",
        tool_names=("get_attorney_review_notes", "get_case_summary", "get_review_questions"),
        description=(
            "Summarizes priority alerts and the attorney's private review "
            "notes. Attorney sessions only."
        ),
        attorney_only=True,
    ),
    SpecialistSpec(
        name=PORTFOLIO_AGENT,
        prompt="portfolio_agent",
        tool_names=(
            "list_assigned_cases",
            "list_cases_needing_attention",
            "list_incomplete_cases",
        ),
        description=(
            "Reasons across the attorney's authorized cases: which exist, which "
            "carry urgency signals, which are still waiting on the client. Use "
            "for portfolio questions, never for one case's detail. Attorney "
            "sessions only."
        ),
        attorney_only=True,
        tool_source="portfolio",
    ),
)


class AgentFactory:
    def __init__(
        self,
        model: Any,
        tools: CaseTools,
        language: str,
        role: str,
        portfolio_tools: PortfolioTools | None = None,
    ) -> None:
        self._model = model
        self._tools = tools
        self._language = language
        self._role = role
        self._portfolio_tools = portfolio_tools

    def create_orchestrator(self) -> Agent:
        specialists = [
            self._create_specialist(spec)
            for spec in SPECIALISTS
            # Role gating happens here, at construction: a client runtime
            # never has an attorney specialist to route to, so no prompt
            # wording or model decision can reach attorney-only tools. The
            # tool itself re-checks (CaseTools.get_attorney_review_notes) so
            # a mistake here fails loudly rather than silently disclosing.
            if self._is_grantable(spec)
        ]
        return Agent(
            model=self._model,
            system_prompt=load_prompt("orchestrator", self._language),
            tools=[
                agent.as_tool(name=spec.name, description=spec.description)
                for spec, agent in specialists
            ],
        )

    def _is_grantable(self, spec: SpecialistSpec) -> bool:
        """Whether this runtime can build the specialist at all.

        A portfolio specialist without a portfolio is not a degraded specialist,
        it is one whose tools would raise on first call — so it is never
        constructed, and the orchestrator has nothing to route to. Same
        construction-time gating the attorney role already uses.
        """
        if spec.attorney_only and self._role != "attorney":
            return False
        if spec.tool_source == "portfolio" and self._portfolio_tools is None:
            return False
        return True

    def _create_specialist(self, spec: SpecialistSpec) -> tuple[SpecialistSpec, Agent]:
        holder: Any = self._tools if spec.tool_source == "case" else self._portfolio_tools
        return spec, Agent(
            model=self._model,
            system_prompt=load_prompt(spec.prompt, self._language),
            tools=[getattr(holder, name) for name in spec.tool_names],
        )
