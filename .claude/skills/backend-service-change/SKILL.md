---
name: backend-service-change
description: Implement FastAPI behavior through actual DTO, service and provider boundaries without inventing persistence abstractions.
---
# Backend service change

Inspect current service patterns. Put orchestration in services, HTTP concerns in routers, typed data in Pydantic DTOs and provider variability behind protocols. Real persistence exists (`backend/app/repositories/*`, SQLAlchemy + Alembic) — depend on the repository protocols, don't call SQLAlchemy directly from a router/service, and don't reintroduce a stateless assumption. Schema changes need an Alembic migration. Add unit, API, authorization (including ownership/cross-case isolation) and negative-path tests.
