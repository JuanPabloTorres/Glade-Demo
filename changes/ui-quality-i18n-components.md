---
taskId: ui-quality-i18n-components
type: minor
scope: frontend shell, case workspace, dashboards, assistant entry, analysis i18n
---
# Summary

A quality pass over the screens the demo actually gets looked at on. Four
threads, all reported from a live session:

1. **The language leaks.** An English session read its case history, its
   evidence checklist, its demo case file and the assistant's opening line in
   Spanish. Each had its own cause; none of them was a missing translation.
2. **Two ways into the assistant.** A sidebar entry, a raised bottom-bar slot
   and a floating button — three controls, two surfaces, different behaviour.
3. **Screens that spent their space badly.** The case overview opened with
   twenty bullet lines and no figures; the documents screen led with an empty
   panel; the sidebar's collapse control sat on a row of its own.
4. **Page-local markup.** Every panel across the workspace and both dashboards
   was a hand-written `<Card>`, and the copies had drifted.

# User-visible behavior

**Language.**

- The evidence checklist is translated. It was the one generated list still
  Spanish-only, because satisfaction was decided by intersecting the
  requirement's Spanish words with the evidence type's Spanish label —
  translating either side would have zeroed `evidence_score`. Matching now runs
  on canonical evidence-type slugs (`EVIDENCE_REQUIREMENT_TYPES`), so the labels
  are free to travel. That also fixed the matching itself: `"Estados bancarios
  recientes"` never matched `"Estado bancario"` (plural against singular) while
  `"Contrato de arrendamiento o estado hipotecario"` matched it on the stray
  word `"estado"` — a bank statement satisfied the housing requirement and not
  the banking one.
- The per-line tick comes from the server (`CaseAnalysisDto.evidence_requirements`)
  instead of being re-derived in the workspace. The two matchers disagreed with
  each other and with `evidence_score`, and the frontend's stopped working at all
  once the requirements were translated — an English requirement shares no words
  with a Spanish label.
- Case-history entries persisted before locale keys existed are migrated on
  read, recovering the key from the entry's `stage`. Those entries were Spanish
  prose frozen at creation time, so an English session read the whole timeline
  in Spanish and switching language changed nothing.
- The assistant's opening greeting carries a locale key. It is the one message
  nobody said — the product wrote it before the conversation started — so it is
  the one message that re-labels on a language switch. Everything a person or the
  model produced stays verbatim.
- The chat avatar initials were the literals `"Tú"` / `"IA"`; an English session
  read "IA" beside every answer.
- The demo seed is generated in the session's language. It is read through
  `i18n.getFixedT(activeLanguage())` rather than the render-time `t`, because the
  seed is built in a `useState` initializer that runs before `LanguageContext`'s
  effect has applied the stored preference — using `t` there produced a Spanish
  case file for an English session that no amount of switching could fix.
- The stage example lines printed their own label twice ("Example: Example: …")
  because `exampleLabel` and the example string both carried it.

**One way into the assistant.**

- The sidebar entry and the bottom bar's raised centre slot are gone. The
  floating launcher is the only entry point, on every breakpoint — it used to be
  desktop-only.
- It clears the bottom bar's height on a phone rather than sitting on top of it,
  and shows the mark alone below `sm`, where a pill wide enough for "Abrir
  asistente" spans a third of the viewport.
- The panel takes the whole viewport below `md` instead of a partial sheet that
  showed about three lines of an answer.
- `/assistant` still resolves. It redirects into the panel and carries its
  `?prompt=` through, so bookmarks and suggestion links keep working.
- A navigating suggestion minimizes the panel, which would otherwise cover the
  section it just opened.
- "My case" took the bar slot the assistant vacated, so a phone gains a
  destination the sidebar always had. The bar sizes its columns to the role's
  destinations (five for a client, four for an attorney) rather than a fixed five.

**Layout.**

