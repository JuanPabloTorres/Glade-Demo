"""
The conversations the demo actually has, asserted on properties rather than prose.

Three layers, because "the answer was weak" has three different causes and
fixing the wrong one is how prompts get longer without getting better:

1. **Grounding** — did the right specialist run the right tool, and did the
   facts the answer needs actually reach the model? `FakeProviderModel.transcript`
   carries tool results, so this distinguishes *the model answered badly* from
   *the model was never told*. That distinction is the reason this file exists.
2. **Deterministic answers** — the fallback's prose is ours, so it can be
   asserted semantically. Every default deployment runs this path, and it used
   to return one sentence for four different document questions.
3. **Safety** — the boundaries that must survive any quality work.

What is deliberately NOT asserted: the model's wording. `FakeProviderModel`
returns a scripted string, so an assertion on it would be an assertion on the
test's own fixture. Prose quality is scored against a live provider and recorded
in the change fragment; see §36 of the request and `docs/evidence/`.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.ai.providers.rule_based import RuleBasedProvider
from app.core.i18n import Language
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto, EvidenceItemDto, HouseholdDto
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder
from tests.test_agentic_multi_turn import agentic, converse  # noqa: F401 - fixture import

DEMO_CASE = "case-elena-demo"

# Two documents on file: a pay stub and a creditor statement. That makes
# `evidence.pay_stubs` and `evidence.creditor_statements` satisfied and leaves
# the rest uncovered — the mixed state every interesting document question needs.
HELD = [
    EvidenceItemDto(id="ev-1", evidence_type="pay-stubs", name="paystub-june.pdf", status="received"),
    EvidenceItemDto(
        id="ev-2", evidence_type="creditor-statement", name="card-statement.pdf", status="received"
    ),
]


def _case(**overrides: Any) -> BankruptcyCaseDto:
    fields: dict[str, Any] = {
        "id": DEMO_CASE,
        "owner_user_id": "client-demo",
        "client_name": "Elena Rivera",
        "client_email": "client@freshstart.demo",
        "status": "collecting_information",
        "client_goal": "Organizar mis finanzas.",
        "household": HouseholdDto(marital_status="single", housing_status="rent"),
        "evidence": HELD,
    }
    fields.update(overrides)
    return BankruptcyCaseDto(**fields)


def _context(role: str = "client", locale: str = "es-PR", **overrides: Any) -> CaseContextDto:
    case = _case(**overrides)
    language: Language = "en" if locale.startswith("en") else "es"
    analysis = BankruptcyAnalysisService().analyze(case, language=language)
    return CaseContextBuilder().build(case, analysis, role, locale)  # type: ignore[arg-type]


def _payload(message: str, *, locale: str = "es-PR", role: str = "client") -> dict[str, Any]:
    """The same case the grounding layer uses, over the wire."""
    return {
        "assistant_scope": "case",
        "case": _case().model_dump(mode="json"),
        "message": message,
        "role": role,
        "locale": locale,
    }


# ---------------------------------------------------------------------------
# 1. Grounding: did the facts reach the model?
# ---------------------------------------------------------------------------


class TestEvidenceGroundingReachesTheModel:
    """`get_evidence_status` is the tool the whole evidence story rests on.

    Before it existed the only document tool returned `pending_documents` —
    attorney *requests*, empty on almost every case — so "¿qué documentos me
    faltan?" was answered "no hay documentos pendientes": true about requests,
    useless about evidence.
    """

    def test_the_three_document_concepts_are_distinct_and_correct(self) -> None:
        from app.ai.tools.case_tools import CaseTools
        from app.services.documents.index import CaseDocumentIndex

        tools = CaseTools(context=_context(), document_index=CaseDocumentIndex())
        result = tools.get_evidence_status()

        held = {item["name"] for item in result["held_documents"]}
        assert held == {"paystub-june.pdf", "card-statement.pdf"}

        satisfied = set(result["satisfied_requirements"])
        unsatisfied = set(result["unsatisfied_requirements"])

        # The property an answer depends on: a requirement is in exactly one
        # list. Recommending a covered requirement as missing is the single most
        # visible way this feature fails.
        assert not satisfied & unsatisfied
        assert "Talones de pago de los últimos 60 días" in satisfied
        assert "Estados de cuenta de acreedores" in satisfied
        assert "Identificación vigente" in unsatisfied
        assert "Estados bancarios recientes" in unsatisfied

    def test_the_evidence_score_is_the_servers_not_a_recount(self) -> None:
        context = _context()
        from app.ai.tools.case_tools import CaseTools
        from app.services.documents.index import CaseDocumentIndex

        tools = CaseTools(context=context, document_index=CaseDocumentIndex())
        result = tools.get_evidence_status()

        assert result["evidence_score"] == context.evidence_score

    def test_a_client_context_carries_no_attorney_action_vocabulary(self) -> None:
        assert _context(role="client").attorney_actions == []
        assert _context(role="attorney").attorney_actions != []

    def test_the_attorney_action_tool_names_real_controls(self) -> None:
        from app.ai.attorney_actions import ATTORNEY_ACTION_IDS
        from app.ai.tools.case_tools import CaseTools
        from app.services.documents.index import CaseDocumentIndex

        tools = CaseTools(context=_context(role="attorney"), document_index=CaseDocumentIndex())
        result = tools.get_attorney_actions()

        offered = {action["action_id"] for action in result["actions"]}
        assert offered == ATTORNEY_ACTION_IDS
        # Every entry says what it does. An action list with no explanation is
        # a menu, and the assistant already has one of those on screen.
        assert all(action["does"].strip() for action in result["actions"])


@pytest.mark.parametrize(
    ("question", "prefers", "expected_tool"),
    [
        ("¿Qué sabes de mi caso?", ["case_agent", "get_case_summary"], "get_case_summary"),
        ("¿Qué me falta?", ["case_agent", "get_missing_information"], "get_missing_information"),
        (
            "¿Qué documentos debería conseguir primero?",
            ["documents_agent", "get_evidence_status"],
            "get_evidence_status",
        ),
        ("¿Cuánto debo?", ["analysis_agent", "get_financial_snapshot"], "get_financial_snapshot"),
    ],
)
def test_each_client_golden_question_reaches_an_authoritative_tool(
    client: TestClient,
    agentic: Any,  # noqa: F811
    question: str,
    prefers: list[str],
    expected_tool: str,
) -> None:
    """A factual question answered with no tool call is not grounded, whatever
    the prose looks like."""
    (turn,) = converse(
        client,
        agentic,
        role="client",
        case_id=DEMO_CASE,
        locale="es-PR",
        scope="case",
        case=_case().model_dump(mode="json"),
        turns=[(question, prefers, "Respuesta.")],
    )

    assert turn.body["degraded"] is False
    assert turn.model.data_tools_invoked == [expected_tool]


def test_the_priority_question_puts_uncovered_requirements_in_front_of_the_model(
    client: TestClient, agentic: Any  # noqa: F811
) -> None:
    """The grounding assertion that matters most.

    The model can only prioritize documents it was told about, and it can only
    avoid recommending a covered requirement if it was told which are covered.
    Asserting on the transcript is what separates "the model answered badly"
    from "the model was never given the facts".
    """
    (turn,) = converse(
        client,
        agentic,
        role="client",
        case_id=DEMO_CASE,
        locale="es-PR",
        scope="case",
        case=_case().model_dump(mode="json"),
        turns=[
            (
                "¿Qué documentos debería conseguir primero?",
                ["documents_agent", "get_evidence_status"],
                "Empieza por la identificación.",
            )
        ],
    )

    transcript = turn.model.transcript
    assert "unsatisfied_requirements" in transcript
    assert "satisfied_requirements" in transcript
    # A requirement nothing covers, and a document the case actually holds.
    assert "Identificaci" in transcript
    assert "paystub-june.pdf" in transcript


# ---------------------------------------------------------------------------
# 2. Deterministic answers: four questions, four answers
# ---------------------------------------------------------------------------


class TestDeterministicEvidenceAnswers:
    """Every default deployment runs this path, and it used to answer "no hay
    documentos pendientes" to all four of these."""

    def _answer(self, message: str, locale: str = "es-PR") -> str:
        return RuleBasedProvider().generate(context=_context(locale=locale), message=message).message

    def test_the_four_document_questions_get_four_different_answers(self) -> None:
        answers = [
            self._answer("¿Qué documentos tengo?"),
            self._answer("¿Qué documentos me faltan?"),
            self._answer("¿Qué documento consigo primero?"),
            self._answer("Háblame de la evidencia del caso"),
        ]
        assert len(set(answers)) == 4, answers

    def test_what_i_have_names_the_documents_on_file(self) -> None:
        answer = self._answer("¿Qué documentos tengo?")
        assert "paystub-june.pdf" in answer

    def test_what_is_missing_names_an_uncovered_requirement_only(self) -> None:
        answer = self._answer("¿Qué documentos me faltan?")
        assert "Identificación vigente" in answer
        # The covered ones must not appear as missing — the failure a client
        # notices immediately, because they just uploaded that document.
        assert "Talones de pago de los últimos 60 días" not in answer

    def test_which_first_gives_an_order_not_a_list(self) -> None:
        answer = self._answer("¿Cuál documento consigo primero?")
        assert "1." in answer and "2." in answer

    def test_the_acceptance_conversations_first_and_last_questions_are_recognized(self) -> None:
        """The two the golden run caught falling through to the generic default.

        "¿Qué sabes de mi caso?" opens the demo's acceptance script and "¿Y
        cuánto debo?" closes it; both were answered "el próximo paso es
        completar gastos mensuales", because neither phrase shared a stem with
        any keyword set.
        """
        opening = self._answer("¿Qué sabes de mi caso?")
        assert "% completo" in opening
        assert "Meta declarada" in opening

        debt = self._answer("¿Y cuánto debo?")
        assert "deuda total registrada" in debt.casefold()

    def test_it_answers_in_english_for_an_english_session(self) -> None:
        answer = self._answer("Which document should I get first?", locale="en-US")
        assert "Valid photo ID" in answer
        assert "Identificación" not in answer

    def test_a_case_with_full_coverage_says_so_instead_of_inventing_a_gap(self) -> None:
        every_type = [
            EvidenceItemDto(id=f"ev-{index}", evidence_type=slug, name=f"{slug}.pdf", status="received")
            for index, slug in enumerate(
                (
                    "government-id",
                    "pay-stubs",
                    "bank-statement",
                    "tax-return-or-transcript",
                    "creditor-statement",
                    "lease-agreement",
                    "vehicle-loan-statement",
                    "credit-counseling-certificate",
                )
            )
        ]
        context = _context(evidence=every_type)
        answer = RuleBasedProvider().generate(context=context, message="¿Qué me falta de evidencia?")

        assert "No falta evidencia" in answer.message
        assert answer.intent == "documents_complete"


