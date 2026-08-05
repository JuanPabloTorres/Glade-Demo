# Architecture

```text
React Page
  -> TanStack Query Hook
    -> matterApi method
      -> generated endpoint registry
        -> FastAPI router (controller/action)
          -> application service
            -> unit of work / repositories
              -> SQLAlchemy database
          -> document intelligence provider factory
```

## Backend layers
- `api`: HTTP adapters/controllers.
- `schemas`: request and response DTOs.
- `services`: use-case orchestration.
- `repositories`: persistence abstractions and implementations.
- `domain`: entities, enums, requirements, and invariants.
- `providers`: replaceable document-intelligence implementations.
- `core`: configuration, database, contracts, and shared errors.

## Frontend layers
- `api`: transport and endpoint mapping.
- `hooks`: server-state orchestration.
- `components/atoms`: smallest reusable UI elements.
- `components/molecules`: composed display elements.
- `components/organisms`: feature-level reusable sections.
- `pages`: route composition only.