- The sidebar's collapse toggle sits on the brand row. It was on a row of its
  own under the logo, right-aligned, reading as a gap in the rail rather than as
  a control. It is also quieter — inherited colour, smaller glyph.
- The case overview leads with warnings, then the figures, then next steps and
  the consultation prep side by side. The Chapter 7 / Chapter 13 questions are a
  disclosure: reference material for a conversation that has not happened yet,
  which was pushing the case's own numbers off the first screen.
- The documents screen leads with the checklist and follows with the uploaded
  documents. Reversed, a client who had uploaded nothing met a tall blank card
  where the answer to "what do I still owe?" should have been. The checklist is
  two columns from `sm` up, with a progress line that agrees with the badge above
  it.
- Panels are their natural height (`items-start`), not stretched to the tallest
  in the row, and their content starts at the top — flowbite-react's `Card` body
  is `justify-center`, which floated short panels' headings into the middle.

**Reusable components** (`frontend/src/components/case/`): `CasePanel`,
`InsightList`, `MetricTiles`, `EvidenceChecklist`, `EvidenceInventory`,
`AttorneyDiscussionPanel`. The workspace, the client dashboard and the attorney
dashboard compose these instead of restating what a section looks like. Three
metric grids had drifted into three number sizes; five bullet lists into five
bullet treatments.

# Migration / compatibility

- `CaseAnalysisDto.evidence_requirements` is **additive**. `required_evidence`
  is unchanged and still populated, so a client that only renders text is
  unaffected. The frontend treats the new field as optional and falls back to
  untickable lines against an older backend.
- No operation, route, method or `operation_id` changed;
  `contracts/api-contracts.json` is untouched.
- Workspace storage moves to `freshstart-bankruptcy-workspace-v3`. A v2 payload
  is read and migrated, not discarded — no demo case is lost.
- `AppNavItem.primaryAction` is removed. It existed only for the assistant.
- `buildAttorneyNavItems()` no longer takes the open case id; it only needed it
  to build the assistant's `?case=` link.

# Tests and evidence

- Backend: 360 pass. `test_analysis_localization.py` gains five cases covering
  the translated checklist, that satisfaction and `evidence_score` are identical
  in both languages, that a document satisfies its own requirement and not a
  neighbour's, and that the ticks and the score are read off one list.
- Frontend: 143 unit tests pass, including a new
  `components/case/caseComponents.test.tsx` (truncation is reported rather than
  silent; ticks come from the server; no divide-by-zero on an empty checklist).
- E2E: 101 pass. New `e2e/ui-quality-evidence.spec.ts` captures the screenshots
  and asserts what they show — no Spanish string in an English session and no
  English string in a Spanish one, across client home, case overview, documents
  and activity, at 390 and 1440, plus the attorney home; no horizontal overflow
  on any of them; one assistant entry point; the panel filling a phone.
- Screenshots: `frontend/test-results/ui-quality-evidence/`. Findings and the
  before/after read: `docs/evidence/ui-quality-i18n-2026-08-08.md`.
- `npm run agent:flowbite`, `i18n:check`, `lint` and `build` pass.

# Risks / limitations

- **Behavioural change in `evidence_score`.** Requirements that could never be
  satisfied under the word matching (business records, lien documents) now map to
  real slugs, and the housing requirement no longer accepts a bank statement. A
  case's evidence score can therefore move in either direction. This is the fix,
  not a side effect, but it is a number the demo shows.
- **The seed follows the language it was created in.** Switching language later
  re-labels the timeline and the greeting (they carry keys) but not the synthetic
  rows, which are ordinary case data by then — the same rule that protects
  anything the user typed. `resetDemo` regenerates them in the current language.
- **`ChatPanel`'s `variant="page"` has no caller.** It is still the default and
  still covered by tests; removing it is a separate cleanup, not something to
  fold into a change this wide.
- The guided-flow stepper still scrolls horizontally inside its own container on
  a phone. Out of this change's scope; it is `CaseStageStepper`, owned elsewhere.