# ---------------------------------------------------------------------------
# 3. Multi-turn and topic switching
# ---------------------------------------------------------------------------


class TestMultiTurn:
    def test_why_those_continues_on_the_documents_just_named(
        self, client: TestClient, agentic: Any  # noqa: F811
    ) -> None:
        first, second = converse(
            client,
            agentic,
            role="client",
            case_id=DEMO_CASE,
            locale="es-PR",
            scope="case",
            case=_case().model_dump(mode="json"),
            turns=[
                (
                    "¿Qué documentos debería conseguir primero?",
                    ["documents_agent", "get_evidence_status"],
                    "Primero la identificación vigente y el estado bancario.",
                ),
                (
                    "¿Por qué esos?",
                    ["documents_agent", "get_evidence_status"],
                    "Porque ningún documento cubre todavía esos dos requisitos.",
                ),
            ],
        )

        assert second.body["degraded"] is False
        # The second turn can only continue if it was told what the first said.
        assert "identificación vigente y el estado bancario" in second.prompt
        assert "¿Qué documentos debería conseguir primero?" in second.prompt

    def test_a_topic_switch_moves_off_the_evidence_tools(
        self, client: TestClient, agentic: Any  # noqa: F811
    ) -> None:
        _, second = converse(
            client,
            agentic,
            role="client",
            case_id=DEMO_CASE,
            locale="es-PR",
            scope="case",
            case=_case().model_dump(mode="json"),
            turns=[
                (
                    "¿Qué documentos me faltan?",
                    ["documents_agent", "get_evidence_status"],
                    "Faltan cuatro.",
                ),
                (
                    "¿Y cuánto debo?",
                    ["analysis_agent", "get_financial_snapshot"],
                    "Debes $18,000.",
                ),
            ],
        )

        assert second.model.data_tools_invoked == ["get_financial_snapshot"]
        assert "get_evidence_status" not in second.model.data_tools_invoked


