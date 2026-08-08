"""
An uploaded document, all the way to an answer — and no further than its case.

Every link in the chain already had tests: extraction, classification, evidence
amounts, chunking, embeddings, per-case index isolation, and the ingestion
service end to end (`test_document_pipeline.py`). What none of them crossed is
the seam the demo actually walks: `POST /documents/analyze` writes into the
process-wide index (`get_shared_case_document_index`) and `POST
/bankruptcy/guide` reads from it. A wiring mistake there — two indexes instead
of one — leaves every lower-level test green while the assistant knows nothing
about anything the user uploaded.

Retrieval is asserted at the model, not at the index. `model.transcript` is what
the fake provider was actually shown, so a document that reaches the index but
never the model fails here. That distinction is the whole point of the file.

One happy path and one isolation test, per the release contract. The lower-level
matrix already exists and is not repeated.
"""

from __future__ import annotations

import base64
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.ai.model_factory import OPENAI, ModelFactory
from app.core.config import get_settings
from app.repositories.seed import ATTORNEY_REVIEW_CASE_ID, DEMO_CASE_ID, reset_demo_data
from app.services.documents.index import get_shared_case_document_index
from tests.support.fake_model import FakeProviderModel

# Deliberately unmistakable strings. The seeded cases carry realistic figures,
# so a test asserting on "$1,200" could pass on data that was already there —
# these can only have arrived from the upload under test.
ELENA_PAY_STUB = (
    "Talón de pago quincenal - Empleador: Farmacia Bermúdez - "
    "salario bruto $1,437.55 - número de confirmación ZQ-ELENA-77."
)
MIGUEL_STATEMENT = (
    "Estado de cuenta hipotecario - Banco Popular - balance $150,000.00 - "
    "número de confirmación ZQ-MIGUEL-42."
)


@pytest.fixture
def agentic(monkeypatch: pytest.MonkeyPatch) -> Any:
    reset_demo_data(get_settings())

    def install(prefers: list[str]) -> FakeProviderModel:
        model = FakeProviderModel(prefers=prefers, answer="Revisé tus documentos.")
        monkeypatch.setattr(ModelFactory, "create", lambda self: model)
        return model

    return install


