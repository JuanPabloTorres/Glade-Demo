# Engineering Evaluation Notes

## Product slice
MatterReady demonstrates one bounded, high-value legal operations workflow rather than a broad mock platform:

1. capture a prospect as a matter;
2. maintain canonical intake data;
3. process a synthetic document through a provider abstraction;
4. preserve extracted fact lineage;
5. surface contradictions as explicit conflicts;
6. require a human resolution decision;
7. calculate case readiness from current facts, required documents, and unresolved conflicts;
8. record an audit timeline.

## Architectural choices
- **Modular monolith:** appropriate for the demo size, with explicit seams for future services.
- **FastAPI routers as controllers:** thin HTTP adapters with DTO input/output.
- **Application services:** own orchestration and business rules.
- **Repository + unit of work:** persistence is replaceable and transaction boundaries are explicit.
- **Provider factory:** deterministic extraction is the default; an LLM/OCR adapter can be added behind the same protocol.
- **Derived readiness:** avoids stale persisted scores.
- **Shared API contract registry:** makes each frontend request traceable to method, route, controller, action, and OpenAPI operation ID.
- **Reusable component hierarchy:** Flowbite atoms, molecules, organisms, and pages.

## Deliberate trade-offs
- The demo accepts document text rather than binary uploads/OCR to keep evaluation focused on domain behavior.
- Authentication and authorization are excluded, but their expected boundaries are documented.
- SQLite is the zero-setup local default; PostgreSQL is supported through `DATABASE_URL` and Docker Compose.
- The deterministic extraction provider avoids external credentials and nondeterministic demo failures.

## Production extensions
- organization/tenant isolation and RBAC;
- object storage, malware scanning, OCR, and document queues;
- encrypted PII and field-level audit controls;
- idempotency keys and optimistic concurrency;
- background jobs and provider retries;
- OpenTelemetry, structured logs, metrics, and alerting;
- real LLM extraction with evaluation datasets and confidence thresholds;
- court-form generation and filing integrations, subject to legal/compliance review.