class TestAttorneyGolden:
    def test_which_cases_need_attention_uses_the_portfolio_tools(
        self, attorney_client: TestClient, agentic: Any  # noqa: F811
    ) -> None:
        (turn,) = converse(
            attorney_client,
            agentic,
            role="attorney",
            case_id=DEMO_CASE,
            locale="es-PR",
            scope="portfolio",
            turns=[
                (
                    "¿Cuáles de mis casos necesitan atención?",
                    ["portfolio_agent", "list_cases_needing_attention"],
                    "Miguel Santos, por demanda de cobro activa.",
                )
            ],
        )

        assert turn.model.data_tools_invoked == ["list_cases_needing_attention"]
        assert turn.body["degraded"] is False

    def test_what_should_i_do_next_reaches_the_real_action_vocabulary(
        self, attorney_client: TestClient, agentic: Any  # noqa: F811
    ) -> None:
        """The attorney asked what to do; the assistant should be able to name a
        control that exists rather than offering generic advice."""
        (turn,) = converse(
            attorney_client,
            agentic,
            role="attorney",
            case_id=DEMO_CASE,
            locale="es-PR",
            scope="case",
            case=_case().model_dump(mode="json"),
            turns=[
                (
                    "¿Qué debería hacer ahora en este caso?",
                    ["attorney_agent", "get_attorney_actions"],
                    "Solicita el estado bancario.",
                )
            ],
        )

        assert turn.model.data_tools_invoked == ["get_attorney_actions"]
        assert "Solicitar documento" in turn.model.transcript


