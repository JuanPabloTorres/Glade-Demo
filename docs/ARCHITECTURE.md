# Architecture

## System context

```text
React/Vite client
      |
      | HTTPS + JWT
      v
FastAPI application
  ├── API routers
  ├── authorization dependencies
  ├── application services
  ├── repository interfaces/implementations
  ├── SQLAlchemy domain models
  └── assistant provider abstraction
      ├── deterministic demo provider
      └── optional OpenAI Responses provider
      |
      v
SQLite local / PostgreSQL deployed
```

## Backend layers

- **API:** HTTP translation, dependency injection and response models.
- **Services:** use cases, authorization-sensitive business rules and calculations.
- **Repositories:** persistence queries and transaction-facing operations.
- **Domain:** enums and SQLAlchemy entities.
- **Schemas:** validated transport contracts.
- **AI providers:** external-model boundary behind a protocol.

The API layer must not contain persistence queries. Repositories must not contain HTTP exceptions except where explicitly standardized. Services own business rules.

## Frontend composition

```text
ui primitives -> composite components -> feature modules -> routed pages
```

- `components/ui`: small reusable presentation components.
- `components/composite`: combined table/card and workflow components.
- `features`: domain-focused modules.
- `hooks`: shared data-access behavior.
- `layouts`: responsive navigation shells.
- `i18n`: all user-facing localized copy.

## Data model

- `User`: identity and role.
- `BankruptcyCase`: applicant ownership, status and readiness metadata.
- `IntakeSection`: one unique JSON payload per case and step.

The JSON section strategy keeps this demo small while preserving a clear path toward normalized income, expense, asset, debt and document tables.

## Readiness calculation

Readiness is not a legal score. It is an administrative completeness indicator:

```text
progress = completed sections / total sections
readiness = progress - data-quality penalties
```

## Architecture decisions

See `docs/architecture/DECISIONS.md` for decisions that affect multiple agents.
