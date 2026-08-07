"""
Startup seeding, and the one property that makes it safe to enable.

The serverless target keeps its SQLite file in a per-instance `/tmp`, so every
cold start begins with an empty database and a login lands on an empty
workspace. `seed_demo_data_if_absent` closes that, and these tests pin the
reason it is allowed anywhere near a boot path: it writes only when there is
nothing to lose.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest

from app.core.config import Settings
from app.repositories.database import get_sessionmaker, init_db, reset_engine_for_tests
from app.repositories.orm_models import CaseModel, UserModel
from app.repositories.seed import DEMO_CASE_ID, seed_demo_data_if_absent


@pytest.fixture
def settings(tmp_path: Path) -> Iterator[Settings]:
    """A throwaway database per test — the seed helper is about what is
    already in one, so tests cannot share."""
    configured = Settings(database_url=f"sqlite:///{tmp_path / 'seed-test.db'}")
    reset_engine_for_tests()
    yield configured
    reset_engine_for_tests()


def test_it_seeds_an_empty_database(settings: Settings) -> None:
    assert seed_demo_data_if_absent(settings) is True

    with get_sessionmaker()() as session:
        assert session.get(CaseModel, DEMO_CASE_ID) is not None


def test_it_reports_that_it_did_nothing_when_data_exists(settings: Settings) -> None:
    assert seed_demo_data_if_absent(settings) is True
    assert seed_demo_data_if_absent(settings) is False


def test_it_never_overwrites_rows_it_did_not_create(settings: Settings) -> None:
    """The property that makes this safe on a boot path.

    `reset_demo_data`, which this delegates to for an empty database, wipes
    every table first. If the emptiness check were ever dropped or inverted,
    enabling the flag on a populated deployment would destroy it — so the
    guarantee is asserted against a real row rather than trusted.
    """
    init_db(settings)
    with get_sessionmaker()() as session:
        session.add(
            UserModel(
                id="real-user",
                email="someone@example.com",
                name="Someone Real",
                role="client",
                preferred_language="es",
            )
        )
        session.commit()

    assert seed_demo_data_if_absent(settings) is False

    with get_sessionmaker()() as session:
        assert session.get(UserModel, "real-user") is not None, "pre-existing row was destroyed"
        assert session.get(CaseModel, DEMO_CASE_ID) is None, "demo data was written anyway"


def test_the_flag_is_off_unless_asked_for() -> None:
    # A boot path that populates a database has to be opted into explicitly.
    # It is deliberately not inferred from `environment`, because the one
    # deployment that needs it also runs with ENVIRONMENT=production.
    assert Settings().seed_demo_data_on_startup is False
    assert (
        Settings(environment="production", jwt_secret="x" * 40).seed_demo_data_on_startup is False
    )
