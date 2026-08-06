"""
Integration tests for the persistence wiring added to close
docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §4's "CaseContextDto has
no timeline field and no persisted conversation history" gap.
`BankruptcyGuidanceService.guide()` now reads real `case_timeline` and
`ai_conversations` rows through the actual SQLAlchemy repositories (not
mocks) against the isolated test database `conftest.py` points `DATABASE_URL`
at — proving the read-back is real, not just that the write-path compiles.
"""

from __future__ import annotations

from app.core.config import get_settings
from app.domain.value_objects import TimelineEventType
from app.repositories.ai_conversation_repository import SqlAlchemyAIConversationRepository
from app.repositories.case_repository import SqlAlchemyCaseRepository
from app.repositories.database import get_sessionmaker
from app.repositories.orm_models import CaseModel
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto, GuidanceRequestDto
from app.services.bankruptcy_service import BankruptcyGuidanceService
from app.services.documents.index import CaseDocumentIndex


class _CapturingProvider:
    """Delegates to RuleBasedProvider but records every `context` it was
    handed, so the test can assert on what BankruptcyGuidanceService
    actually built without a live Ollama/transformers model."""

    def __init__(self) -> None:
        self.contexts: list[CaseContextDto] = []

    def is_available(self) -> bool:
        return True

    def generate(self, *, context: CaseContextDto, message: str):
        from app.ai.providers.rule_based import RuleBasedProvider

        self.contexts.append(context)
        return RuleBasedProvider().generate(context=context, message=message)


def _seed_case(case_id: str) -> None:
    session_factory = get_sessionmaker()
    with session_factory() as session:
        session.add(
            CaseModel(
                id=case_id,
                owner_user_id="client-demo",
                client_name="Elena Rivera",
                client_email="client@freshstart.demo",
            )
        )
        session.commit()


def _case(case_id: str) -> BankruptcyCaseDto:
    return BankruptcyCaseDto(
        id=case_id,
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
    )


def test_conversation_turns_persist_and_are_read_back_on_the_next_turn() -> None:
    case_id = "case-ai-context-conversation"
    _seed_case(case_id)
    session_factory = get_sessionmaker()
    provider = _CapturingProvider()

    with session_factory() as session:
        service = BankruptcyGuidanceService(
            get_settings(),
            provider=provider,
            case_repository=SqlAlchemyCaseRepository(session),
            conversation_repository=SqlAlchemyAIConversationRepository(session),
            document_index=CaseDocumentIndex(),
        )
        service.guide(
            GuidanceRequestDto(
                case=_case(case_id), message="¿Qué me falta?", role="client", locale="es"
            )
        )
        session.commit()

    # First turn: no prior history exists yet.
    assert provider.contexts[0].recent_conversation == []

    with session_factory() as session:
        service = BankruptcyGuidanceService(
            get_settings(),
            provider=provider,
            case_repository=SqlAlchemyCaseRepository(session),
            conversation_repository=SqlAlchemyAIConversationRepository(session),
            document_index=CaseDocumentIndex(),
        )
        service.guide(
            GuidanceRequestDto(case=_case(case_id), message="¿Y ahora?", role="client", locale="es")
        )
        session.commit()

    # Second turn: the first turn's user message and assistant reply must
    # both be visible, read back from the ai_conversations table — not just
    # written to it (GuidanceRequestDto never sends prior turns itself).
    second_turn_conversation = provider.contexts[1].recent_conversation
    assert any(
        turn.role == "user" and turn.message == "¿Qué me falta?"
        for turn in second_turn_conversation
    )
    assert any(turn.role == "assistant" for turn in second_turn_conversation)


def test_conversation_history_is_isolated_per_case() -> None:
    case_a_id, case_b_id = "case-ai-context-conv-a", "case-ai-context-conv-b"
    _seed_case(case_a_id)
    _seed_case(case_b_id)
    session_factory = get_sessionmaker()
    provider = _CapturingProvider()

    with session_factory() as session:
        service = BankruptcyGuidanceService(
            get_settings(),
            provider=provider,
            case_repository=SqlAlchemyCaseRepository(session),
            conversation_repository=SqlAlchemyAIConversationRepository(session),
            document_index=CaseDocumentIndex(),
        )
        service.guide(
            GuidanceRequestDto(
                case=_case(case_a_id), message="mensaje unico del caso A", role="client", locale="es"
            )
        )
        session.commit()

    with session_factory() as session:
        service = BankruptcyGuidanceService(
            get_settings(),
            provider=provider,
            case_repository=SqlAlchemyCaseRepository(session),
            conversation_repository=SqlAlchemyAIConversationRepository(session),
            document_index=CaseDocumentIndex(),
        )
        service.guide(
            GuidanceRequestDto(
                case=_case(case_b_id), message="mensaje de caso B", role="client", locale="es"
            )
        )
        session.commit()

    case_b_conversation = provider.contexts[-1].recent_conversation
    assert all("mensaje unico del caso A" not in turn.message for turn in case_b_conversation)


def test_timeline_events_recorded_between_turns_are_visible_on_the_next_turn() -> None:
    case_id = "case-ai-context-timeline"
    _seed_case(case_id)
    session_factory = get_sessionmaker()
    provider = _CapturingProvider()

    with session_factory() as session:
        cases = SqlAlchemyCaseRepository(session)
        service = BankruptcyGuidanceService(
            get_settings(), provider=provider, case_repository=cases, document_index=CaseDocumentIndex()
        )
        service.guide(
            GuidanceRequestDto(case=_case(case_id), message="hola", role="client", locale="es")
        )
        # Mirrors what app.api.routers.bankruptcy.guide_case does after
        # every guide() call in production.
        cases.record_timeline_event(
            case_id, TimelineEventType.GUIDANCE_REQUESTED.value, "hola"
        )
        session.commit()

    with session_factory() as session:
        cases = SqlAlchemyCaseRepository(session)
        service = BankruptcyGuidanceService(
            get_settings(), provider=provider, case_repository=cases, document_index=CaseDocumentIndex()
        )
        service.guide(
            GuidanceRequestDto(case=_case(case_id), message="otra vez", role="client", locale="es")
        )
        session.commit()

    second_turn_timeline = provider.contexts[1].timeline
    assert any(event.message == "hola" for event in second_turn_timeline)


def test_timeline_context_is_capped_to_the_configured_recent_window() -> None:
    case_id = "case-ai-context-timeline-cap"
    _seed_case(case_id)
    session_factory = get_sessionmaker()

    with session_factory() as session:
        cases = SqlAlchemyCaseRepository(session)
        for index in range(15):
            cases.record_timeline_event(
                case_id, TimelineEventType.CASE_UPDATED.value, f"evento {index}"
            )
        session.commit()

    with session_factory() as session:
        cases = SqlAlchemyCaseRepository(session)
        recent = cases.get_recent_timeline(case_id, limit=10)

    assert len(recent) == 10
    # Newest-first at the DB layer, reversed to chronological order for the
    # context — the last written event must be the last one in the list.
    assert recent[-1].message == "evento 14"
