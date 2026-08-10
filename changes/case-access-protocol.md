---
taskId: case-access-protocol
type: patch
scope: Backend service repository boundary
---
# Summary

Make `CaseAccessService` depend on the existing case repository protocol and
add an architecture regression test that rejects concrete SQLAlchemy repository
imports from application services.

# User-visible behavior

No behavior or API contract changes. Case ownership and attorney access checks
continue to use the same repository operations and responses.

# Migration / compatibility

No database, configuration, or client migration is required.

# Tests and evidence

- Service architecture dependency guard.
- Client and attorney case-ownership regression suites.
- Backend lint, type checking, and full test suite.

# Risks / limitations

The change is limited to dependency typing and import direction; runtime
repository construction remains unchanged.
