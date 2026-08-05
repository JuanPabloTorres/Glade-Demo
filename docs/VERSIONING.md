# Versioning and deployment policy

MatterReady uses Semantic Versioning in the `MAJOR.MINOR.PATCH` format.

- **MAJOR** — incompatible product, API, or data-contract changes.
- **MINOR** — backward-compatible features, workflow improvements, or substantial UI capabilities.
- **PATCH** — backward-compatible fixes, refinements, copy changes, or operational hardening.

## Single source of truth

`VERSION` is the canonical release number. The versioning script synchronizes it with:

- `package.json`
- `frontend/package.json`
- `backend/pyproject.toml`

The frontend reads `VERSION` during the Vite build and displays it in the application shell. FastAPI reads the same file for its OpenAPI application version.

## Commands

```bash
npm run version:patch
npm run version:minor
npm run version:major
npm run version:check
npm run version:check-bump
```

Every publishable commit must increment the version. GitHub Actions validates both synchronization and the increment before backend, frontend, build, and browser tests run.

## Deployment mapping

The Vercel project must remain connected to `JuanPabloTorres/Glade-Demo` through Git integration:

- Push to a feature branch → Vercel Preview deployment.
- Push or fast-forward merge to `main` → Vercel Production deployment.

No Vercel tokens, project credentials, or environment secrets belong in the repository.
