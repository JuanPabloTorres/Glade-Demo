---
name: api-contracts
description: Maintain verifiable one-to-one traceability between frontend requests and FastAPI operations.
---

# API Contract Skill

1. Define or update the operation in `contracts/api-contracts.json`.
2. Run `npm run contracts:generate` in `frontend`.
3. Use the contract entry in the FastAPI router decorator.
4. Use the generated endpoint entry in the frontend API client.
5. Run backend `tests/test_api_contracts.py`.
6. Update `docs/API-CONTRACTS.md` when behavior changes.
