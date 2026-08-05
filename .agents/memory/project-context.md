# Project Context Memory

## Product
MatterReady is an interview demo inspired by AI-native legal operations: intake, canonical case data, document intelligence, conflict resolution, and filing-readiness tracking.

## Core workflow
1. Create a matter from prospect intake.
2. Add structured intake data.
3. Add a text-based document.
4. Extract facts through a provider interface.
5. Detect conflicts against canonical matter data.
6. Resolve conflicts with an explicit human decision.
7. Recalculate readiness from required fields and documents.

## Domain invariants
- A matter is the aggregate root.
- Canonical values live on the matter record.
- Extracted facts preserve their source and history.
- A conflict is never silently overwritten.
- Readiness is derived, not persisted.
- All demo data is synthetic.
