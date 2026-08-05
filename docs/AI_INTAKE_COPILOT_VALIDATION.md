# AI Intake Copilot validation

The release is validated against one human outcome: produce a source-attributed case packet from a conversation and supporting evidence.

## Acceptance path

1. Authenticate with the evaluation account.
2. Describe the intended professional-review outcome.
3. Answer the copilot's questions for intake type, client name, email, phone, and location.
4. Analyze a supporting document containing a conflicting email value.
5. Confirm that the evidence matrix shows both values and their sources.
6. Select the supported value through a human review action.
7. Confirm 100% readiness and no open issues.
8. Reload the browser and confirm that the conversation and packet remain available.

## Required gates

- synchronized Semantic Versioning;
- generated contract consistency;
- Ruff and mypy;
- Python compilation and pytest;
- ESLint, Vitest, and production build;
- Playwright Chromium end-to-end validation;
- Vercel Preview deployment.

The optional PyTorch/Transformers runtime is not required for deterministic acceptance. Model-generated language may improve wording but cannot create evidence, change readiness rules, or resolve conflicts.
