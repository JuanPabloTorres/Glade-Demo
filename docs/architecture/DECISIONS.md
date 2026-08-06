# Architecture Decision Log

## ADR-001 — Two deployable services in one repository

**Decision:** Keep `frontend` and `backend` independently deployable from one monorepo.

**Reason:** It keeps the React and Python boundaries explicit and supports two fast Vercel projects without introducing a monorepo build framework.

## ADR-002 — SQLite locally, PostgreSQL in deployed environments

**Decision:** Default to SQLite for zero-friction local demonstration and accept a SQLAlchemy database URL for PostgreSQL.

**Reason:** Reviewers can run the demo immediately while deployed data remains durable.

## ADR-003 — Deterministic assistant fallback

**Decision:** The assistant remains usable without an external model key and switches to OpenAI only when configured.

**Reason:** The repository must be demonstrable without secrets while retaining a real provider boundary.

## ADR-004 — JSON intake sections for the initial vertical slice

**Decision:** Store each step's validated payload in a unique intake-section record.

**Reason:** It accelerates the demo while preserving section-level persistence, progress tracking and a future normalization path.
