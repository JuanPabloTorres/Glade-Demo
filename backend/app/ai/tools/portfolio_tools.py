"""
Attorney-scoped tools: reasoning *across* cases rather than inside one.

The security shape is the same one `CaseTools` uses, for the same reason. No tool
here takes a case id, an attorney id, or any other authorization parameter. The
collection is closed over at construction from what
`CaseAccessService.attorney_portfolio` already returned, so a model may call
every tool in any order with any arguments and still cannot widen what it sees.

That is why this is a separate class rather than a `case_id` parameter added to
`CaseTools`. Passing an identifier the model controls — even one a service
re-checks — puts a model-authored string on the authorization path. Two tool sets
with two closed scopes removes the class of bug instead of validating against it.

These tools rank and count. They do not read a case: `CasePortfolioEntry` carries
no balances and no incomes, so an attorney asking "which of these needs
attention" never puts three clients' finances into a model's context to find out.
When the answer is "that one", the case-level tools take over.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from strands import tool

if TYPE_CHECKING:
    from app.domain.entities import CasePortfolioEntry


class PortfolioTools:
    def __init__(self, entries: list[CasePortfolioEntry]) -> None:
        self._entries = entries

    def _summarize(self, entry: CasePortfolioEntry) -> dict[str, Any]:
        return {
            "case_id": entry.case_id,
            "client_name": entry.client_name,
            "status": entry.status,
            "urgent_collection_action": entry.urgent_collection_action,
            "has_collection_lawsuit": entry.has_collection_lawsuit,
            "recorded_incomes": entry.income_count,
            "recorded_expenses": entry.expense_count,
            "recorded_debts": entry.debt_count,
            "recorded_assets": entry.asset_count,
            "documents_on_file": entry.evidence_count,
            "last_updated": entry.updated_at.isoformat(),
        }

    @tool
    def list_assigned_cases(self) -> dict[str, Any]:
        """List every case this attorney is authorized to review.

        Use for "what cases do I have", "which cases are assigned to me". The
        list is already scoped to this attorney before you receive it — you
        cannot request a case that is not in it.
        """
        return {
            "status": "success",
            "case_count": len(self._entries),
            "cases": [self._summarize(entry) for entry in self._entries],
        }

    @tool
    def list_cases_needing_attention(self) -> dict[str, Any]:
        """List the cases carrying an urgency signal, most urgent first.

        Urgency here is recorded fact, not judgement: a client-reported urgent
        collection action, or a debt with an active collection lawsuit. Report
        which cases carry these and why; do not infer urgency from anything else.
        """
        urgent = [
            entry
            for entry in self._entries
            if entry.urgent_collection_action or entry.has_collection_lawsuit
        ]
        # A lawsuit outranks a self-reported urgency flag: one is a filed
        # proceeding with its own clock, the other is a client's assessment.
        urgent.sort(
            key=lambda entry: (entry.has_collection_lawsuit, entry.urgent_collection_action),
            reverse=True,
        )
        return {
            "status": "success",
            "case_count": len(urgent),
            "cases": [self._summarize(entry) for entry in urgent],
        }

    @tool
    def list_incomplete_cases(self) -> dict[str, Any]:
        """List cases still missing the financial information a review needs.

        These are waiting on the *client*, not on the attorney — the distinction
        an attorney triaging a queue actually needs. A case with no recorded
        income, debts or documents cannot be reviewed yet.
        """
        incomplete = [
            entry
            for entry in self._entries
            if entry.income_count == 0 or entry.debt_count == 0 or entry.evidence_count == 0
        ]
        return {
            "status": "success",
            "case_count": len(incomplete),
            "cases": [self._summarize(entry) for entry in incomplete],
        }
