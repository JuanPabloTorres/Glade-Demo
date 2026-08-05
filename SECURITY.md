# Security policy

MatterReady is a portfolio evaluation environment and must use invented demonstration data only.

## Authentication

- The API issues signed JWT bearer tokens with issuer, audience, issued-at, and expiration claims.
- Password verification uses Argon2 through `pwdlib`.
- Protected matter endpoints require a valid bearer token.
- The browser stores the short-lived demo session in `sessionStorage`, clears it on expiration, and redirects to login after a 401 response.
- Production deployments must override `JWT_SECRET`, demo credentials, and the demo identity through environment variables before storing real information.

## UI controls

- The public login page is the only unauthenticated product screen.
- Internal controller names, routing diagnostics, stack traces, and secrets are not shown in the interface.
- Human review is required before a document value can replace the approved client record.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Do not place credentials, access tokens, personal records, or exploit payloads in public issues.
