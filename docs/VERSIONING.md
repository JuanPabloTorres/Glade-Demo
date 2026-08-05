# Versioning policy

MatterReady uses Semantic Versioning in the `MAJOR.MINOR.PATCH` format.

- **MAJOR** — incompatible product, API, or data-contract changes.
- **MINOR** — backward-compatible features, workflow improvements, or substantial UI capabilities.
- **PATCH** — backward-compatible fixes, refinements, documentation, or operational hardening.

`VERSION` is the canonical release number. The versioning script synchronizes it with:

- `package.json`;
- `frontend/package.json`;
- `frontend/package-lock.json`;
- `backend/pyproject.toml`.

The frontend and FastAPI application both expose the same release version. Product changes do not edit these files manually in feature branches. After a pull request passes CI and is merged, the release workflow selects the release type, updates the version metadata, validates the exact release artifact, commits the release, tags it, and publishes it.

Local commands remain available for maintenance and recovery:

```bash
npm run version:check
npm run version:check-bump
npm run version:current
npm run version:patch
npm run version:minor
npm run version:major
```

A release version must be strictly greater than its parent version; changing to a lower or equal version fails CI.
