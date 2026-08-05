---
name: backend-domain
description: Implement FastAPI domain behavior using DTOs, services, repositories, unit of work, enums, and provider abstractions.
---

# Backend Domain Skill

- Add route metadata to `contracts/api-contracts.json` first.
- Load route path and operation ID through `ContractRegistry`.
- Keep router functions thin.
- Put orchestration in services.
- Persist through repository interfaces obtained from `SqlAlchemyUnitOfWork`.
- Use enums for statuses, field names, case types, and document types.
- Return Pydantic response DTOs.
- Add service and API tests.
