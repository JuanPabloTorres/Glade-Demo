# Flowbite Component Standards (FreshStart)

Living document for Block 1 of `docs/plans/FRESHSTART-UX-AI-IMPLEMENTATION-PLAN.md`. Updated as later blocks touch new component categories.

## Icons

- Single icon library: `react-icons/hi2` (Heroicons 2, outline style). No other icon set may be imported.
- Every icon name used anywhere in the app — including names referenced by backend `AssistantAction.icon` payloads — must be a key of `frontend/src/config/iconRegistry.ts`. Do not import `react-icons/hi2` components directly in page/component files; go through `AppIcon` (atoms) or the registry.
- `AppIcon` (`frontend/src/components/atoms/AppIcon.tsx`) is a thin wrapper: `name`/`size`/`className` prop surface preserved from the pre-refactor inline-SVG version so no call site changed.
- Decorative icons render with `aria-hidden="true"` by default (built into `AppIcon`). Icon-only interactive controls must pass an explicit `aria-label` at the call site — `AppIcon` cannot infer one.

## Palette

Canonical tokens live in `frontend/src/index.css` `:root`: `--color-page`, `--color-surface`, `--color-surface-muted`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-primary`, `--color-primary-hover`, `--color-secondary`, `--color-accent`, `--color-success`, `--color-warning`, `--color-danger` — matching master instruction §10 exactly.

The pre-existing `--glade-*` tokens (`--glade-black`, `--glade-surface`, `--glade-primary`, etc.) are now **aliases** pointing at the canonical tokens above, not independent values, so existing component CSS (`.app-card`, `.primary-action`, `.metric-tile`, …) keeps working unchanged during the refactor. New components should reference the canonical `--color-*` names directly; `--glade-*` aliases are scheduled for removal once every component under `frontend/src/components` and `frontend/src/pages` has migrated (tracked in Block 13 cleanup).

The brand gradient (`--glade-gradient`) is now derived from `--color-primary → --color-secondary → --color-accent` and must stay reserved for brand marks, header accents, the primary CTA, and progress indicators — not applied to every button or card (master instruction §10).

## Component sourcing rule

Every standard interactive control (button, modal, dropdown, tabs, navbar, footer, alert, badge, table, progress, tooltip, accordion, drawer, sidebar, pagination, toast, form inputs, spinner, avatar, card, timeline, breadcrumb, list group) must come from `flowbite-react`. As of Block 1, the app already sources 13 of 16 page/component files directly from `flowbite-react` (Button, Card, Badge, Modal, Table, Tabs, Progress, Alert, Spinner, Navbar, Dropdown, Avatar, Footer, Timeline, form inputs) — this was true before the refactor and must not regress.

Two known gaps tracked for later blocks (not yet built as of Block 1):
- No toast/notification component exists yet (errors surface as static `Alert`s only) — introduce Flowbite's toast pattern in Block 7 (chat error states) and Block 6 (case actions).
- No accordion, pagination, or drawer/sidebar-nav exists yet — pagination lands in Block 5 (attorney queue), drawer lands in Block 7 (mobile chat), sidebar/stepper lands in Block 4 (client workspace stages).

## Card roles (Block 3+)

Per master instruction §9.4, cards get named roles (`SummaryCard`, `MetricCard`, `ActionCard`, `WarningCard`, `CaseCard`, `DocumentCard`, `ChatSuggestionCard`) wrapping Flowbite `Card` — introduced starting Block 3 (client dashboard) rather than in Block 1, since Block 1 is icon/token infrastructure only.

## Responsive tables (Block 4+)

`ResponsiveDataView` (table on `lg+`, cards on mobile/tablet) replaces the current ad hoc per-table `overflow-x-auto` wrapping found in `AttorneyDashboardPage.tsx` and `CaseWorkspacePage.tsx`. Introduced in Block 4.
