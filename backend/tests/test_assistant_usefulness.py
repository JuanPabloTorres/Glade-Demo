"""
Three defects a real transcript exposed, and what the panel owes a person.

The reported conversation: a client said "Hola", asked about documents, then
typed "2+2" — and got the documents answer again. The chips offered alongside
it read "Solicitar los documentos faltantes antes de discutir una estrategia.",
which is an instruction aimed at the user, not something anyone would type. And
the panel showed prose only, with none of the figures already sitting in the
case.
"""

from __future__ import annotations

import pytest

from app.ai.followups import follow_up_questions, summary_card_data
from app.ai.providers.rule_based import _detect_topic
from app.ai.runtime import AgentRuntime
from app.core.config import Settings
from app.schemas.assistant import ConversationTurnDto
from app.schemas.bankruptcy import (
    AssetEntryDto,
    BankruptcyCaseDto,
    DebtEntryDto,
    EvidenceItemDto,
    ExpenseEntryDto,
    HouseholdDto,
    IncomeEntryDto,
)
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder
from app.services.documents.index import CaseDocumentIndex

_AFTER_A_DOCUMENTS_QUESTION = [
    ConversationTurnDto(role="user", message="¿Qué documentos me faltan?"),
    ConversationTurnDto(role="assistant", message="No hay documentos pendientes."),
]


def _case() -> BankruptcyCaseDto:
    return BankruptcyCaseDto(
        id="case-usefulness",
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
        status="collecting_information",
        client_goal="Detener el desorden financiero.",
        household=HouseholdDto(marital_status="single", housing_status="rent", household_size=2),
        incomes=[
            IncomeEntryDto(
                id="i1",
                category="wages",
                source="Employer",
                gross_amount=1200,
                net_amount=950,
                frequency="biweekly",
            )
        ],
        expenses=[
            ExpenseEntryDto(id="e1", category="housing", description="Rent", monthly_amount=1100)
        ],
        debts=[
            DebtEntryDto(
                id="d1",
                creditor="Card",
                debt_type="unsecured",
                description="CC",
                balance=18000,
                monthly_payment=450,
            )
        ],
        assets=[
            AssetEntryDto(id="a1", category="vehicle", description="Sedan", estimated_value=9000)
        ],
        evidence=[
            EvidenceItemDto(
                id="ev1", name="paystub.pdf", evidence_type="pay-stubs", status="received"
            )
        ],
    )


def _answer(message: str, language: str = "es"):
    case = _case()
    locale = "es-PR" if language == "es" else "en-US"
    analysis = BankruptcyAnalysisService().analyze(case, language=language)  # type: ignore[arg-type]
    context = CaseContextBuilder().build(case, analysis, "client", locale)
    runtime = AgentRuntime(
        settings=Settings(ai_provider="rule_based"), document_index=CaseDocumentIndex()
    )
    return runtime.execute(context=context, message=message)


class TestAnUnrelatedMessageDoesNotInheritATopic:
    """Reported: "2+2" was answered with "No hay documentos pendientes en este
    expediente por ahora", because the previous turn had been about documents.

    Inheritance used to trigger on *any* message of four words or fewer. It now
    requires the message to actually be a continuation. Answering a question
    nobody asked, confidently, is worse than not recognizing the message.
    """

    @pytest.mark.parametrize("message", ["2+2", "gracias", "asdfgh", "cuanto es 5*3", "???"])
    def test_junk_inherits_nothing(self, message: str) -> None:
        assert _detect_topic(message.casefold(), _AFTER_A_DOCUMENTS_QUESTION) is None

    @pytest.mark.parametrize("message", ["¿y ahora?", "sí", "otra vez", "más"])
    def test_a_real_follow_up_still_inherits(self, message: str) -> None:
        assert _detect_topic(message.casefold(), _AFTER_A_DOCUMENTS_QUESTION) == "documents"

    def test_a_marker_attached_to_a_new_subject_does_not_inherit(self) -> None:
        # "sí" opens it, but the sentence plainly changes the subject.
        message = "sí, pero ¿qué pasa con mi carro?"
        assert _detect_topic(message.casefold(), _AFTER_A_DOCUMENTS_QUESTION) is None

    def test_the_reported_turn_no_longer_repeats_the_previous_answer(self) -> None:
        documents = _answer("¿Qué documentos me faltan?")
        nonsense = _answer("2+2")

        assert nonsense.message != documents.message


class TestChipsAreQuestionsAPersonWouldAsk:
    """Reported: the chips read "Solicitar los documentos faltantes antes de
    discutir una estrategia." An `ask` label is sent verbatim as the user's next
    message, so those chips made the user issue instructions to themselves.
    """

    def test_every_chip_is_phrased_as_a_question(self) -> None:
        chips = [
            action.label
            for action in _answer("¿Qué documentos me faltan?").actions
            if action.action_type == "ask"
        ]

        assert chips
        assert all(chip.endswith("?") for chip in chips), chips

    def test_no_chip_is_an_instruction_lifted_from_next_steps(self) -> None:
        chips = [action.label for action in _answer("Hola").actions if action.action_type == "ask"]

        for imperative in ("Solicitar", "Programar", "Completar", "Revisar", "Enviar", "Guardar"):
            assert not any(chip.startswith(imperative) for chip in chips), chips

    def test_the_chips_follow_the_topic_that_was_answered(self) -> None:
        documents = follow_up_questions("documents_status", "es")
        debts = follow_up_questions("debts_summary", "es")

        assert documents != debts
        assert any("documento" in question.casefold() for question in documents)
        assert any("deuda" in question.casefold() for question in debts)

    def test_an_unknown_intent_still_gets_something_worth_asking(self) -> None:
        assert len(follow_up_questions("no_such_intent", "es")) == 3

    def test_chips_follow_the_session_language(self) -> None:
        chips = [
            action.label
            for action in _answer("What documents am I missing?", language="en").actions
            if action.action_type == "ask"
        ]

        assert chips
        assert not any("¿" in chip for chip in chips), chips


class TestThePanelShowsTheCaseFigures:
    """Reported: "el panel no muestra información relevante".

    The agent path could emit cards and the deterministic path could not, which
    is backwards — the deterministic path is what every default deployment runs.
    """

    def test_every_deterministic_answer_carries_a_summary_card(self) -> None:
        response = _answer("Hola")

        assert response.degraded is True
        assert len(response.cards) == 1
        assert response.cards[0].card_type == "case_summary"

    def test_the_card_reports_the_real_figures(self) -> None:
        case = _case()
        analysis = BankruptcyAnalysisService().analyze(case, language="es")
        context = CaseContextBuilder().build(case, analysis, "client", "es-PR")

        _title, data = summary_card_data(context, "es")

        # $18,000 of debt and $9,000 of assets are what this case holds. A card
        # that disagreed with the workspace behind it would be worse than none.
        assert data["Deuda total"] == "$18,000.00"
        assert data["Bienes"] == "$9,000.00"
        assert data["Flujo mensual"] == f"${context.monthly_cash_flow:,.2f}"

    def test_the_card_speaks_the_session_language(self) -> None:
        case = _case()
        analysis = BankruptcyAnalysisService().analyze(case, language="en")
        context = CaseContextBuilder().build(case, analysis, "client", "en-US")

        title, data = summary_card_data(context, "en")

        assert title == "Case summary"
        assert "Total debt" in data
