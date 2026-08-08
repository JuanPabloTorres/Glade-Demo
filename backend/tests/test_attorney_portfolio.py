"""
The attorney's triage list, and the authorization that must sit in front of it.

This is the foundation for cross-case reasoning, and the security property is
the whole point: authorization happens *before* anything reaches an agent.
Nothing downstream — no tool, no prompt, no model — ever names a case id. It
receives a collection that was already filtered, which is the only shape a model
cannot talk its way around.

The dataset these tests read is the seed, and it is deliberately uneven: Elena is
collecting information with no urgency, Miguel is submitted with a collection
lawsuit and an urgent flag, Rosa has a household and nothing else. A queue of
three healthy cases would let a ranking answer look correct while ranking on
nothing.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.core.config import get_settings
from app.repositories.case_repository import SqlAlchemyCaseRepository
from app.repositories.database import get_sessionmaker
from app.repositories.orm_models import CaseModel
from app.repositories.seed import (
    ATTORNEY_REVIEW_CASE_ID,
    DEMO_CASE_ID,
    INCOMPLETE_CASE_ID,
    reset_demo_data,
)
from app.schemas.auth import AuthUserDto
from app.services.case_access_service import CaseAccessService

ATTORNEY = AuthUserDto(
    id="attorney-demo", email="attorney@freshstart.demo", name="Andrea", role="attorney"
)
CLIENT = AuthUserDto(
    id="client-demo", email="client@freshstart.demo", name="Elena", role="client"
)


@pytest.fixture
def portfolio() -> list:
    reset_demo_data(get_settings())
    with get_sessionmaker()() as session:
        service = CaseAccessService(SqlAlchemyCaseRepository(session))
        return service.attorney_portfolio(ATTORNEY)


class TestAuthorizationHappensBeforeTheAgent:
    def test_a_client_is_refused_the_portfolio_capability(self) -> None:
        """Refused, not filtered to their own case.

        Returning a one-item list for a client would make a role check look like
        a filter, so a wiring mistake would read as working software.
        """
        reset_demo_data(get_settings())
        with get_sessionmaker()() as session:
            service = CaseAccessService(SqlAlchemyCaseRepository(session))
            with pytest.raises(HTTPException) as raised:
                service.attorney_portfolio(CLIENT)

        assert raised.value.status_code == 403

    def test_the_caller_never_supplies_a_case_id(self) -> None:
        """The signature is the security property.

        `attorney_portfolio` takes an identity and nothing else. There is no
        parameter a model could populate, so no prompt can widen the result —
        the class of bug is removed rather than validated against.
        """
        import inspect

        parameters = set(inspect.signature(CaseAccessService.attorney_portfolio).parameters)
        assert parameters == {"self", "current_user"}


class TestTheListIsTriageShaped:
    def test_it_returns_every_seeded_case(self, portfolio: list) -> None:
        ids = {entry.case_id for entry in portfolio}
        assert {DEMO_CASE_ID, ATTORNEY_REVIEW_CASE_ID, INCOMPLETE_CASE_ID} <= ids

    def test_the_urgent_case_is_distinguishable(self, portfolio: list) -> None:
        urgent = next(entry for entry in portfolio if entry.case_id == ATTORNEY_REVIEW_CASE_ID)
        calm = next(entry for entry in portfolio if entry.case_id == DEMO_CASE_ID)

        assert urgent.urgent_collection_action is True
        assert urgent.has_collection_lawsuit is True
        assert calm.urgent_collection_action is False
        assert calm.has_collection_lawsuit is False

    def test_the_incomplete_case_is_distinguishable(self, portfolio: list) -> None:
        """The signal that separates "waiting on me" from "waiting on the
        client"."""
        thin = next(entry for entry in portfolio if entry.case_id == INCOMPLETE_CASE_ID)

        assert thin.income_count == 0
        assert thin.debt_count == 0
        assert thin.asset_count == 0

    def test_counts_reflect_the_rows_actually_attached(self, portfolio: list) -> None:
        miguel = next(entry for entry in portfolio if entry.case_id == ATTORNEY_REVIEW_CASE_ID)

        # A left join without DISTINCT multiplies these across each other; the
        # seeded case has 1 income, 4 expenses and 2 debts, so a broken query
        # reports 8 incomes rather than 1.
        assert miguel.income_count == 1
        assert miguel.expense_count == 4
        assert miguel.debt_count == 2

    def test_an_empty_case_still_appears(self, portfolio: list) -> None:
        """Left joins, not inner: a case with nothing attached is precisely one
        an attorney may need to chase."""
        assert any(entry.case_id == INCOMPLETE_CASE_ID for entry in portfolio)

    def test_entries_carry_no_financial_figures(self, portfolio: list) -> None:
        """A triage row ranks cases; it does not read them.

        Hydrating balances and incomes to render a list would put a client's
        finances in memory — and, once a tool is layered on top, in a model's
        context — to answer "which of these needs attention".
        """
        fields = set(vars(portfolio[0]))
        assert not fields & {"balance", "total_debt", "monthly_income", "incomes", "debts"}


class TestAnEmptyPortfolioIsSafe:
    def test_no_cases_returns_an_empty_list_rather_than_an_error(self) -> None:
        """An attorney with nothing to review is a normal state, not a failure.

        Emptied through the ORM rather than by skipping the seed, so this
        exercises the real query against a real empty table — a `[]` produced by
        never running the statement would prove nothing.
        """
        reset_demo_data(get_settings())
        with get_sessionmaker()() as session:
            session.query(CaseModel).delete()
            session.commit()

        with get_sessionmaker()() as session:
            service = CaseAccessService(SqlAlchemyCaseRepository(session))
            assert service.attorney_portfolio(ATTORNEY) == []
