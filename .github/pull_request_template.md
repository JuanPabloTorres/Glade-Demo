## Change summary

Describe the product or engineering outcome and link the task/change fragment.

## Release type
- `[major]` — incompatible API/data/product change
- `[minor]` — backward-compatible capability or flow
- `[patch]` — fix, refinement, docs or hardening

## Governance
- [ ] Work occurred on a governed branch/worktree with path ownership.
- [ ] A change fragment exists and version files are synchronized by the release owner.
- [ ] New dependencies/architecture include an ADR; new flows include a flow spec.
- [ ] Shared contracts, i18n and generated files are synchronized.

## Validation
- [ ] `npm run agent:validate`
- [ ] Backend lint, mypy and pytest
- [ ] Frontend i18n, lint, tests and build
- [ ] E2E and visual/responsive/a11y evidence when behavior or UI changed
- [ ] No secrets, real personal data or unresolved P0/P1

## Evidence and limitations

List commands, screenshots/artifacts, deployment preview and honest known limitations.
