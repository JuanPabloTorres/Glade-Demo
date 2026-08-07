from __future__ import annotations

from collections.abc import Iterable

import pandas as pd  # type: ignore[import-untyped]

from app.ai.contracts.assistant_response import AssistantResponse
from app.ai.runtime import AgentRuntime
from app.core.config import Settings
from app.core.i18n import Language, resolve_language, resolve_locale
from app.domain.value_objects import ConversationRole
from app.repositories.protocols import AIConversationRepositoryProtocol, CaseRepositoryProtocol
from app.schemas.bankruptcy import (
    BankruptcyCaseDto,
    CaseAnalysisDto,
    GuidanceRequestDto,
)
from app.services.analysis_copy import copy
from app.services.case_context_builder import CaseContextBuilder
from app.services.documents.index import CaseDocumentIndex, get_shared_case_document_index

# CaseContextDto.timeline / recent_conversation are kept small — this is
# context for the assistant to sound aware, not a full audit dump the
# provider has to wade through.
_TIMELINE_CONTEXT_LIMIT = 10
_CONVERSATION_CONTEXT_LIMIT = 6
_RETRIEVED_DOCUMENTS_TOP_K = 3

FREQUENCY_MULTIPLIERS = {
    "weekly": 52 / 12,
    "biweekly": 26 / 12,
    "semimonthly": 2,
    "monthly": 1,
    "quarterly": 1 / 3,
    "annual": 1 / 12,
}

COMMON_EVIDENCE = (
    "Identificación vigente",
    "Talones de pago de los últimos 60 días",
    "Estados bancarios recientes",
    "Planillas o transcripciones contributivas recientes",
    "Estados de cuenta de acreedores",
    "Contrato de arrendamiento o estado hipotecario",
    "Estado de préstamo de vehículo, si aplica",
    "Certificado de orientación crediticia, cuando corresponda",
)

# BankruptcyCaseDto.evidence[].evidence_type carries the canonical slug from
# frontend EVIDENCE_TYPES (config/bankruptcyOptions.ts), not display text.
# _evidence_matches keyword-matches against required_evidence's Spanish
# prose, so it needs the Spanish label back — kept in sync with
# frontend/src/locales/es/workspace.json's entryModal.evidenceTypes.
EVIDENCE_TYPE_LABELS = {
    "government-id": "Identificación vigente",
    "pay-stubs": "Talones de pago",
    "bank-statement": "Estado bancario",
    "tax-return-or-transcript": "Planilla o transcripción contributiva",
    "creditor-statement": "Estado de cuenta de acreedor",
    "lease-agreement": "Contrato de arrendamiento",
    "mortgage-statement": "Estado hipotecario",
    "vehicle-loan-statement": "Estado de préstamo de vehículo",
    "collection-or-lawsuit-notice": "Demanda, embargo o notificación de cobro",
    "property-or-valuation-document": "Documento de propiedad o valoración",
    "credit-counseling-certificate": "Certificado de orientación crediticia",
    "other-document": "Otro documento",
}


def _round_money(value: float) -> float:
    return round(value + 0.0, 2)


def _monthly_amount(amount: float, frequency: str) -> float:
    return amount * FREQUENCY_MULTIPLIERS.get(frequency, 1)


def _sum_frame(frame: pd.DataFrame, column: str) -> float:
    if frame.empty or column not in frame:
        return 0.0
    return float(frame[column].fillna(0).sum())


def _contains_any(values: Iterable[str], candidates: set[str]) -> bool:
    normalized = {value.strip().casefold() for value in values}
    return any(candidate.casefold() in normalized for candidate in candidates)


