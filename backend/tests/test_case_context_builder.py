"""
CaseContextBuilder acceptance tests (Block 9 plan): the context is reduced
and per-role (attorney notes redacted from clients), and building the same
case twice never leaks state between calls (a stand-in for "never leaks a
second case's data" since this service is stateless per call).
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.domain.entities import AIConversationMessageEntity, TimelineEventEntity
from app.domain.value_objects import ConversationRole, TimelineEventType
from app.schemas.bankruptcy import BankruptcyCaseDto
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder


def _case(**overrides: object) -> BankruptcyCaseDto:
    base: dict[str, object] = {
        "id": "case-a",
        "owner_user_id": "client-demo",
        "client_name": "Elena Rivera",
        "client_email": "client@freshstart.demo",
        "client_phone": "787-555-0100",
        "status": "attorney_review",
        "attorney_notes": "El cliente parece ocultar un ingreso adicional; confirmar en consulta.",
        "household": {
            "marital_status": "married",
            "household_size": 3,
            "dependents": 1,
            "housing_status": "rent",
            "municipality": "San Juan",
        },
        "evidence": [
            {"id": "e1", "evidence_type": "Identificación", "name": "id.pdf", "status": "requested"},
            {"id": "e2", "evidence_type": "Talón de pago", "name": "pay.pdf", "status": "received"},
        ],
    }
    base.update(overrides)
    return BankruptcyCaseDto(**base)


def test_attorney_notes_visible_to_attorney() -> None:
    case = _case()
    analysis = BankruptcyAnalysisService().analyze(case)
    context = CaseContextBuilder().build(case, analysis, "attorney", "es-PR")
    assert context.attorney_notes == case.attorney_notes


def test_attorney_notes_redacted_for_client() -> None:
    case = _case()
    analysis = BankruptcyAnalysisService().analyze(case)
    context = CaseContextBuilder().build(case, analysis, "client", "es-PR")
    assert context.attorney_notes is None


def test_household_summary_omits_raw_municipality_and_phone() -> None:
    case = _case()
    analysis = BankruptcyAnalysisService().analyze(case)
    context = CaseContextBuilder().build(case, analysis, "client", "es-PR")
    # The reduced context is a case summary, not the raw case — it must not
    # carry fields CaseContextDto doesn't declare (client_phone, municipality,
    # client_email) even though they exist on the source BankruptcyCaseDto.
    assert not hasattr(context, "client_phone")
    assert not hasattr(context, "client_email")
    assert "san juan" not in context.household_summary.casefold()


def test_pending_documents_reflects_requested_evidence_only() -> None:
    case = _case()
    analysis = BankruptcyAnalysisService().analyze(case)
    context = CaseContextBuilder().build(case, analysis, "client", "es-PR")
    assert context.pending_documents == ["id.pdf"]


def test_two_different_cases_never_share_context_state() -> None:
    """Building context for case B right after case A must not leak A's data into B."""
    case_a = _case(id="case-a", client_name="Elena Rivera", attorney_notes="Nota privada de A")
    case_b = _case(id="case-b", client_name="Miguel Santos", attorney_notes="Nota privada de B")
    builder = CaseContextBuilder()

    context_a = builder.build(case_a, BankruptcyAnalysisService().analyze(case_a), "attorney", "es-PR")
    context_b = builder.build(case_b, BankruptcyAnalysisService().analyze(case_b), "attorney", "es-PR")

    assert context_a.case_id == "case-a"
    assert context_a.client_name == "Elena Rivera"
    assert context_a.attorney_notes == "Nota privada de A"

    assert context_b.case_id == "case-b"
    assert context_b.client_name == "Miguel Santos"
    assert context_b.attorney_notes == "Nota privada de B"


def test_timeline_conversation_and_retrieved_documents_default_to_empty() -> None:
    """Closes docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §4's
    documented gap: these fields exist and default safely when the caller
    (e.g. a test, or a request for a brand-new case with no history) has
    nothing to pass in."""
    case = _case()
    analysis = BankruptcyAnalysisService().analyze(case)
    context = CaseContextBuilder().build(case, analysis, "client", "es-PR")
    assert context.timeline == []
    assert context.recent_conversation == []
    assert context.retrieved_documents == []


def test_timeline_conversation_and_retrieved_documents_are_folded_into_context() -> None:
    case = _case()
    analysis = BankruptcyAnalysisService().analyze(case)
    timeline = [
        TimelineEventEntity(
            id="t1",
            case_id=case.id,
            event_type=TimelineEventType.CASE_CREATED,
            message="Caso creado.",
            created_at=datetime(2026, 1, 1, tzinfo=UTC),
        )
    ]
    conversation = [
        AIConversationMessageEntity(
            id="c1",
            case_id=case.id,
            role=ConversationRole.USER,
            message="¿Qué me falta?",
            created_at=datetime(2026, 1, 2, tzinfo=UTC),
        )
    ]

    context = CaseContextBuilder().build(
        case,
        analysis,
        "client",
        "es-PR",
        timeline=timeline,
        recent_conversation=conversation,
        retrieved_documents=["fragmento indexado uno"],
    )

    assert context.timeline[0].event_type == "case_created"
    assert context.timeline[0].message == "Caso creado."
    assert context.recent_conversation[0].role == "user"
    assert context.recent_conversation[0].message == "¿Qué me falta?"
    assert context.retrieved_documents == ["fragmento indexado uno"]
