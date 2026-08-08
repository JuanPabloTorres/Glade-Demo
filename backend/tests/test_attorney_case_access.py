"""
The attorney has to be able to analyze the case their queue opens.

This is the defect these tests were written for, found by driving the demo in a
browser rather than by any suite: opening a case as the attorney produced a
reproducible 404 from `bankruptcy.analyze`, so the review workspace rendered with
no cash flow, no debt composition and no missing items — the professional half of
the product, failing silently.

The cause was not the authorization rule, which is correct.
`CaseAccessService.authorize_for_submission` creates a missing case only for its
owning *client*, and refuses to let an attorney conjure one. The cause was that
the demo's attorney-facing case existed only in the browser's seed, so it never
reached the database at all: it belongs to a client nobody signs in as, and only
its own client could have created it.

These tests pin the seam between the two seeds. They fail if the server-side
fixture disappears, if its identifier drifts from the one the UI uses, or if the
authorization rule is loosened to paper over either.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.repositories.database import get_sessionmaker
from app.repositories.orm_models import CaseModel
from app.repositories.seed import ATTORNEY_REVIEW_CASE_ID, DEMO_CASE_ID, reset_demo_data


def _case_payload(case_id: str) -> dict[str, object]:
    """A body claiming an owner the server must ignore.

    Ownership is resolved from the persisted row, never from this field, so the
    value here is deliberately wrong — a test that sent the right one could pass
    against a server that trusted the client.
    """
    return {
        "case": {
            "id": case_id,
            "owner_user_id": "not-the-real-owner",
            "client_name": "Miguel Santos",
            "client_email": "miguel@example.demo",
            "status": "submitted",
            "household": {"household_size": 4, "dependents": 2},
            "incomes": [],
            "expenses": [],
            "debts": [],
            "assets": [],
            "evidence": [],
        }
    }


class TestSeededCasesCoverTheDemo:
    def test_both_demo_cases_exist_after_a_seed(self) -> None:
        reset_demo_data(get_settings())
        with get_sessionmaker()() as session:
            assert session.get(CaseModel, DEMO_CASE_ID) is not None
            assert session.get(CaseModel, ATTORNEY_REVIEW_CASE_ID) is not None

    def test_case_ids_match_the_ones_the_ui_seeds(self) -> None:
        """The two seeds have to name the same cases.

        They did not: the server seeded `case-demo-elena-rivera` while
        `frontend/src/workspace/BankruptcyWorkspaceContext.tsx` seeds
        `case-elena-demo` and `case-miguel-demo`. The server's fixture was
        therefore never the case the demo displayed. Asserted as literals on
        purpose — comparing the constants to themselves would prove nothing, and
        this is the one place the cross-language agreement can be checked at all.
        """
        assert DEMO_CASE_ID == "case-elena-demo"
        assert ATTORNEY_REVIEW_CASE_ID == "case-miguel-demo"

    def test_the_attorney_case_is_submitted_not_still_being_filled_in(self) -> None:
        reset_demo_data(get_settings())
        with get_sessionmaker()() as session:
            case = session.get(CaseModel, ATTORNEY_REVIEW_CASE_ID)
            assert case is not None
            assert case.status == "submitted"


class TestAttorneyCanReviewTheQueuedCase:
    def test_attorney_analyze_succeeds_on_the_case_the_queue_opens(
        self, attorney_client: TestClient
    ) -> None:
        """The regression. This returned 404 before the fixture existed."""
        reset_demo_data(get_settings())
        response = attorney_client.post(
            "/api/v1/bankruptcy/analyze", json=_case_payload(ATTORNEY_REVIEW_CASE_ID)
        )

        assert response.status_code == 200, response.text

    def test_the_analysis_carries_the_figures_the_review_workspace_needs(
        self, attorney_client: TestClient
    ) -> None:
        """A 200 with an empty analysis would satisfy the test above and still
        leave the attorney looking at nothing."""
        reset_demo_data(get_settings())
        response = attorney_client.post(
            "/api/v1/bankruptcy/analyze", json=_case_payload(ATTORNEY_REVIEW_CASE_ID)
        )

        body = response.json()
        for field in (
            "monthly_cash_flow",
            "total_debt",
            "total_asset_value",
            "completion_score",
            "missing_items",
            "next_steps",
        ):
            assert field in body, f"analysis is missing {field}"

    def test_an_unknown_case_still_refuses_the_attorney(
        self, attorney_client: TestClient
    ) -> None:
        """The fix must not have loosened the rule.

        An attorney may review a case that exists; they may not bring one into
        existence. If this ever passes with a 200, the seam was fixed by
        weakening authorization rather than by seeding data.
        """
        response = attorney_client.post(
            "/api/v1/bankruptcy/analyze", json=_case_payload("case-that-was-never-created")
        )

        assert response.status_code == 404, response.text
