"""
The demo state the two release journeys walk through.

Everything here is an assertion about the *fixture*, not about the code that
reads it. That is deliberate: the journeys are demonstrated live, and a seed
that quietly loses a document or flattens the difference between three cases
turns a working demo into an empty one without failing anything else.

The specific failure this file was written after: no case had any evidence at
all. The client's document step opened empty, and because `evidence_count` was
zero everywhere, `list_incomplete_cases` returned all three — so the attorney's
triage tools ranked on a signal no case actually carried.
"""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from app.core.config import get_settings
from app.repositories.case_repository import SqlAlchemyCaseRepository
from app.repositories.database import get_sessionmaker
from app.repositories.orm_models import CaseDocumentModel, CaseTaskModel
from app.repositories.seed import (
    ATTORNEY_REVIEW_CASE_ID,
    DEMO_CASE_ID,
    INCOMPLETE_CASE_ID,
    reset_demo_data,
)
from app.schemas.auth import AuthUserDto
from app.services.case_access_service import CaseAccessService
from app.services.documents.index import get_shared_case_document_index

ATTORNEY = AuthUserDto(
    id="attorney-demo", email="attorney@freshstart.demo", name="Andrea", role="attorney"
)


@pytest.fixture(autouse=True)
def _seeded() -> None:
    reset_demo_data(get_settings())


def _document_count(case_id: str) -> int:
    with get_sessionmaker()() as session:
        return session.execute(
            select(func.count()).select_from(CaseDocumentModel).where(
                CaseDocumentModel.case_id == case_id
            )
        ).scalar_one()


class TestTheClientCaseIsDemonstrable:
    def test_it_opens_with_evidence_on_file(self) -> None:
        assert _document_count(DEMO_CASE_ID) >= 2

    def test_the_assistant_has_a_real_gap_to_report(self) -> None:
        """"¿Qué me falta?" must have an answer.

        `completion_score` and `missing_items` are computed from the same eight
        section booleans (`BankruptcyAnalysisService`), so a case with every
        section filled reports 100% and an empty missing list — and the flagship
        client question comes back with nothing to say.

        Elena is missing assets and only assets. Asserted here as the shape of
        the fixture rather than by running the analysis, because that is what
        this file is for and what a future seed edit would break: one empty
        section, and the rest populated so the gap is the only one.
        """
        with get_sessionmaker()() as session:
            entries = CaseAccessService(SqlAlchemyCaseRepository(session)).attorney_portfolio(
                ATTORNEY
            )
        elena = next(entry for entry in entries if entry.case_id == DEMO_CASE_ID)

        assert elena.asset_count == 0, "the client case has no gap for the assistant to find"
        assert elena.income_count > 0
        assert elena.expense_count > 0
        assert elena.debt_count > 0
        assert elena.evidence_count > 0

    def test_it_still_has_something_outstanding(self) -> None:
        """A complete case cannot demonstrate the product's actual job.

        The journey's value is in surfacing what is missing, so the fixture has
        to be incomplete on purpose — evidence *and* an open request, not one or
        the other.
        """
        with get_sessionmaker()() as session:
            open_tasks = session.execute(
                select(CaseTaskModel).where(
                    CaseTaskModel.case_id == DEMO_CASE_ID, CaseTaskModel.status == "open"
                )
            ).scalars().all()

        assert open_tasks, "the client case has nothing outstanding left to ask for"


class TestTheThreeCasesTriageDifferently:
    """Each case has to be the *only* one carrying its signal.

    A queue where two cases answer the same question cannot show an attorney
    choosing between them, and a ranking tool would look correct while ranking
    on nothing.
    """

    def _portfolio(self) -> dict[str, object]:
        with get_sessionmaker()() as session:
            entries = CaseAccessService(SqlAlchemyCaseRepository(session)).attorney_portfolio(
                ATTORNEY
            )
        return {entry.case_id: entry for entry in entries}

    def test_exactly_one_case_is_urgent(self) -> None:
        portfolio = self._portfolio()
        urgent = [
            case_id
            for case_id, entry in portfolio.items()
            if entry.urgent_collection_action or entry.has_collection_lawsuit  # type: ignore[attr-defined]
        ]

        assert urgent == [ATTORNEY_REVIEW_CASE_ID]

    def test_exactly_one_case_is_waiting_on_its_client(self) -> None:
        """The `list_incomplete_cases` rule, asserted against the fixture.

        This is the assertion that would have caught the missing evidence: with
        no documents anywhere, every case matched and the distinction the tool
        exists to draw did not exist in the data.
        """
        portfolio = self._portfolio()
        incomplete = [
            case_id
            for case_id, entry in portfolio.items()
            if entry.income_count == 0  # type: ignore[attr-defined]
            or entry.debt_count == 0  # type: ignore[attr-defined]
            or entry.evidence_count == 0  # type: ignore[attr-defined]
        ]

        assert incomplete == [INCOMPLETE_CASE_ID]

    def test_the_reviewable_case_has_the_evidence_a_review_needs(self) -> None:
        entry = self._portfolio()[ATTORNEY_REVIEW_CASE_ID]

        assert entry.evidence_count >= 3  # type: ignore[attr-defined]
        assert entry.income_count > 0  # type: ignore[attr-defined]
        assert entry.debt_count > 0  # type: ignore[attr-defined]


class TestSeededDocumentsAreReadable:
    def test_the_assistant_can_retrieve_what_the_evidence_list_shows(self) -> None:
        """A filename the assistant cannot read is not evidence, it is a label.

        The rows and the vectors are two different stores; seeding only the
        first gives a document list the assistant knows nothing about.
        """
        excerpts = " ".join(
            get_shared_case_document_index().search(DEMO_CASE_ID, "talón de pago", top_k=3)
        )

        assert "Panaderia Los Robles" in excerpts

    def test_one_case_never_retrieves_another(self) -> None:
        excerpts = " ".join(
            get_shared_case_document_index().search(DEMO_CASE_ID, "hipoteca", top_k=3)
        )

        assert "148,000" not in excerpts

    def test_reseeding_does_not_stack_duplicate_chunks(self) -> None:
        """`reset_demo_data` wipes rows; the index is a separate store.

        Without `clear_case`, every reset — the admin endpoint, the CLI, each
        test using this fixture — would add another copy of the same text, so
        retrieval would return the same excerpt three times and crowd out the
        rest of the case.
        """
        index = get_shared_case_document_index()
        before = index.document_count(DEMO_CASE_ID)

        reset_demo_data(get_settings())

        assert index.document_count(DEMO_CASE_ID) == before
