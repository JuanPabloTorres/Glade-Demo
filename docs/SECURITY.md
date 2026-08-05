# Security and Privacy Boundaries

MatterReady is an interview demo and must only contain synthetic data.

## Included safeguards
- no secrets committed; configuration comes from environment variables;
- DTO validation at API boundaries;
- ORM entities are not serialized directly;
- explicit CORS configuration;
- audit events for state-changing workflows;
- document provider abstraction so external services can be isolated;
- no legal advice generation.

## Required before production use
- identity provider integration, tenant isolation, RBAC, and least privilege;
- encryption in transit and at rest, key rotation, and secret management;
- secure object storage and malware scanning for uploads;
- retention/deletion policies, access logs, and data-subject workflows;
- rate limits, idempotency, CSRF strategy where applicable, and abuse controls;
- dependency and container scanning;
- privacy, legal, and regulatory review for every supported practice area.