class BankruptcyAnalysisService:
    def analyze(self, case: BankruptcyCaseDto, *, language: Language = "es") -> CaseAnalysisDto:
        """Compute the case's figures and the prose that explains them.

        `language` decides the generated copy only — never the arithmetic.
        It defaults to Spanish so that existing callers and the demo data keep
        their current output; `BankruptcyGuidanceService` passes the session's
        resolved language, which is what stops an English session receiving
        Spanish suggested-action labels.
        """
        income_rows = []
        for item in case.incomes:
            gross_monthly = _monthly_amount(item.gross_amount, item.frequency)
            net_source = item.net_amount if item.net_amount is not None else item.gross_amount
            net_monthly = _monthly_amount(net_source, item.frequency)
            income_rows.append(
                {
                    "gross_monthly": gross_monthly,
                    "net_monthly": net_monthly,
                    "evidence": len(item.evidence_ids),
                }
            )
        income_frame = pd.DataFrame.from_records(income_rows)
        expense_frame = pd.DataFrame.from_records(
            [
                {
                    "monthly_amount": item.monthly_amount,
                    "evidence": len(item.evidence_ids),
                }
                for item in case.expenses
            ]
        )
        debt_frame = pd.DataFrame.from_records(
            [
                {
                    "type": item.debt_type,
                    "balance": item.balance,
                    "delinquent": item.delinquent_amount,
                    "lawsuit": item.collection_lawsuit,
                }
                for item in case.debts
            ]
        )
        asset_frame = pd.DataFrame.from_records(
            [
                {
                    "value": item.estimated_value,
                    "loan": item.loan_balance,
                }
                for item in case.assets
            ]
        )

        monthly_gross = _sum_frame(income_frame, "gross_monthly")
        monthly_net = _sum_frame(income_frame, "net_monthly")
        monthly_expenses = _sum_frame(expense_frame, "monthly_amount")
        monthly_cash_flow = monthly_net - monthly_expenses
        total_debt = _sum_frame(debt_frame, "balance")
        total_assets = _sum_frame(asset_frame, "value")
        asset_loans = _sum_frame(asset_frame, "loan")

        def debt_total(debt_type: str) -> float:
            if debt_frame.empty:
                return 0.0
            return float(
                debt_frame.loc[debt_frame["type"] == debt_type, "balance"].fillna(0).sum()
            )

        missing_items = self._missing_items(case, language)
        required_evidence = self._required_evidence(case)
        evidence_types = [item.evidence_type for item in case.evidence if item.status != "missing"]
        matched_evidence = sum(
            1
            for requirement in required_evidence
            if self._evidence_matches(requirement, evidence_types)
        )
        evidence_score = round((matched_evidence / max(len(required_evidence), 1)) * 100)

        completed_sections = [
            bool(case.client_name and case.client_email),
            bool(case.household.marital_status and case.household.housing_status),
            bool(case.incomes),
            bool(case.expenses),
            bool(case.debts),
            bool(case.assets),
            bool(case.evidence),
            bool(case.client_goal),
        ]
        completion_score = round((sum(completed_sections) / len(completed_sections)) * 100)

        warnings = self._warnings(case, monthly_cash_flow, total_debt, monthly_gross, language)
        discussion_points = self._discussion_points(case, monthly_cash_flow, language)
        next_steps = self._next_steps(case, missing_items, warnings, language)

        return CaseAnalysisDto(
            monthly_gross_income=_round_money(monthly_gross),
            monthly_net_income=_round_money(monthly_net),
            monthly_expenses=_round_money(monthly_expenses),
            monthly_cash_flow=_round_money(monthly_cash_flow),
            total_debt=_round_money(total_debt),
            secured_debt=_round_money(debt_total("secured")),
            priority_debt=_round_money(debt_total("priority")),
            unsecured_debt=_round_money(debt_total("unsecured")),
            total_asset_value=_round_money(total_assets),
            net_asset_value=_round_money(max(total_assets - asset_loans, 0)),
            completion_score=completion_score,
            evidence_score=evidence_score,
            missing_items=missing_items,
            warnings=warnings,
            discussion_points=discussion_points,
            chapter_7_questions=self._chapter_7_questions(case, monthly_cash_flow, language),
            chapter_13_questions=self._chapter_13_questions(case, monthly_cash_flow, language),
            required_evidence=required_evidence,
            next_steps=next_steps,
        )

    def _missing_items(self, case: BankruptcyCaseDto, language: Language) -> list[str]:
        missing: list[str] = []
        if not case.household.marital_status:
            missing.append(copy("missing.marital_status", language))
        if not case.household.housing_status:
            missing.append(copy("missing.housing", language))
        if not case.incomes:
            missing.append(copy("missing.income", language))
        if not case.expenses:
            missing.append(copy("missing.expenses", language))
        if not case.debts:
            missing.append(copy("missing.debts", language))
        if not case.assets:
            missing.append(copy("missing.assets", language))
        if not case.evidence:
            missing.append(copy("missing.evidence", language))
        if not case.client_goal:
            missing.append(copy("missing.goal", language))
        return missing

    def _required_evidence(self, case: BankruptcyCaseDto) -> list[str]:
        required = list(COMMON_EVIDENCE)
        if any(item.category.casefold() == "self-employment" for item in case.incomes):
            required.append("Registro de ingresos y gastos del negocio")
        if any(item.debt_type == "secured" for item in case.debts):
            required.append("Documentos de gravámenes y garantías")
        if any(item.collection_lawsuit for item in case.debts):
            required.append("Demanda, embargo o notificación de cobro")
        if case.household.recent_property_transfer:
            required.append("Documentos de transferencias recientes de propiedad")
        return required

    def _evidence_matches(self, requirement: str, evidence_types: list[str]) -> bool:
        key_words = {word for word in requirement.casefold().split() if len(word) > 4}
        labels = (EVIDENCE_TYPE_LABELS.get(evidence, evidence) for evidence in evidence_types)
        return any(
            key_words.intersection(label.casefold().split())
            for label in labels
        )

    def _warnings(
        self,
        case: BankruptcyCaseDto,
        monthly_cash_flow: float,
        total_debt: float,
        monthly_gross: float,
        language: Language,
    ) -> list[str]:
        warnings: list[str] = []
        if monthly_cash_flow < 0:
            warnings.append(copy("warning.deficit", language))
        if monthly_gross > 0 and total_debt > monthly_gross * 18:
            warnings.append(copy("warning.debt_to_income", language))
        if any(item.delinquent_amount > 0 for item in case.debts):
            warnings.append(copy("warning.delinquent", language))
        if any(item.collection_lawsuit for item in case.debts):
            warnings.append(copy("warning.lawsuit", language))
        if any(item.debt_type == "priority" for item in case.debts):
            warnings.append(copy("warning.priority_debt", language))
        if case.household.urgent_collection_action:
            warnings.append(copy("warning.urgent_collection", language))
        if case.household.recent_property_transfer:
            warnings.append(copy("warning.recent_transfer", language))
        return warnings

    def _discussion_points(
        self,
        case: BankruptcyCaseDto,
        monthly_cash_flow: float,
        language: Language,
    ) -> list[str]:
        points = [
            copy("discussion.spouse", language),
            copy("discussion.jurisdiction", language),
            copy("discussion.exemptions", language),
        ]
        if monthly_cash_flow > 0:
            points.append(copy("discussion.positive_cash_flow", language))
        else:
            points.append(copy("discussion.tight_cash_flow", language))
        if any(item.debt_type == "secured" for item in case.debts):
            points.append(copy("discussion.secured_intent", language))
        return points

    def _chapter_7_questions(
        self,
        case: BankruptcyCaseDto,
        monthly_cash_flow: float,
        language: Language,
    ) -> list[str]:
        questions = [
            copy("chapter7.means_test", language),
            copy("chapter7.exemptions", language),
            copy("chapter7.transfers", language),
        ]
        if monthly_cash_flow > 0:
            questions.append(copy("chapter7.disposable_income", language))
        if any(item.debt_type == "secured" for item in case.debts):
            questions.append(copy("chapter7.secured_debts", language))
        return questions

    def _chapter_13_questions(
        self,
        case: BankruptcyCaseDto,
        monthly_cash_flow: float,
        language: Language,
    ) -> list[str]:
        questions = [
            copy("chapter13.regular_income", language),
            copy("chapter13.arrears", language),
            copy("chapter13.estimated_payment", language),
        ]
        if monthly_cash_flow <= 0:
            questions.append(copy("chapter13.feasibility", language))
        if case.household.filing_jointly:
            questions.append(copy("chapter13.joint_filing", language))
        return questions

    def _next_steps(
        self,
        case: BankruptcyCaseDto,
        missing_items: list[str],
        warnings: list[str],
        language: Language,
    ) -> list[str]:
        if missing_items:
            return [
                copy("next.complete_item", language).format(item=missing_items[0]),
                copy("next.link_evidence", language),
                copy("next.save_questions", language),
            ]
        if case.status in {"draft", "collecting_information"}:
            return [
                copy("next.review_summary", language),
                copy("next.confirm_completeness", language),
                copy("next.submit", language),
            ]
        if warnings:
            return [
                copy("next.attorney_reviews_warnings", language),
                copy("next.request_documents", language),
                copy("next.schedule_consultation", language),
            ]
        return [
            copy("next.prepare_consultation", language),
            copy("next.validate_forms", language),
            copy("next.document_decision", language),
        ]


