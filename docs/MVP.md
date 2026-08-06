# MVP Definition

## Product statement

FreshStart AI helps an individual begin organizing a Chapter 7 bankruptcy intake and prepares a structured file for professional legal review.

## Primary personas

### Applicant
- Signs in and sees the contextual assistant first.
- Completes a guided bilingual intake.
- Saves progress and returns later.
- Sees missing sections and readiness indicators.

### Case manager
- Reviews all cases.
- Creates cases for applicants.
- Updates case metadata and status.
- Uses table or card presentation.

### Administrator
- Has case manager capabilities and is reserved for future user/configuration management.

## In-scope vertical slice

1. JWT sign-in and current-user retrieval.
2. Seeded demo users and a seeded applicant case.
3. Case CRUD with role-aware authorization.
4. Nine-step intake with JSON section persistence.
5. Progress and readiness calculations.
6. Bilingual contextual assistant with optional OpenAI provider.
7. Responsive Flowbite interface.
8. Vercel deployment documentation.

## Explicitly out of scope

- Legal advice, eligibility determination, or recommendation of a bankruptcy chapter.
- Electronic court filing.
- Official bankruptcy forms generation.
- OCR and document extraction.
- Payment processing.
- Production-grade audit log, refresh tokens, MFA, or password recovery.
- Multi-firm tenancy.

## Definition of Done

- Backend health, authentication, case and assistant endpoints run locally.
- Applicant cannot read another applicant's case.
- Applicant cannot delete cases.
- Staff can list applicants and create a case for one.
- Intake progress changes after a completed section is saved.
- UI supports Spanish and English.
- Main app navigation adapts to mobile and desktop.
- Repository contains no secrets and CI validates backend and frontend.
