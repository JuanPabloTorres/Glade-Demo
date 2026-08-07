"""
Postgres is one environment variable away, and this proves it.

Vercel's filesystem is per-instance and ephemeral, so a demo whose data must
survive a cold start has to point `DATABASE_URL` at managed Postgres. The
upgrade path documented in `docs/DEPLOYMENT.md` claims that is a connection
string and nothing else — no code change, no schema change. These tests hold
that claim to account without needing a server to connect to.
"""

from __future__ import annotations

import pytest
from sqlalchemy.engine import make_url

from app.core.config import Settings
from app.repositories.orm_models import Base

POSTGRES_DSN = "postgresql+psycopg://demo:secret@db.example.com:5432/freshstart"


def test_the_driver_is_installed_in_the_deployed_runtime() -> None:
    """Shipped in requirements.txt rather than added later, so switching to
    Postgres is a variable change instead of a variable change plus a
    redeploy of different code."""
    import psycopg  # noqa: F401

    assert "psycopg" in (
        __import__("pathlib").Path(__file__).resolve().parents[2] / "requirements.txt"
    ).read_text(encoding="utf-8")


def test_settings_accept_a_postgres_dsn() -> None:
    assert Settings(database_url=POSTGRES_DSN).database_url == POSTGRES_DSN


def test_sqlalchemy_resolves_the_dsn_to_the_installed_driver() -> None:
    url = make_url(POSTGRES_DSN)
    assert url.get_backend_name() == "postgresql"
    # Raises if the driver cannot be imported, which is the failure a
    # deployment would otherwise discover on its first request.
    assert url.get_dialect().driver == "psycopg"


@pytest.mark.parametrize("model", list(Base.metadata.tables.values()))
def test_every_column_type_compiles_for_postgres(model: object) -> None:
    """The 'no schema changes required' half of the upgrade path.

    Each column is rendered with the PostgreSQL dialect; a SQLite-only type
    would raise here rather than at `alembic upgrade head` against a real
    database.
    """
    from sqlalchemy.dialects import postgresql

    dialect = postgresql.dialect()
    for column in model.columns:  # type: ignore[attr-defined]
        assert column.type.compile(dialect=dialect)
