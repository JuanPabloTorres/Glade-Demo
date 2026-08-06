---
paths:
  - "backend/app/**/*.py"
  - "backend/tests/**/*.py"
  - "contracts/api-contracts.json"
---
# Backend API and services

Define contrato antes del endpoint. Router delgado, service explícito, DTO tipado y errores centralizados. No inventes ORM/UoW. Persistencia requiere ADR. Añade pruebas de auth, roles, ownership, error paths y contrato. Estados y tipos usan enums/catálogos, no strings mágicos.