class BankruptcyGuidanceService:
    """
    Orchestrates one guidance turn: analyze → reduce to context → answer →
    persist.

    Since 4.0.0 (ADR 0002) the "answer" step is `AgentRuntime`, not a
    `BaseAIProvider`. The service no longer applies guardrails itself — the
    runtime does, on every path including its own fallback, so there is
    exactly one place where a message can reach the client unguarded and it
    is covered by `tests/test_agent_runtime.py`.
    """

    def __init__(
        self,
        settings: Settings,
        runtime: AgentRuntime | None = None,
        case_repository: CaseRepositoryProtocol | None = None,
        conversation_repository: AIConversationRepositoryProtocol | None = None,
        document_index: CaseDocumentIndex | None = None,
    ) -> None:
        self._analysis = BankruptcyAnalysisService()
        self._context_builder = CaseContextBuilder()
        # All three are optional (None-safe below) so this service stays
        # constructible/testable without a database — the router is the one
        # place that wires the real repositories in
        # (app.api.routers.bankruptcy.guide_case).
        self._cases = case_repository
        self._conversations = conversation_repository
        # Defaults to the same process-wide index DocumentIngestionService
        # writes into — see get_shared_case_document_index's docstring.
        self._document_index = document_index or get_shared_case_document_index()
        self._runtime = runtime or AgentRuntime(
            settings=settings, document_index=self._document_index
        )

    def guide(self, request: GuidanceRequestDto) -> AssistantResponse:
        # Resolved before the analysis, not after: the analysis generates the
        # prose the assistant hands back as suggested-action labels and
        # warnings, so it has to be produced in the session's language rather
        # than translated afterwards.
        locale = resolve_locale(request.locale)
        analysis = self._analysis.analyze(request.case, language=resolve_language(locale))

        # RAG retrieval (docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md
        # §4: "CaseDocumentIndex.search() is implemented but never called").
        # The query is the user's own message; search() is isolated per
        # case_id by construction (CaseDocumentIndex docstring), so this can
        # never surface another case's chunks.
        retrieved_documents = self._document_index.search(
            request.case.id, request.message, top_k=_RETRIEVED_DOCUMENTS_TOP_K
        )
        timeline = (
            self._cases.get_recent_timeline(request.case.id, limit=_TIMELINE_CONTEXT_LIMIT)
            if self._cases is not None
            else []
        )
        recent_conversation = (
            self._conversations.list_recent(request.case.id, limit=_CONVERSATION_CONTEXT_LIMIT)
            if self._conversations is not None
            else []
        )

        context = self._context_builder.build(
            request.case,
            analysis,
            request.role,
            locale,
            timeline=timeline,
            recent_conversation=recent_conversation,
            retrieved_documents=retrieved_documents,
        )
        # Guardrails, action allow-listing, the mandatory disclaimer and the
        # deterministic fallback all live inside the runtime — see
        # AgentRuntime.execute's docstring for the order they apply in.
        response = self._runtime.execute(context=context, message=request.message)

        if self._conversations is not None:
            # Persisted as two turns (schema is case_id/role/message/
            # created_at only, no separate "response" column — see
            # AIConversationModel docstring) so `list_recent` can read both
            # sides of the exchange back in chronological order next time.
            # The guarded message is what gets stored, so a later turn can
            # never read back a pre-guardrail phrasing as context.
            self._conversations.add_turn(request.case.id, ConversationRole.USER, request.message)
            self._conversations.add_turn(
                request.case.id, ConversationRole.ASSISTANT, response.message
            )

        return response
