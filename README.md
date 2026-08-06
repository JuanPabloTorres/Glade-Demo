# FreshStart AI — Glade Full-Stack Demo

A bilingual, AI-assisted bankruptcy intake demo built to demonstrate production-minded full-stack engineering with **React + TypeScript**, **FastAPI + Python**, role-based JWT authentication, reusable UI components, repository/service patterns, and clear agent boundaries.

> **Important:** FreshStart AI organizes information and administrative next steps. It does not provide legal advice, determine bankruptcy eligibility, or replace attorney review.

## What the MVP demonstrates

- Applicant, case manager, and administrator roles.
- JWT authentication with Argon2 password hashing.
- Bilingual Spanish/English UI and assistant responses.
- Context-aware assistant as the applicant home page.
- Guided Chapter 7 intake stepper with validation and persistence.
- Case CRUD with responsive table/card modes.
- Responsive sidebar on desktop/tablet and bottom navigation on mobile.
- SOLID-oriented backend with repositories, services, schemas, and provider interfaces.
- Optional OpenAI Responses API provider with a deterministic no-key demo fallback.
- Agent skills, ownership rules, coding standards, CI, and pre-commit hooks.

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

These credentials are demo-only seed data and must not be reused in production.

## AI modes

The application starts in `AI_PROVIDER=demo`, which provides contextual bilingual responses without external credentials.

For optional OpenAI integration:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-5-mini
```

The API key is used only by the backend and must never be exposed to the browser.

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

Use a managed PostgreSQL database for deployed environments. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Current scope

This initial release focuses on **individual Chapter 7 intake readiness**. It intentionally does not automate legal conclusions, filing, court forms, document OCR, or attorney strategy.
