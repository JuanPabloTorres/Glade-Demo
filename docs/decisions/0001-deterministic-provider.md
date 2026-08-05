# ADR 0001: Deterministic document intelligence provider

## Decision
Use a rules-based provider as the default document-intelligence implementation.

## Reason
The interview deployment must work without paid credentials and produce repeatable test results. Services depend on a provider protocol and factory, so a hosted AI provider can be added later without changing controllers or use cases.
