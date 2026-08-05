# MatterReady

MatterReady is a review-first legal operations workspace that converts structured intake and document findings into human-approved decisions, readiness scoring, and an auditable case-preparation workflow.

## What the product demonstrates

- structured client intake and canonical case data;
- document fact extraction through a replaceable provider boundary;
- explicit conflict detection and human approval;
- deterministic readiness scoring;
- a professional Flowbite React interface;
- secure, reproducible delivery with automated release verification.

## Stack

- React 19, TypeScript, Vite, Flowbite React, TanStack Query;
- Python 3.13, FastAPI, Pydantic 2, SQLAlchemy 2;
- SQLite for the evaluation environment or PostgreSQL through configuration;
- Ruff, mypy, Pytest, ESLint, Vitest, and Playwright;
- GitHub Actions and Vercel.

## Local development

```bash
cp .env.example .env
make install
make backend
# in another terminal
make frontend
```

- Web: `http://localhost:5173`
- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`

## Architecture boundaries

- Shared API contracts keep the frontend and backend aligned.
- DTOs isolate HTTP payloads from persistence models.
- Services own business rules.
- Repositories and unit of work isolate persistence.
- A provider factory isolates document-intelligence implementation.
- Flowbite components are organized into reusable UI layers.
- Internal routing and diagnostic metadata are not exposed in the public UI.

## Delivery and audit

See:

- [`docs/RELEASE_PIPELINE.md`](docs/RELEASE_PIPELINE.md)
- [`docs/VERSIONING.md`](docs/VERSIONING.md)
- [`SECURITY.md`](SECURITY.md)
- [`VALIDATION.md`](VALIDATION.md)
- [`AGENTS.md`](AGENTS.md)

The release pipeline validates locked dependencies, backend and frontend quality gates, the production build, Playwright browser behavior, semantic versioning, Vercel deployment readiness, and production security headers.

> Evaluation software only. Use invented demonstration data. Not legal advice and not affiliated with Glade.
