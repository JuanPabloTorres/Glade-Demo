from __future__ import annotations

from collections.abc import Sequence

from app.core.i18n import resolve_language
from app.domain.entities import AIConversationMessageEntity, TimelineEventEntity
from app.schemas.assistant import CaseContextDto, ConversationTurnDto, TimelineEventDto
from app.schemas.bankruptcy import BankruptcyCaseDto, CaseAnalysisDto, UserRole


class CaseContextBuilder:
    """
    Reduces a full `BankruptcyCaseDto` + its computed `CaseAnalysisDto` (plus
    already-fetched timeline/conversation/retrieval slices — this builder
    never talks to a repository or the RAG index itself, it only shapes what
    the caller hands it) into the typed, audited `CaseContextDto` that AI
    providers actually receive — never the raw case (master instruction
    §6.2). See `CaseContextDto`'s docstring for how the timeline/
    conversation/retrieval gaps were closed.
    """

    def build(
        self,
        case: BankruptcyCaseDto,
        analysis: CaseAnalysisDto,
        role: UserRole,
        locale: str,
        *,
        timeline: Sequence[TimelineEventEntity] = (),
        recent_conversation: Sequence[AIConversationMessageEntity] = (),
        retrieved_documents: Sequence[str] = (),
    ) -> CaseContextDto:
        return CaseContextDto(
            case_id=case.id,
            role=role,
            locale=locale,
            language=resolve_language(locale),
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
            timeline=[
                TimelineEventDto(
                    event_type=event.event_type.value,
                    message=event.message,
                    created_at=event.created_at.isoformat(),
                )
                for event in timeline
            ],
            recent_conversation=[
                ConversationTurnDto(role=turn.role.value, message=turn.message)
                for turn in recent_conversation
            ],
            retrieved_documents=list(retrieved_documents),
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
