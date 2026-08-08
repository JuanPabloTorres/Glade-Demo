"""
The attorney's cross-case tools, and the scope they cannot escape.

Same security shape as `CaseTools`, for the same reason: no tool takes a case
id, an attorney id or any other authorization parameter. The collection is closed
over at construction from what `CaseAccessService.attorney_portfolio` already
filtered, so a model may call every tool in any order with any arguments and
still cannot widen what it sees.

These tools rank and count; they never read a case. A test below pins that a
result carries no financial figure, because the moment one does, an attorney
asking "which of these needs attention" puts three clients' finances into a
model's context to find out.
"""

from __future__ import annotations

import inspect
from datetime import UTC, datetime

from app.ai.tools.portfolio_tools import PortfolioTools
from app.domain.entities import CasePortfolioEntry


def _entry(
    case_id: str,
    *,
    urgent: bool = False,
    lawsuit: bool = False,
    incomes: int = 2,
    debts: int = 3,
    evidence: int = 1,
    status: str = "submitted",
) -> CasePortfolioEntry:
    return CasePortfolioEntry(
        case_id=case_id,
        client_name=f"Client {case_id}",
        status=status,  # type: ignore[arg-type]
        owner_user_id=f"owner-{case_id}",
        urgent_collection_action=urgent,
        has_collection_lawsuit=lawsuit,
        income_count=incomes,
        expense_count=4,
        debt_count=debts,
        asset_count=1,
        evidence_count=evidence,
        updated_at=datetime(2026, 8, 8, tzinfo=UTC),
    )


HEALTHY = _entry("case-healthy")
URGENT_FLAG = _entry("case-urgent", urgent=True)
LAWSUIT = _entry("case-lawsuit", lawsuit=True)
THIN = _entry("case-thin", incomes=0, debts=0, evidence=0, status="collecting_information")


def _tools(*entries: CasePortfolioEntry) -> PortfolioTools:
    return PortfolioTools(list(entries))


class TestScopeCannotBeWidened:
    def test_no_tool_accepts_an_authorization_parameter(self) -> None:
        """The signatures are the security property.

        Checked structurally rather than behaviourally: a behavioural test only
        covers the arguments someone thought to try, while a signature with no
        such parameter cannot be talked around at all.
        """
        forbidden = {"case_id", "attorney_id", "owner_user_id", "user_id", "role"}
        for name in ("list_assigned_cases", "list_cases_needing_attention", "list_incomplete_cases"):
            raw = getattr(PortfolioTools, name)
            func = getattr(raw, "_tool_func", None) or getattr(raw, "__wrapped__", raw)
            assert not set(inspect.signature(func).parameters) & forbidden

    def test_a_tool_only_ever_reports_what_it_was_constructed_with(self) -> None:
        tools = _tools(HEALTHY)
        reported = {case["case_id"] for case in tools.list_assigned_cases()["cases"]}
        assert reported == {"case-healthy"}


class TestTriageSignals:
    def test_it_lists_every_authorized_case(self) -> None:
        result = _tools(HEALTHY, URGENT_FLAG, THIN).list_assigned_cases()
        assert result["case_count"] == 3

    def test_attention_selects_only_cases_carrying_a_signal(self) -> None:
        result = _tools(HEALTHY, URGENT_FLAG, LAWSUIT).list_cases_needing_attention()
        assert {case["case_id"] for case in result["cases"]} == {"case-urgent", "case-lawsuit"}

    def test_a_lawsuit_outranks_a_client_reported_flag(self) -> None:
        """One is a filed proceeding with a clock of its own; the other is the
        client's assessment. Ordering them the other way would put the case with
        a deadline second."""
        result = _tools(URGENT_FLAG, LAWSUIT).list_cases_needing_attention()
        assert result["cases"][0]["case_id"] == "case-lawsuit"

    def test_incomplete_selects_cases_waiting_on_the_client(self) -> None:
        result = _tools(HEALTHY, THIN).list_incomplete_cases()
        assert {case["case_id"] for case in result["cases"]} == {"case-thin"}

    def test_an_empty_portfolio_answers_safely(self) -> None:
        """Nothing to review is a normal state. A tool that raised here would
        make the model narrate an error to an attorney whose queue is simply
        clear."""
        for result in (
            _tools().list_assigned_cases(),
            _tools().list_cases_needing_attention(),
            _tools().list_incomplete_cases(),
        ):
            assert result["status"] == "success"
            assert result["case_count"] == 0
            assert result["cases"] == []


class TestResultsCarryNoCaseDetail:
    def test_a_summary_has_no_financial_figure(self) -> None:
        summary = _tools(HEALTHY).list_assigned_cases()["cases"][0]
        forbidden = {"balance", "total_debt", "monthly_income", "cash_flow", "incomes", "debts"}
        assert not set(summary) & forbidden

    def test_a_summary_names_the_case_well_enough_to_open_it(self) -> None:
        summary = _tools(HEALTHY).list_assigned_cases()["cases"][0]
        assert summary["case_id"] == "case-healthy"
        assert summary["client_name"]
        assert summary["status"]
