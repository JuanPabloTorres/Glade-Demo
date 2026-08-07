---
taskId: fleet-consolidation
type: minor
scope: integration of the responsive gate, navigation shell, parallel governance and AI grounding
---

# Summary

Consolidates every live agent branch onto `main` and releases 4.2.0. Branched from `main` at
`5e9c7c8` (v4.1.0, "governed modal shell, assistant as a dialog, live-agent evidence").

Each stream keeps its own change fragment as the detailed record; this one is the integration-level
account of what was reconciled and why, which is the part no single stream could write.

- `0b2cdcd` — the app-wide overflow gate, and the 320px spill it found. See
  `changes/ui-mobile-responsive.md`.
- `677c9eb` / `e418550` — the responsive navigation shell, section routing, help page.
- `62c4590` / `b5ea725` — parallel-safe agent governance. See
  `changes/parallel-agent-governance.md`.
- `1dd446c` — grounding the deterministic draft in the user's message. See
  `changes/ai-context-grounding-2026-08-06.md`.
- `e1a6b81`, `c09b963` — the gate failures the consolidated tree exposed.

`feat/strands-agent-layer` needed no work here: it had already reached `main` through
`integration/strands-agent-layer` as 4.0.0 (`7b6ad83`) before this pass started.

# What had to be reconciled

Three collisions, all of them real disagreements rather than textual conflicts.

**The assistant had two mutually exclusive designs.** 4.1.0 had just centred it on the governed
modal shell. `feat/ui-shell-responsive-nav`, written earlier but never merged, made it a route with
its own sidebar and bottom-bar entries and rewrote `ChatPanelContext` to navigate rather than hold
open/closed state. Resolved in favour of the route, on the owner's call: a URL is linkable, survives
a reload and takes part in browser history, and it stops the assistant being a second navigation
surface competing with the bottom bar on a phone. The branch's `ChatPanel` predated 4.0.0 and still
spoke the old contract, so `main`'s was kept for its logic — cards, `degraded`, the server-composed
response, and the drawer-era controls already removed — and moved into the branch's container. The
14 tests whose assistant replies are verbatim transcripts of a live agent run came with it.

**`main` already carried an earlier pass at the same initiative.** `9fdc614` had landed a Help page,
section navigation and an EN/ES toggle from a different branch. The navigation branch's versions are
fuller and supersede them.

**Two governance rewrites touched the same files.** The strands delivery had made paths resolve per
checkout; `chore/parallel-agent-governance` rewrites the same tooling with cross-checkout claims, an
edit ledger, atomic locked state and archiving instead of deletion, while still reading the legacy
shared manifest as a fallback. Taken whole — it is a superset.

`assistantActionHref` had to move from `?focus=` to the new section paths. It keeps encoding the
case id, which `ROUTES.caseSection` does not: this is the one caller whose input arrives from a
model-authored response, and `case/../admin` would otherwise escape its path segment.

# What the consolidated tree exposed

Defects that only appear once the streams are in the same tree, none of which any individual branch
could have caught:

- `AppLogo`'s link had `min-w-0` on the text span inside it but not on itself. As a flex item of the
  header row its automatic minimum size was its content, so it refused to shrink, the `truncate`
  inside could never engage, and at 320px the product name pushed the header's controls 19px off
  screen. The same defect, in grid form, put the Documents stage's two cards at their 320px
  min-content width inside a 288px track.
- `HelpPage` imported Flowbite's `Card` directly, which `agent:flowbite` rejects for a page.
  `app-card` already carries the surface with `!important`, so the Card contributed only padding —
  replaced with a `<section>` rather than registered as an exception.
- Three e2e specs asserted behaviour the merge replaced, and all three had been passing.
  `responsive-overflow` located the bottom bar by role and accessible name; both navigation surfaces
  share that name correctly, so at desktop it resolved to the sidebar's `<nav>` and "the bottom bar
  is gone" was measuring an element that is supposed to be there. Two workflow specs asserted the
  literal reply `"La plantilla financiera está completa."` — the very string the grounding fix
  removed, because it was the answer to every question.

# Migration / compatibility

No API or contract change. Case sections become routes (`/case/:caseId/:section`); bookmarked
`?focus=` links still resolve through `FOCUS_PARAM_TO_SECTION`. `LanguageSelector`,
`MobileNavigation` and `MobileBottomNavigation` are replaced by `LanguageToggle` and
`BottomNavigation`.

# Tests and evidence

Against `438e565`, the released tree:

- Frontend: 78 tests, 14 files. Lint 0 errors (10 pre-existing warnings). i18n parity across 14
  module files. Production build.
- Backend: 147 tests, 14 new. `ruff` clean.
- E2E: 63 tests, full serial run green — `assistant-page` (8), `documents-add-evidence` (13),
  `matter-workflow` (3), `responsive-overflow` (39) across 320–1440 for both roles.
- `npm run agent:verify`: architecture and Flowbite checks pass, with the two pre-existing
  registered migration exceptions.

# Risks / limitations

Carried forward from 4.0.0's live-agent run and still unfixed, recorded in
`changes/chat-modal-centered.md`: `handled_by` can come back empty, a refusal that tells the user to
consult a lawyer does not raise `requires_attorney_review`, and action labels leak across languages.

`mypy` reports 6 pre-existing `arg-type` errors in `case_context_builder`, `runtime` and `security`.
They predate this pass — verified by checking `main` before the port — and are untouched by it.

The command hook's mutation pattern treats any `>` as a mutation, so a read-only command carrying
`2>&1` is refused on `main`. Harmless but noisy; not fixed here, since the tooling belongs to the
governance stream.

`Glade-Demo-ui-mobile-responsive` still has five uncommitted files in its checkout. Their content is
in `main` — it was brought across file by file rather than merged, because that branch's `AppShell`
fix was already present. Nothing there is unreleased work.