# ---------------------------------------------------------------------------
# 4. Safety — unchanged by any of the above
# ---------------------------------------------------------------------------


class TestBoundariesSurviveTheQualityWork:
    def test_a_client_runtime_cannot_reach_the_attorney_action_tool(self) -> None:
        from app.ai.tools.case_tools import CaseTools, ToolAuthorizationError
        from app.services.documents.index import CaseDocumentIndex

        tools = CaseTools(context=_context(role="client"), document_index=CaseDocumentIndex())
        with pytest.raises(ToolAuthorizationError):
            tools.get_attorney_actions()

    def test_every_answer_still_carries_a_server_composed_disclaimer(
        self, client: TestClient, agentic: Any  # noqa: F811
    ) -> None:
        (turn,) = converse(
            client,
            agentic,
            role="client",
            case_id=DEMO_CASE,
            locale="es-PR",
            scope="case",
            case=_case().model_dump(mode="json"),
            turns=[("¿Qué documentos tengo?", ["documents_agent", "get_evidence_status"], "Dos.")],
        )

        assert turn.body["disclaimer"]
        assert "no es asesoramiento legal" in turn.body["disclaimer"]

    def test_an_eligibility_question_still_declines_and_raises_review(self) -> None:
        answer = RuleBasedProvider().generate(context=_context(), message="¿Califico para el capítulo 7?")

        assert answer.requires_attorney_review is True
