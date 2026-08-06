"""
Engine/session plumbing. One process-wide `Engine`, one `sessionmaker`,
built from `Settings.database_url` (the field that used to be silently
dropped — see `app.core.config.Settings.database_url`'s docstring).

Migrations are the source of truth for schema in a real deployment
(`alembic upgrade head` — see backend/alembic/). `init_db()` additionally
runs `Base.metadata.create_all()` as a demo-convenience safety net (idempotent:
a no-op once the tables already exist, whether created by Alembic or by a
previous `init_db()` call) so `make backend` / pytest work without a manual
migration step. Production deployments should still run Alembic explicitly
as part of the deploy so `alembic_version` stays authoritative.
"""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.repositories.orm_models import Base

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def ensure_sqlite_parent_exists(database_url: str) -> None:
    """SQLite needs its parent directory to exist before the first connect.
    Public (not `app.main`/`get_engine`-only) because `backend/alembic/env.py`
    calls it too, before Alembic opens its own connection."""
    if not database_url.startswith("sqlite:///"):
        return
    raw_path = database_url.removeprefix("sqlite:///")
    if raw_path in ("", ":memory:") or raw_path.startswith("file::memory:"):
        return
    Path(raw_path).resolve().parent.mkdir(parents=True, exist_ok=True)


def get_engine(settings: Settings | None = None) -> Engine:
    global _engine
    if _engine is None:
        settings = settings or get_settings()
        ensure_sqlite_parent_exists(settings.database_url)
        connect_args = (
            {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
        )
        _engine = create_engine(settings.database_url, connect_args=connect_args)
    return _engine


def get_sessionmaker() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), expire_on_commit=False)
    return _SessionLocal


def init_db(settings: Settings | None = None) -> None:
    """Idempotent schema bootstrap — see module docstring."""
    Base.metadata.create_all(bind=get_engine(settings))


def reset_engine_for_tests() -> None:
    """
    Test-only hook: drop the cached engine/sessionmaker so a fresh
    `DATABASE_URL` (e.g. a per-test-session temp file) takes effect. Safe to
    call in application code too — it is just a cache invalidation, not a
    data-destroying operation — but nothing outside tests needs to.
    """
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None


def get_session() -> Generator[Session]:
    session_factory = get_sessionmaker()
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


SessionDep = Annotated[Session, Depends(get_session)]
