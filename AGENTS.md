# Agent Operating Contract

Every agent must read this file and its own `agents/<name>/SKILL.md` before changing code.

## Non-negotiable rules

1. Work only inside the paths assigned by the agent skill.
2. Do not overwrite another agent's work or reformat unrelated files.
3. Shared contracts must be changed through an explicit handoff note in `docs/architecture/DECISIONS.md`.
4. Preserve bilingual behavior, accessibility, role authorization, and legal-safety boundaries.
5. All user-visible copy belongs in i18n resources; all backend configuration belongs in settings/constants/enums.
6. Frontend authorization is presentation only. Backend dependencies and services enforce access.
7. Add or update tests for every behavior change.
8. Never commit secrets, tokens, production data, or real client information.
9. Run the relevant quality commands before handoff.
10. Record assumptions, changed contracts, and unresolved risks in the final handoff.

## Shared ownership zones

The following files require coordination because they affect multiple agents:

- `README.md`
- `docs/architecture/DECISIONS.md`
- `backend/app/domain/enums.py`
- `backend/app/schemas/`
- `frontend/src/types/index.ts`
- `.github/workflows/ci.yml`

## Handoff format

```text
Goal:
Paths changed:
Contracts changed:
Tests executed:
Known risks:
Next owner:
```
