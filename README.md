# FreshStart AI — Glade Full-Stack Demo

FreshStart AI is a bilingual, AI-assisted Chapter 7 intake and case-readiness demo built to demonstrate production-minded full-stack engineering with **React + TypeScript**, **FastAPI + Python**, role-based JWT authentication, reusable Flowbite components, repository/service patterns, and explicit agent ownership boundaries.

> **Legal boundary:** FreshStart AI organizes information and administrative next steps. It does not provide legal advice, determine bankruptcy eligibility, choose a bankruptcy chapter, prepare an official filing, or replace attorney review.

## Demonstrated product flow

1. A user signs in with an applicant, case manager, or administrator role.
2. The applicant completes a bilingual nine-step intake and can resume later.
3. The contextual assistant summarizes missing information and guides the next administrative step.
4. The case workspace centralizes documents, tasks, notes, and data-quality alerts.
5. Staff review readiness from a dashboard and manage cases in list or card mode.

## MVP capabilities

- JWT authentication with Argon2 password hashing and server-side role enforcement.
- Spanish/English UI and assistant responses.
- Context-aware assistant with an optional OpenAI provider and deterministic no-key fallback.
- Guided Chapter 7 intake with persistence, progress, and readiness calculations.
- Dashboard metrics for case progress, readiness, alerts, and overdue tasks.
- Case CRUD with responsive table/card modes and direct workspace navigation.
- Document CRUD with requested, uploaded, verified, and needs-attention states.
- Task CRUD with status, priority, due date, and assignment metadata.
- Shared applicant notes and internal staff notes.
- Staff-managed data-quality alerts with severity and resolution state.
- Reusable CRUD panel with search, pagination, card/list views, validation, details, and destructive-action confirmation.
- Responsive sidebar on desktop/tablet and five-item bottom navigation on mobile.
- SOLID-oriented backend with repositories, services, Pydantic contracts, and provider interfaces.
- Agent skills, ownership rules, coding standards, CI, and repository-managed hooks.

## Repository structure

```text
Glade-Demo/
├── frontend/               # React, TypeScript, Vite, Flowbite React
├── backend/                # FastAPI, SQLAlchemy, JWT, AI provider abstraction
├── agents/                 # Isolated agent skills and ownership boundaries
├── docs/                   # MVP, architecture, security, API and deployment
├── scripts/                # Local setup and quality scripts
├── .githooks/              # Repository-managed Git hooks
└── .github/workflows/      # CI validation
```

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API documentation: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Application: `http://localhost:5173`

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Applicant | `applicant@freshstart.demo` | `Demo123!` |
| Case manager | `manager@freshstart.demo` | `Demo123!` |
| Administrator | `admin@freshstart.demo` | `Demo123!` |

These credentials are demo-only seed data and must never be reused in production.

## AI modes

The application starts with `AI_PROVIDER=demo`, which produces contextual bilingual responses without external credentials.

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-5-mini
```

The API key remains server-side and is never exposed to the browser.

## Quality commands

```bash
# Backend
cd backend
pytest -q
python -m compileall -q app tests

# Frontend
cd frontend
npm run build
npm run lint
```

Install the repository-managed pre-commit hook:

```bash
bash scripts/setup-hooks.sh
```

## Deployment

The fastest demo deployment uses two Vercel projects from the same repository:

1. Backend project with root directory `backend`.
2. Frontend project with root directory `frontend` and `VITE_API_BASE_URL` pointing to the backend `/api/v1` URL.

Use managed PostgreSQL for deployed environments. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Intentional limits

This is a professional interview demo, not a production legal platform. It intentionally excludes legal conclusions, electronic court filing, official bankruptcy form generation, OCR, payment processing, multi-firm tenancy, MFA, refresh-token rotation, malware scanning, and production audit retention.
