"""
The analysis service generates prose, and that prose reaches a human.

`CaseAnalysisDto.next_steps` becomes the assistant's suggested-action labels
and `warnings` becomes `AssistantResponse.warnings`, so a Spanish-only
generator meant an English session received Spanish controls — the second half
of the language leak the live agent run recorded
(`changes/chat-modal-centered.md` §3, defect 3).
"""

from __future__ import annotations

from app.ai.providers.rule_based import _section_for_missing
from app.schemas.bankruptcy import (
    BankruptcyCaseDto,
    DebtEntryDto,
    ExpenseEntryDto,
    HouseholdDto,
    IncomeEntryDto,
)
from app.services.analysis_copy import _COPY
from app.services.bankruptcy_service import BankruptcyAnalysisService


def _populated_case() -> BankruptcyCaseDto:
    """A case with real figures, so the arithmetic has something to compare."""
    return BankruptcyCaseDto(
        id="case-populated",
        owner_user_id="user-1",
        client_name="Elena Rivera",
        client_email="elena@example.com",
        status="collecting_information",
        client_goal="Detener el desorden financiero.",
        household=HouseholdDto(marital_status="single", housing_status="rent"),
        incomes=[
            IncomeEntryDto(
                id="income-1",
                category="wages",
                source="Employer",
                gross_amount=1200,
                net_amount=950,
                frequency="biweekly",
            )
        ],
        expenses=[
            ExpenseEntryDto(
                id="expense-1", category="housing", description="Rent", monthly_amount=1100
            )
        ],
        debts=[
            DebtEntryDto(
                id="debt-1",
                creditor="Example Card",
                debt_type="unsecured",
                description="Credit card",
                balance=18000,
                monthly_payment=450,
            )
        ],
        assets=[],
        evidence=[],
    )


def _empty_case() -> BankruptcyCaseDto:
    """A case with nothing filled in, so every missing-item branch fires."""
    return BankruptcyCaseDto(
        id="case-empty",
        owner_user_id="user-1",
        client_name="Elena Rivera",
        client_email="elena@example.com",
        status="draft",
        household=HouseholdDto(),
        incomes=[],
        expenses=[],
        debts=[],
        assets=[],
        evidence=[],
    )


class TestCatalogueIsComplete:
    def test_every_entry_has_both_languages(self) -> None:
        # A missing translation is invisible until a user hits that branch, so
        # it is asserted here rather than discovered in an English session.
        for key, translations in _COPY.items():
            assert set(translations) == {"es", "en"}, f"{key} is missing a language"
            assert all(text.strip() for text in translations.values()), f"{key} has empty copy"


class TestGeneratedCopyFollowsTheSession:
    def test_missing_items_are_english_for_an_english_session(self) -> None:
        analysis = BankruptcyAnalysisService().analyze(_empty_case(), language="en")

        assert "Income sources" in analysis.missing_items
        assert "Fuentes de ingreso" not in analysis.missing_items

    def test_next_steps_are_english_for_an_english_session(self) -> None:
        # These are the strings the degraded path turns into `ask` action
        # labels, which is exactly where the leak was visible.
        analysis = BankruptcyAnalysisService().analyze(_empty_case(), language="en")

        assert all(not step.startswith("Completar") for step in analysis.next_steps)
        assert any(step.startswith("Complete:") for step in analysis.next_steps)

    def test_spanish_is_still_the_default_for_callers_that_do_not_ask(self) -> None:
        analysis = BankruptcyAnalysisService().analyze(_empty_case())

        assert "Fuentes de ingreso" in analysis.missing_items

    def test_the_figures_are_identical_in_both_languages(self) -> None:
        # Language decides the prose and nothing else.
        case = _populated_case()
        spanish = BankruptcyAnalysisService().analyze(case, language="es")
        english = BankruptcyAnalysisService().analyze(case, language="en")

        assert spanish.monthly_cash_flow == english.monthly_cash_flow
        assert spanish.total_debt == english.total_debt
        assert spanish.completion_score == english.completion_score
        assert spanish.evidence_score == english.evidence_score


class TestSectionRoutingSurvivesTranslation:
    """
    `_section_for_missing` reads the item's own text. Once those items are
    generated in English, a Spanish-only keyword list would route every English
    session to "overview" — a link that still renders and always goes to the
    wrong place.
    """

    def test_english_missing_items_route_to_the_same_sections_as_spanish(self) -> None:
        pairs = [
            ("Fuentes de ingreso", "Income sources"),
            ("Gastos mensuales", "Monthly expenses"),
            ("Lista de acreedores y deudas", "Creditor and debt list"),
            ("Bienes y activos", "Property and assets"),
            ("Documentos de respaldo", "Supporting documents"),
            ("Situación de vivienda", "Housing situation"),
            ("Estado civil y composición del hogar", "Marital status and household composition"),
        ]
        for spanish, english in pairs:
            assert _section_for_missing(spanish) == _section_for_missing(english), (
                f"{english!r} routes elsewhere than {spanish!r}"
            )

    def test_no_english_missing_item_falls_through_to_overview(self) -> None:
        analysis = BankruptcyAnalysisService().analyze(_empty_case(), language="en")
        routed = {item: _section_for_missing(item) for item in analysis.missing_items}

        # "The client's main goal and urgency" legitimately has no section of
        # its own; everything else must resolve to a real one.
        unrouted = [item for item, section in routed.items() if section == "overview"]
        assert unrouted == ["The client's main goal and urgency"], routed


class TestTheAssistantHandsBackTheSessionLanguage:
    """
    The end the defect was actually observed at: not the analysis service, but
    the labels a user reads. The degraded path projects `next_steps` onto `ask`
    actions (`AgentRuntime._draft_as_answer`), so this is what a client with an
    English session actually receives.
    """

    def test_an_english_session_gets_english_action_labels_and_warnings(self) -> None:
        from app.ai.runtime import AgentRuntime
        from app.core.config import Settings
        from app.services.case_context_builder import CaseContextBuilder
        from app.services.documents.index import CaseDocumentIndex

        case = _empty_case()
        analysis = BankruptcyAnalysisService().analyze(case, language="en")
        context = CaseContextBuilder().build(case, analysis, "client", "en-US")

        response = AgentRuntime(
            settings=Settings(ai_provider="rule_based"),
            document_index=CaseDocumentIndex(),
        ).execute(context=context, message="What am I missing?")

        assert response.degraded is True, "no model is configured in this test"
        assert response.language == "en"

        labels = [action.label for action in response.actions]
        assert labels, "the degraded path must still offer actions"
        # Every label the user can click is in their language. Before 4.2.0 the
        # `ask` labels came straight from Spanish `next_steps`.
        assert not any("Completar" in label or "Guardar" in label for label in labels), labels
        assert any("Complete:" in label for label in labels), labels
