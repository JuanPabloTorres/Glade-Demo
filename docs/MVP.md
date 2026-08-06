# MVP Definition

## Product statement

FreshStart AI helps an individual organize the beginning of a Chapter 7 intake and prepares a structured, reviewable case file for a legal professional.

## Primary personas

### Applicant

- Signs in and sees the contextual assistant and dashboard.
- Completes a guided bilingual intake.
- Saves progress and returns later.
- Uploads or registers requested documents.
- Adds shared notes and sees tasks, alerts, missing sections, and readiness indicators.

### Case manager

- Reviews all cases and operational metrics.
- Creates and updates cases for applicants.
- Manages documents, tasks, internal/shared notes, alerts, and case status.
- Uses searchable, paginated table or card views.

### Administrator

- Has all case-manager capabilities.
- Represents the authorization boundary for future user and configuration administration.

## In-scope vertical slices

1. JWT sign-in and current-user retrieval.
2. Seeded users, case, documents, task, note, and alert.
3. Case CRUD with role-aware authorization.
4. Nine-step intake with JSON section persistence and validation.
5. Progress and readiness calculations.
6. Bilingual contextual assistant with optional OpenAI provider.
7. Dashboard summary for cases, readiness, alerts, and overdue tasks.
8. Case workspace CRUD for documents, tasks, notes, and alerts.
9. Responsive Flowbite interface with mobile bottom navigation.
10. Vercel deployment documentation and CI quality gates.

## Authorization rules

- Applicants can access only their own cases.
- Applicants can create and update their case documents, but cannot verify them.
- Applicants can create shared notes; internal notes are hidden from them.
- Case managers and administrators manage tasks and alerts.
- Only staff can delete cases and documents.
- Backend authorization is authoritative; frontend visibility is presentation only.

## Explicitly out of scope

- Legal advice, eligibility determination, or recommendation of a bankruptcy chapter.
- Electronic court filing or official bankruptcy form generation.
- OCR, virus scanning, and binary file storage. The demo stores document metadata and optional file links.
- Payment processing.
- Production-grade audit retention, refresh tokens, MFA, and password recovery.
- Multi-firm tenancy.

## Definition of Done

- Backend health, authentication, case, dashboard, workspace, and assistant endpoints run.
- Applicant cannot read another applicant's case or create staff alerts.
- Applicant-created notes are always shared rather than internal.
- Staff can create, update, and delete workspace records according to role.
- Intake progress changes after a completed section is saved.
- UI supports Spanish and English.
- Main navigation adapts to mobile and desktop.
- Repository contains no secrets and CI validates backend and frontend.
