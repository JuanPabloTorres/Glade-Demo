# Case Context Architecture

Living document for Block 9 of `docs/plans/FRESHSTART-UX-AI-IMPLEMENTATION-PLAN.md`. Complements `docs/architecture/AI-PROVIDER-ARCHITECTURE.md`.

## What changed and why (the `3.0.0` trigger)

`POST /api/v1/bankruptcy/guide` used to return `GuidanceResponseDto` (`reply`, `suggested_actions: list[str]`, `focus_section`, `disclaimer`). It now returns `AssistantResponse` (`backend/app/schemas/assistant.py`): `message`, `intent`, `suggested_actions: list[AssistantAction]`, `focus_section: str | None`, `requested_fields`, `requested_documents`, `warnings`, `summary_updates`, `requires_attorney_review`, `confidence`, `disclaimer`. This is an incompatible response-shape change on an existing operation (`bankruptcy.guide` keeps the same path/operationId in `contracts/api-contracts.json` — only the payload shape changed), which is exactly the audit's documented reason for the `3.0.0` major bump (see `docs/plans/FRESHSTART-UX-AI-IMPLEMENTATION-PLAN.md` §0).

## `CaseContextBuilder`

`backend/app/services/case_context_builder.py` reduces a full `BankruptcyCaseDto` + its computed `CaseAnalysisDto` into `CaseContextDto` — the only thing any AI provider ever sees (`BaseAIProvider.generate(*, context: CaseContextDto, message: str)`, updated in this block from taking the raw request/analysis).

What's reduced, and why:

- **Household** collapses to a single `household_summary` string (e.g. "3 persona(s) en el hogar; 1 dependiente(s); estado civil: married; vivienda: rent") — not raw `municipality`/`marital_status`/etc. fields. `test_case_context_builder.py::test_household_summary_omits_raw_municipality_and_phone` asserts the municipality never appears in the summary and that `client_phone`/`client_email` aren't even attributes on the context object (not just blank — absent from the type).
- **Attorney notes are redacted by role**: `attorney_notes` is populated only when `role == "attorney"`; a client's context always gets `None`, even though the source case has the note. Tests: `test_attorney_notes_visible_to_attorney` / `test_attorney_notes_redacted_for_client`.
- **Pending documents**: `pending_documents` lists evidence names with `status == "requested"` — the one "what does the attorney still need from the client" signal this stateless endpoint can actually compute per-request.
- **Case isolation**: since the backend is stateless (no case store — see the audit), "isolation between cases" reduces to "building context for case B never carries over anything from building context for case A in the same process." `test_two_different_cases_never_share_context_state` builds two different cases back-to-back through the same `CaseContextBuilder` instance and asserts each context only reflects its own case's id/name/notes.

## Documented gap: no timeline in context

Master instruction §6.2 lists "timeline" as a context field. `BankruptcyCaseDto` (the actual request payload — see `backend/app/schemas/bankruptcy.py`) has no `timeline` or `messages` fields at all; the frontend never sends them (case state is browser-local, and the backend is stateless per the audit's "no persistence layer" finding). `CaseContextDto` therefore has no timeline field — adding one would require the case payload contract to carry timeline data first, which is a larger, separate change tied to persistence, not attempted here. This is called out in `CaseContextDto`'s docstring, not hidden.

## Role-authorization fix

The audit flagged: `GuidanceRequestDto.role` was accepted as-is from the request body, never checked against the JWT's `role` claim — a client-authenticated session could set `role: "attorney"` in the body and get attorney-scoped guidance. Fixed in `backend/app/api/routers/bankruptcy.py:guide_case`: the endpoint now takes the authenticated `current_user` (previously discarded as `_`) and returns `403 Forbidden` when `body.role != current_user.role`, before the request ever reaches `BankruptcyGuidanceService`. Test: `test_guidance_rejects_role_mismatched_with_session`.

This is the one fixable piece of the audit's authorization finding. True case-ownership enforcement (attorney can only open cases assigned to them) still requires a case store that doesn't exist yet — the audit already scoped that to "must be designed together with persistence," not this refactor.

## `AssistantAction` and the `"ask"` type

`suggested_actions` is now `list[AssistantAction]` (`id`, `label`, `icon`, `action_type`, `target`) instead of bare strings, per §6.5. The existing chat already offered follow-up prompts the user can send verbatim (chapter-comparison questions, discussion points, next steps) — none of §6.5's six example `action_type` values (`navigate`, `open_modal`, `upload_document`, `update_case`, `request_document`, `create_note`) describe "send this suggested message." Rather than force that into `navigate` (misleading) or silently drop a working, valuable piece of UX, `AssistantActionType` adds a seventh value, `"ask"`, documented inline in `backend/app/schemas/assistant.py` and `frontend/src/types/bankruptcy.ts`. It still renders as a Flowbite `Button` with an icon per §6.5's rendering rule — only the semantics of `target` differ (unused for `"ask"`).

## What's still pending (Block 10+)

- `requested_documents`, `requested_fields`, `warnings`, and `requires_attorney_review` are populated by `RuleBasedProvider` today but not yet driving any new UI beyond what `focus_section` already does — Block 10's guardrails work is expected to make fuller use of them (e.g., always setting `requires_attorney_review=True` when a guardrail trigger fires, regardless of role).
- `confidence` is always `None` — no provider currently produces a confidence score. Reserved for a future model-backed provider.
- `summary_updates` is always `[]` — reserved for when a chat turn can mutate case state (e.g., an "update_case" action actually applied), which no current action type does yet.
