---
name: api-contract-change
description: Change an API operation while preserving one-to-one traceability across the shared registry, FastAPI and the frontend client.
---
# API contract change

1. Update `contracts/api-contracts.json` first.
2. Generate `frontend/src/api/apiContracts.generated.ts`.
3. Use the registry in router and frontend client; no magic endpoint strings.
4. Keep router thin and response DTO explicit.
5. Add service/API tests and generated-file diff check.
6. Update `docs/API-CONTRACTS.md`; use major version for incompatible contracts.
