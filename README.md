# MatterReady Demo

A compact legal matter intake and case-readiness workspace built for a software engineering evaluation. It demonstrates canonical case data, document fact extraction, conflict detection, human resolution, readiness scoring, and end-to-end API traceability.

> Synthetic demo only. Not legal advice. Not affiliated with Glade.

## Stack
- React, TypeScript, Vite, Flowbite React, TanStack Query
- Python, FastAPI, Pydantic v2, SQLAlchemy 2
- SQLite locally or PostgreSQL through configuration
- Pytest, Ruff, mypy, Vitest, ESLint

## Why this project
Modern legal operations platforms connect intake, documents, case data, and next actions. MatterReady focuses on one valuable slice: building a reliable canonical matter record from multiple sources while preserving conflicts and human review.

## Quick start
```bash
cp .env.example .env
make install
make backend
# another terminal
make frontend
```

- Web: `http://localhost:5173`
- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`

## Architecture guarantees
- Shared API contract registry maps frontend call -> HTTP method/path -> controller/action.
- Request and response trace headers prove the matched operation at runtime.
- DTOs isolate HTTP payloads from ORM models.
- Services contain business rules.
- Repositories and unit of work isolate persistence.
- Provider factory isolates document-intelligence implementation.
- Flowbite components are organized as atoms, molecules, organisms, and pages.

See `docs/`, `docs/openapi.json`, `VALIDATION.md`, and `AGENTS.md` for full details.

## Deployment adapters
- Root `vercel.json` + `api/index.py`: one-project evaluation preview.
- `render.yaml`: containerized API with managed PostgreSQL.
- `frontend/vercel.json`: standalone frontend deployment when the API is hosted separately.
