# MatterReady

MatterReady is an authenticated, human-reviewed legal operations workspace that turns client intake and supporting documents into explicit decisions, readiness scoring, and an auditable review package.

## Human workflow

1. Sign in as a case reviewer.
2. Create and assign a matter.
3. Confirm the approved client record.
4. Analyze identity and address documents.
5. Resolve every difference explicitly.
6. Deliver the matter when readiness reaches 100%.

The system does not silently replace client information. Document intelligence identifies possible differences; a professional chooses the accepted value.

## Demo access

- Email: `reviewer@matterready.app`
- Password: `MatterReady!2026`

The demo uses invented data and a short-lived JWT. Set a private `JWT_SECRET` and replace the demo identity before using real information.

## Stack

- React 19, TypeScript, Vite, Flowbite React, TanStack Query
- Python 3.13, FastAPI, PyJWT, pwdlib/Argon2, Pydantic 2, SQLAlchemy 2
- SQLite for the public evaluation environment or PostgreSQL through configuration
- Ruff, mypy, Pytest, ESLint, Vitest, and Playwright
- GitHub Actions and Vercel Git Integration

## UI policy

Interactive controls and complex interface patterns use Flowbite React components: Navbar, Dropdown, Avatar, Modal, Tabs, Card, Alert, Badge, Button, Progress, Label, TextInput, Textarea, Select, Spinner, and Footer. Tailwind utilities are limited to responsive layout, spacing, and accessible surface styling.

## Local development

```bash
cp .env.example .env
make install
make backend
# in another terminal
make frontend
```

- Web: `http://localhost:5173`
- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`

## Delivery and audit

Every delivered change must increment SemVer and pass synchronized contracts, locked dependencies, backend checks, frontend checks, production build, and the complete Playwright browser workflow.

> Evaluation software only. Use invented demonstration data. Not legal advice and not affiliated with Glade.
