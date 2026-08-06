# API Summary

Base prefix: `/api/v1`

## Authentication

- `POST /auth/login` — OAuth2 form fields `username` and `password`.
- `GET /auth/me` — current authenticated user.

## Users

- `GET /users/applicants` — staff-only applicant list.

## Dashboard

- `GET /dashboard/summary` — role-scoped case, readiness, alert, and overdue-task metrics.

## Cases

- `GET /cases` — owned cases for applicant; all cases for staff.
- `POST /cases` — create a case. Staff must include `applicant_id`.
- `GET /cases/{case_id}` — role-authorized detail.
- `PATCH /cases/{case_id}` — update metadata/status.
- `PUT /cases/{case_id}/sections/{section_key}` — persist one intake step.
- `DELETE /cases/{case_id}` — staff only.

## Case workspace

- `GET /cases/{case_id}/workspace` — documents, tasks, visible notes, and alerts.
- `POST|PATCH|DELETE /cases/{case_id}/documents[/{document_id}]` — document metadata CRUD.
- `POST|PATCH|DELETE /cases/{case_id}/tasks[/{task_id}]` — staff task CRUD.
- `POST|PATCH|DELETE /cases/{case_id}/notes[/{note_id}]` — shared/internal note CRUD.
- `POST|PATCH|DELETE /cases/{case_id}/alerts[/{alert_id}]` — staff alert CRUD.

## Assistant

- `POST /assistant/chat` — contextual response using the authorized case.

## System

- `GET /health` — deployment health check.

Interactive OpenAPI documentation is available at `/docs` when the backend is running.
