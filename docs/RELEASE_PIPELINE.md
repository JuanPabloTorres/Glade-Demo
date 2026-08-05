# Delivery pipeline

MatterReady uses a deliberately small and auditable delivery path.

1. Create a feature branch.
2. Increment `MAJOR.MINOR.PATCH` with one of the repository version commands.
3. Open a pull request to `main`.
4. GitHub Actions verifies version consistency, locked dependencies, backend quality, frontend quality, the production build, and the full Playwright browser workflow.
5. Vercel Git Integration creates the pull-request preview.
6. Merge only after all checks pass.
7. Vercel Git Integration deploys the merged `main` commit to production.

The CI workflow blocks a pull request whose version is not greater than `main`. This guarantees a version bump for every delivered change without adding release bots, recursive commits, deploy hooks, or repository secrets.

## Required project settings

- Vercel project: `glade-demo`.
- Repository: `JuanPabloTorres/Glade-Demo`.
- Production branch: `main`.
- Automatic Git deployments: enabled.

No Vercel token, project ID, deploy hook, or environment secret is stored in the repository.

## Evidence for audit

- GitHub pull request and reviewed diff.
- CI jobs: `versioning`, `backend`, `frontend`, and `e2e`.
- Playwright report artifact.
- Vercel Preview check on the pull request.
- Vercel Production check on the merged commit.
- Version displayed in the application and returned by `/api/v1/health`.

This pipeline is intentionally minimal so failures are visible, reproducible, and easy to audit.
