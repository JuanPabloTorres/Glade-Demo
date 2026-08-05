from __future__ import annotations

from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto, CaseAnalysisDto, UserRole


class CaseContextBuilder:
    """
    Reduces a full `BankruptcyCaseDto` + its computed `CaseAnalysisDto` into
    the typed, audited `CaseContextDto` that AI providers actually receive
    — never the raw case (master instruction §6.2). See CaseContextDto's
    docstring for the one documented gap (no timeline in context today).
    """

    def build(
        self,
        case: BankruptcyCaseDto,
        analysis: CaseAnalysisDto,
        role: UserRole,
    ) -> CaseContextDto:
        return CaseContextDto(
            case_id=case.id,
            role=role,
            status=case.status,
            client_name=case.client_name,
            objective=case.client_goal,
            household_summary=self._household_summary(case),
            monthly_gross_income=analysis.monthly_gross_income,
            monthly_net_income=analysis.monthly_net_income,
            monthly_expenses=analysis.monthly_expenses,
            monthly_cash_flow=analysis.monthly_cash_flow,
            total_debt=analysis.total_debt,
            total_asset_value=analysis.total_asset_value,
            completion_score=analysis.completion_score,
            evidence_score=analysis.evidence_score,
            missing_items=analysis.missing_items,
            warnings=analysis.warnings,
            discussion_points=analysis.discussion_points,
            chapter_7_questions=analysis.chapter_7_questions,
            chapter_13_questions=analysis.chapter_13_questions,
            next_steps=analysis.next_steps,
            pending_documents=[
                item.name for item in case.evidence if item.status == "requested"
            ],
            # Redaction by role (§6.2/§8.2): a client never sees the
            # attorney's private notes verbatim through the AI context.
            attorney_notes=case.attorney_notes if role == "attorney" else None,
        )

    def _household_summary(self, case: BankruptcyCaseDto) -> str:
        household = case.household
        parts = [f"{household.household_size} persona(s) en el hogar"]
        if household.dependents:
            parts.append(f"{household.dependents} dependiente(s)")
        if household.marital_status:
            parts.append(f"estado civil: {household.marital_status}")
        if household.housing_status:
            parts.append(f"vivienda: {household.housing_status}")
        if household.filing_jointly:
            parts.append("considera presentación conjunta")
        if household.urgent_collection_action:
            parts.append("cobro urgente reportado")
        if household.recent_property_transfer:
            parts.append("transferencia de propiedad reciente")
        return "; ".join(parts) + "."
