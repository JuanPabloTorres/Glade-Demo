# Test Plan

## Automated coverage
- health endpoint contract;
- complete matter/intake/document/conflict/readiness workflow;
- shared contract registry against generated FastAPI OpenAPI;
- frontend endpoint path interpolation.

## Manual acceptance flow
1. Create an immigration matter.
2. Complete name, email, phone, date of birth, address, and summary.
3. Process the prefilled identity document.
4. Confirm name/address contradictions appear as conflicts.
5. Select either canonical intake or document value.
6. Confirm conflict status, matter values, readiness, and audit timeline refresh.
7. Inspect the traceability table and browser network headers.

## Required release gate
```bash
make verify
cd frontend && npm run build
```

Use synthetic data only.
