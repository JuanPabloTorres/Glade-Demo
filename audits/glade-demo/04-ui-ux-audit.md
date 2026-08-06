# 04 — UI/UX Audit

## Login

- Professional dark hero layout with background image + gradient overlay, graceful `onError`
  fallback (`backgroundFailed` state swaps to a plain color if the remote image fails to load —
  a real resilience detail, not decorative).
- Two one-click demo-persona buttons ("Entrar como cliente" / "Entrar como abogado") *and* a full
  manual email/password form with show/hide password, "remember me", and a disabled
  submit-while-busy state — good defense against double-submit.
- Client-side validation (email format, required password) before the network call; server
  validation errors are shown via the same i18n-driven error resolution used everywhere else.
- Language selector top-right, always visible pre-auth.
- Legal disclaimer visible on the login screen itself, not buried — appropriate given the product
  boundary this app is built around (not legal advice).

## Dashboard (client)

- Clear hierarchy: greeting → status → progress → next action → chat entry point → tasks →
  documents → financial summary → recent activity, matching the master brief's recommended
  information architecture almost exactly.
- KPIs are the actually-relevant ones for this domain (net income, expenses, cash flow, debt), not
  generic filler metrics.
- Empty states exist for "no pending tasks" / "no requested documents" rather than blank cards.

## Dashboard (attorney)

- Operational-queue design: 4 stat cards (Requests/In review/Urgent/Waiting on client), a filter bar
  with 9 status filters + search + sort + rows-per-page + "clear filters", and a data table with
  per-row actions.
- Filtering (Urgentes) was verified to actually filter, not just visually highlight.
- Row actions use a two-tier pattern (primary "Ver" + secondary "⋯ Más acciones" dropdown) — a
  reasonable pattern for a table with many possible per-row actions (request doc, toggle urgent,
  delete) without cluttering every row.

## Tables

`ResponsiveDataView` (new in this pass) explicitly implements the table→cards pattern for mobile
per the master brief's requirement, and the attorney case table has search, sort, pagination
(5/8/12/20 rows), a visible result count, and empty/loading states. Delete-style destructive actions
(none observed being truly destructive in this app — most are additive/status-changing) didn't turn
up a confirmation-dialog gap, but the new `ConfirmDialog`/`useConfirmation` primitives exist
specifically to cover this pattern for future destructive actions.

## Forms

- Every form field observed uses `<Label>` + `<TextInput>/<Select>/<Textarea>` from Flowbite with
  visible (not placeholder-only) labels — good, since placeholder-as-label is a common accessibility
  and usability failure this avoids.
- Required fields, disabled-while-busy submit buttons, and specific (not generic) validation
  messages were all present on the forms exercised (login, add income/expense/evidence, request
  document, add note).
- Modals are used consistently for "add" flows (Flowbite `Modal`), which is appropriate for a
  10-stage guided workflow where you don't want to navigate away from the current tab to add one row.

## Components

- Buttons: a real hierarchy (primary/`primary-action` class, secondary/`light` color) is used
  consistently, not ad hoc per page.
- Icons: a centralized `AppIcon` registry (`react-icons/hi2`), not one-off imports scattered through
  components — this is the kind of reuse the master brief specifically asks the architecture audit
  to check for, and it's real.
- Tooltips are used where they add context (row action buttons, header status indicators) rather
  than everywhere reflexively.
- Feedback: the AI connectivity indicator ("IA conectada"/"IA sin conexión") updates live and offers
  retry — a genuinely good "system status" affordance that most demos skip.

## Internationalization (see also the i18n fixes documented in `RELEASE_NOTES.md` 3.1.0)

- Both languages are functionally complete as of this pass: `npm run i18n:check` validates key
  parity across 13 namespace files in both `es` and `en`, and this passed after every fix.
- Language preference persists (localStorage) and is resolved with a sensible priority: user
  profile → persisted choice → browser locale → app default (Spanish).
- Fixed this pass: attorney demo account silently defaulting to English; raw i18n keys and internal
  slugs leaking into visible Spanish text in three separate places (evidence-type labels, requested
  document names, status-change timeline text); missing accents throughout the AI's Spanish
  responses and the backend's error catalog, including one case (`anos`/`años`) that changed the
  word's actual meaning, not just its spelling.

## Responsive

- A dedicated mobile-viewport (390×844) e2e test passes: login → dashboard → open case → chat →
  ask a question → verify the page body never exceeds the viewport width.
- `ResponsiveDataView` and the workspace's stage stepper both have explicit mobile variants rather
  than relying on the desktop layout squeezing down.

## Not yet audited (out of scope for this pass, flagged for follow-up)

- Keyboard-only navigation was not systematically tested (tab order, focus trapping in modals/the
  chat drawer, escape-to-close behavior beyond what the e2e suite incidentally exercises).
- Color-contrast / WCAG AA measurement was not run against the live rendered app (this would need a
  tool like axe or Lighthouse against the actual deployed instance — see `02-deployment-audit.md`).
- Dark mode: Flowbite's `dark:` classes are present throughout the component tree, but no explicit
  dark-mode toggle or `prefers-color-scheme` wiring was found or tested — it's present in the CSS
  but not obviously reachable as a user-facing feature.
