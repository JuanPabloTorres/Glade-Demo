# FreshStart Bankruptcy Guide

FreshStart is a bilingual-ready bankruptcy intake and financial preparation platform for individuals in Puerto Rico. It gives a client a guided path to organize household information, income, expenses, creditors, assets, evidence, and urgent collection activity before meeting with a bankruptcy attorney.

The product has two coordinated experiences:

- **Client portal:** starts a request, completes an intelligent financial template, attaches evidence metadata, asks preparation questions, follows the case timeline, and submits the package for review.
- **Attorney workspace:** receives structured requests, reviews cash flow and debt composition, sees missing evidence and urgent flags, records professional notes, updates the timeline, and prepares the consultation.

## Product boundary

FreshStart does not decide whether a person should file bankruptcy, select a chapter, perform the official means test, prepare court-ready forms, or submit a petition. It organizes information and produces questions for discussion with a licensed attorney.

The template is informed by the data categories used in Official Bankruptcy Forms B106A/B, B106D, B106E/F, B106I, B106J, B122A, and B122C. Current official forms, means-test data, exemptions, local rules, and filing requirements must be verified by counsel before reliance.

## Demo access

Client:

- Email: `client@freshstart.demo`
- Password: `FreshStart!2026`

Attorney:

- Email: `attorney@freshstart.demo`
- Password: `Counsel!2026`

All included people, creditors, balances, and documents are invented.

## Architecture

- React 19, TypeScript, Vite, Flowbite React, TanStack Query
- Python 3.13, FastAPI, Pydantic, pandas, RapidFuzz
- JWT sessions with Argon2 password verification
- Stateless financial-analysis and guidance endpoints
- Browser-local demo workspace so Vercel deployments do not lose cases
- Optional PyTorch, Transformers, Sentence Transformers, and Docling runtime for a future Docker/VPS deployment
- Ruff, mypy, Pytest, ESLint, Vitest, Playwright, GitHub Actions, and Vercel

## Financial model

The client records:

1. household and filing context;
2. income sources with pay frequency;
3. monthly expenses grouped into practical Schedule J-aligned categories;
4. secured, priority, and unsecured debts;
5. property, vehicles, bank accounts, retirement, and other assets;
6. evidence linked to the reported information;
7. collection urgency, lawsuits, arrears, and recent transfers.

Python normalizes non-monthly income, calculates cash flow, summarizes debt and asset values, scores completeness, identifies evidence gaps, and generates discussion questions for Chapter 7 and Chapter 13. These outputs are preparation aids, not legal conclusions.

## Local development

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

See [`docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md`](docs/BANKRUPTCY_PRODUCT_BLUEPRINT.md) for the product workflow and acceptance criteria.

> Evaluation software only. Use invented or properly redacted data. Not legal advice, not a law firm, not a court filing service, and not affiliated with Glade.