def _upload(client: TestClient, case_id: str, filename: str, text: str) -> dict[str, Any]:
    response = client.post(
        "/api/v1/documents/analyze",
        json={
            "case_id": case_id,
            "filename": filename,
            "content_base64": base64.b64encode(text.encode()).decode("ascii"),
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def _ask(client: TestClient, case_id: str, message: str, role: str = "client") -> dict[str, Any]:
    from app.core.config import get_settings as real_get_settings

    overridden = real_get_settings().model_copy(
        update={"ai_provider": OPENAI, "openai_api_key": "test-key"}
    )
    client.app.dependency_overrides[real_get_settings] = lambda: overridden  # type: ignore[index]

    response = client.post(
        "/api/v1/bankruptcy/guide",
        json={
            "assistant_scope": "case",
            "case": {
                "id": case_id,
                "owner_user_id": "client-demo",
                "client_name": "Elena Rivera",
                "client_email": "client@freshstart.demo",
                "status": "collecting_information",
                "household": {"household_size": 2},
                "incomes": [],
                "expenses": [],
                "debts": [],
                "assets": [],
                "evidence": [],
            },
            "message": message,
            # The server refuses a role the session does not hold, so this is
            # the caller's real role rather than a claim.
            "role": role,
            "locale": "es-PR",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


class TestTheHappyPath:
    """document → process → index → retrieve → authorized case → AI context."""

    def test_an_uploaded_document_is_in_the_model_context_of_a_later_answer(
        self, client: TestClient, agentic: Any
    ) -> None:
        processed = _upload(client, DEMO_CASE_ID, "talon.txt", ELENA_PAY_STUB)

        # The processing half, from the endpoint's own response: the pipeline
        # classified the document, pulled the figure out of prose, and produced
        # something to index. Asserted here rather than trusted, because a
        # chunk_count of 0 would index nothing and still return 200.
        assert processed["evidence_type"] == "Talones de pago"
        assert processed["chunk_count"] >= 1
        assert any(amount["amount"] == 1437.55 for amount in processed["extracted_amounts"])

        model = agentic(["documents_agent", "search_case_documents"])
        body = _ask(client, DEMO_CASE_ID, "¿Qué dice el talón de pago que subí?")

        assert body["degraded"] is False
        assert model.data_tools_invoked == ["search_case_documents"]
        # The retrieval half. Not "the index has it" — the model was shown it.
        assert "ZQ-ELENA-77" in model.transcript

    def test_the_search_tool_is_what_carried_it(
        self, client: TestClient, agentic: Any
    ) -> None:
        """Guards against the previous test passing for the wrong reason.

        If the document ever reached the model some other way — folded into the
        prompt, or attached to the case summary — the assertion above would
        still hold while the tool did nothing. Here the search tool is not
        offered, and the document must then be absent.
        """
        _upload(client, DEMO_CASE_ID, "talon.txt", ELENA_PAY_STUB)

        model = agentic(["case_agent", "get_case_summary"])
        body = _ask(client, DEMO_CASE_ID, "¿Dónde estoy en el proceso?")

        assert body["degraded"] is False
        assert "ZQ-ELENA-77" not in model.transcript


class TestARetrievalMiss:
    def test_a_case_with_no_documents_still_gets_a_real_answer(
        self, attorney_client: TestClient, agentic: Any
    ) -> None:
        """Nothing to retrieve is a normal state, not a failure.

        Rosa's case is seeded deliberately empty — it is the "waiting on the
        client" case in the attorney's queue, so asking about its documents is
        something the demo actually does. The search tool must run and come back
        with nothing, and the turn must still be agentic: an empty index that
        degraded the answer would make the emptiest cases the ones the assistant
        is least able to talk about, which is backwards.
        """
        from app.repositories.seed import INCOMPLETE_CASE_ID

        model = agentic(["documents_agent", "search_case_documents"])
        body = _ask(
            attorney_client,
            INCOMPLETE_CASE_ID,
            "¿Qué documentos hay en este caso?",
            role="attorney",
        )

        assert body["degraded"] is False
        assert model.data_tools_invoked == ["search_case_documents"]
        # The tool ran and found nothing — not "the tool was skipped".
        assert get_shared_case_document_index().search(INCOMPLETE_CASE_ID, "documentos") == []
        assert "ZQ-" not in model.transcript


class TestOneCaseNeverReadsAnother:
    def test_a_document_uploaded_to_another_case_is_not_retrievable(
        self, attorney_client: TestClient, agentic: Any
    ) -> None:
        """The attacker here is not an outsider — it is an authorized attorney.

        An attorney may open both of these cases, so no permission check stands
        between them; the only thing keeping Miguel's mortgage balance out of
        Elena's answer is that the index is bucketed by case and the tool is
        bound to one case at construction. Uploading through the real endpoint
        as a user who is allowed to upload to both is the shape that would
        actually expose a leak.
        """
        _upload(attorney_client, ATTORNEY_REVIEW_CASE_ID, "hipoteca.txt", MIGUEL_STATEMENT)
        _upload(attorney_client, DEMO_CASE_ID, "talon.txt", ELENA_PAY_STUB)

        model = agentic(["documents_agent", "search_case_documents"])
        _ask(attorney_client, DEMO_CASE_ID, "¿Qué documentos tengo en este caso?", role="attorney")

        # Both halves matter: retrieval ran and found this case's document, and
        # the other case's document was not among the results. Asserting only
        # the absence would pass against a search that returned nothing at all.
        assert "ZQ-ELENA-77" in model.transcript
        assert "ZQ-MIGUEL-42" not in model.transcript
        assert "150,000" not in model.transcript
