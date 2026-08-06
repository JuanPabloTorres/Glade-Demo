# Security Model

## Authentication

- OAuth2 password form for sign-in.
- Short-lived JWT access token.
- Argon2 password hashing.
- Token secret and algorithm loaded from environment configuration.

## Authorization

- `applicant`: reads and updates only owned cases.
- `case_manager`: reads all cases, creates cases for applicants, updates and deletes cases.
- `admin`: same MVP permissions as case manager, reserved for expanded administration.

Every protected endpoint resolves the current user server-side. Hidden frontend buttons are not treated as authorization.

## AI data handling

- External AI is disabled by default.
- When enabled, only case context needed for the response is sent from the backend.
- API keys remain server-side.
- Real client data must not be used in the public demo.
- The assistant is instructed not to invent facts, make legal determinations or promise outcomes.

## Production gaps intentionally documented

Before production use, add refresh-token rotation, MFA, password recovery, rate limiting, immutable audit events, encrypted object storage, retention policy, tenant isolation, structured document permissions, security headers and formal privacy/legal review.
