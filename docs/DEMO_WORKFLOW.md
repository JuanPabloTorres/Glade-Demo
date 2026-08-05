# MatterReady evaluation workflow

MatterReady demonstrates one human job: preparing an incomplete matter for professional review.

## Guided evaluation

1. Sign in with the prefilled evaluation account.
2. Open **Elena Rivera**, the guided example.
3. Review the readiness overview and the highlighted next action.
4. Open **Review decisions** and resolve the email difference.
5. Open **Documents** and add the missing proof-of-address document.
6. Return to **Overview** and confirm that readiness reflects the completed work.

## Why evaluation data is stored in the browser

Vercel Functions do not provide a durable shared SQLite filesystem. A database file under `/tmp` may disappear or differ between function instances, which previously caused valid links to display `This matter could not be found.`

The public portfolio now stores invented evaluation matters in browser `localStorage`. This makes the demo deterministic across refreshes and new deployments without pretending that temporary serverless SQLite is production persistence.

JWT authentication, API contracts, backend tests, and the remote SQLAlchemy implementation remain in the project. A real client-data deployment must set `VITE_DEMO_STORAGE=remote` and provide a persistent PostgreSQL `DATABASE_URL`.

## Data safety

- Use invented data only.
- Evaluation matters remain in the current browser.
- Clearing browser storage resets the workspace.
- The guided example is recreated automatically when no evaluation state exists.
