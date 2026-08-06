# Coding Standards

## General

- Prefer explicit names and small units with one responsibility.
- Centralize configuration, enums, legal disclaimers and visible copy.
- Comments explain intent, risk or tradeoffs; they do not narrate obvious syntax.
- No secrets, magic role strings or duplicated status values.

## Python

- Type all public functions.
- Keep HTTP concerns in routers/dependencies.
- Keep use-case rules in services.
- Keep database queries in repositories.
- Validate request and response contracts with Pydantic.
- Use SQLAlchemy 2.x typed mappings.

## React/TypeScript

- Use strict TypeScript.
- Build primitives first, then composite components, then pages.
- Use TanStack Query for server state and React Hook Form for forms.
- Validate submitted data with Zod.
- Keep user-visible strings in i18n.
- Preserve keyboard access, visible focus, labels, error roles and touch-friendly controls.
- Tables that represent managed resources provide CRUD actions and a card alternative.

## Testing

- Unit-test business calculations and validation boundaries.
- Integration-test authentication, ownership and critical flows.
- Add browser tests before declaring the demo presentation-ready.
