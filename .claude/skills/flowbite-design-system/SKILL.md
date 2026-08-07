---
name: flowbite-design-system
description: Build or change FreshStart UI through the governed layers — shared wrappers instead of raw Flowbite in pages, AppIcon/iconRegistry instead of direct react-icons, semantic CSS tokens instead of arbitrary values, complete state coverage, equivalent mobile representations for tables, and verified behavior at 320/390/768/1024/1440. Use for any change under frontend/src/components or frontend/src/pages.
---

# Flowbite design system

## 1. Identity

**Skill name:** `flowbite-design-system`
**Domain:** frontend / design system, components and responsive behavior

**Role.** You act as the frontend engineer who composes rather than invents. Flowbite supplies
behavior; FreshStart supplies the visual language through tokens and a shared component layer. Your
job is to build the requested UI out of the layers that already exist, extend them when they nearly
fit, and keep every screen coherent, accessible and usable from 320px up.

## 2. Purpose

Page-local UI is how a design system dies: a second button, a third table, a fourth spacing scale.
This repository has already been there — `docs/architecture/FLOWBITE-EXCEPTIONS.json` is the
registry of five pages that predate governance and are allowed direct Flowbite imports, inline
styles or `overflow-x-auto`, explicitly labelled as a migration backlog rather than a pattern.

`scripts/agent/flowbite-check.mjs` now fails the build on new violations. This skill exists so the
UI you add composes the governed layers by default, and so the exception list keeps shrinking rather
than growing.

## 3. Mission

Deliver UI that reuses the shared component layer, uses only registry icons and semantic tokens,
covers every state a real screen has, adapts genuinely (not by horizontal scroll) across the five
breakpoints, works with a keyboard, and reads correctly in Spanish and English.

## 4. Activation conditions

### Use this skill when

- Creating or modifying anything under `frontend/src/components/` or `frontend/src/pages/`.
- Adding a form, modal, table, card, badge, toolbar or navigation element.
- Fixing a layout, overflow, spacing or responsive defect.
- Adding a state (loading, empty, error, success, disabled, unauthorized, offline).
- `npm run agent:flowbite` fails.
- You notice two components doing the same job.

### Do NOT use this skill when

- The work is only copy — `/i18n-change`.
- The work is a whole new user journey — `/create-feature-flow` frames it and delegates here.
- The work is data fetching or API wiring — `/api-contract-change` and the api client layer.
- You are verifying rendered output — `/visual-qa` or `/visual-acceptance` (this skill builds; those
  judge).
- You want to introduce a new UI dependency (a component library, a form library) —
  `/architecture-decision` first; `frontend/CLAUDE.md` names TanStack Query, React Hook Form and Zod
  as requiring an ADR.

## 5. System context

```text
frontend/src/index.css                 the token layer (358 lines)
  --color-*        page, surface, surface-muted, text, text-muted, border, primary,
                   primary-hover, secondary, accent, success, warning, danger,
                   plus semantic aliases: brand, heading, body, fg-*, neutral-*, *-soft/-subtle
  --font-size/weight/leading-*   display, page-title, section-title, card-title, body,
                                 supporting, label
  --space-1..10    4,8,12,16,20,24,32,40,48,64 px
  --radius-base    0.75rem

frontend/src/config/
  iconRegistry.ts   the only module allowed to import from react-icons/hi2
  routes.ts, navigation.ts, bankruptcyOptions.ts, environment.ts, version.ts

frontend/src/components/
  atoms/        AppIcon, AppLogo, PageTitle, StatusBadge, Typography (SectionTitle, CardTitle,
                BodyText, HelperText, ErrorText, FieldLabel), MutationFeedback,
                AsyncState (LoadingState, ErrorState, EmptyState)
  molecules/    ResponsiveDataView, AppAccordion, CaseStageStepper, FloatingField,
                LanguageToggle, StageOrientation, AssistantCardView
  organisms/    AppShell, ModernHeader, ModernFooter, ChatPanel, ChatBubble, ChatComposer,
                CaseTimeline, CaseActionBar, BankruptcyEntryModal, ReleaseBadge,
                navigation/{Sidebar,SidebarGroup,SidebarItem,BottomNavigation,UserMenu}
  ui/           AppButton
  overlays/     AppModal + AppModalForm / AppModalBody / AppModalFooterBar / AppModalFooter
  forms/        FormField, fields (TextField, SelectField), FileField, FormActions
  feedback/     ConfirmDialog
  data-display/ DataTableToolbar, RowActionsMenu

frontend/src/hooks/    useDisclosure, useConfirmation, useRoleNavigation, useAiHealth

Governance:
  scripts/agent/flowbite-check.mjs      run via npm run agent:flowbite
    error: react-icons/hi2 imported outside config/iconRegistry.ts
    error: flowbite-react imported inside frontend/src/pages/**
    error: style={{ ... }} inside frontend/src/pages/**
    error: overflow-x-auto inside frontend/src/pages/**
    each downgraded to a warning only for a path listed in
    docs/architecture/FLOWBITE-EXCEPTIONS.json (LoginPage, AttorneyDashboardPage,
    CaseWorkspacePage, ClientDashboardPage, AboutPlatformPage — a migration backlog, not a licence)

Standards: docs/ux/FLOWBITE-COMPONENT-STANDARDS.md, docs/architecture/PATTERN-CATALOG.md
Audits:    docs/ux/RESPONSIVE-MOBILE-AUDIT-2026-08-07.md, UX-SHELL-POLISH-AUDIT-2026-08-06.md
```

## 6. Source of truth

1. The existing shared components — the pattern is whatever they already do.
2. `frontend/src/index.css` tokens.
3. `frontend/src/config/iconRegistry.ts` for the icon vocabulary.
4. `scripts/agent/flowbite-check.mjs` for what is mechanically enforced.
5. `docs/ux/FLOWBITE-COMPONENT-STANDARDS.md` and `docs/architecture/PATTERN-CATALOG.md`.
6. `frontend/CLAUDE.md` and `.claude/rules/frontend/*`.

## 7. Ownership

**Owns:** components under `frontend/src/components/**`, page composition under
`frontend/src/pages/**`, the token layer in `index.css`, `iconRegistry.ts`, and the component tests
beside them.

**Does not own:** copy values (`/i18n-change` owns the locale files; this skill owns the *keys* being
used), API clients and DTOs, business rules, routing decisions
(`frontend-shell-engineer`/`ux-product-director` own IA), the exception registry policy (adding an
entry needs an ADR or a dedicated migration task).

## 8. Boundaries

- Pages compose; they do not define visual primitives. A page that needs a new visual pattern needs
  a component.
- Flowbite is imported by shared wrappers, not by pages.
- Icons come from `AppIcon` with a registry name. A missing icon is added to the registry, not
  imported locally.
- Colors, spacing and type come from tokens and the Tailwind scale. No `text-[13px]`, no
  `p-[7px]`, no hex literal for a semantic color.
- A table always has a mobile representation with the same actions —
  `ResponsiveDataView` exists for exactly this. `overflow-x-auto` is not a responsive strategy.
- No business rule reimplemented in a component. Derive from the DTO; do not recompute eligibility,
  totals or status semantics.

## 9. Invariants

```text
INVARIANT-01  react-icons is imported only by frontend/src/config/iconRegistry.ts.
INVARIANT-02  flowbite-react is imported only by shared components, never by a page.
INVARIANT-03  No inline style={{}} in a page.
INVARIANT-04  No overflow-x-auto in a page as the responsive answer.
INVARIANT-05  Colors, spacing and typography come from tokens or the Tailwind scale.
INVARIANT-06  Every visible string comes from i18n; ES and EN move together.
INVARIANT-07  Every interactive element is keyboard reachable and has an accessible name;
              icon-only controls carry aria-label and a tooltip.
INVARIANT-08  Every data surface handles loading, empty, error and success.
INVARIANT-09  Every table has an equivalent mobile representation with the same actions.
INVARIANT-10  Layouts work at 320, 390, 768, 1024 and 1440 with no horizontal body scroll.
INVARIANT-11  New pages do not enter FLOWBITE-EXCEPTIONS.json.
```

## 10. Dependencies

React 19, TypeScript, Vite, Tailwind 4 (`@tailwindcss/vite`), `flowbite-react` 0.12, `react-icons`
5, `i18next`/`react-i18next`, React Router 7. Consumers of the shared components are enumerable —
grep the import before changing a signature. `AppModal`, `ResponsiveDataView`, `AppButton`,
`FormField` and `AsyncState` are the highest-traffic ones.

## 11. Required knowledge

Composition over configuration in React; Tailwind 4's CSS-first token model; Flowbite React's
component API and where its defaults conflict with our tokens; focus management in modals; ARIA
naming; mobile viewport behavior including the on-screen keyboard; i18next namespaces; how
`vite build` (`tsc -b`) is the real type gate.

## 12. Inputs

A feature request, a screenshot, a UX finding from `product-ux-reviewer` or
`docs/ux/*-AUDIT-*.md`, a failing `agent:flowbite` run, or a defect report from `/visual-qa`.

## 13. Preconditions

1. An active manifest claims the components, pages, tests and locale files involved.
2. You have inventoried the existing components (§14) — before writing markup, not after.
3. For a new visual pattern, you have checked `PATTERN-CATALOG.md`.

## 14. Discovery procedure

```text
1. Inventory first:
     ls frontend/src/components/**            what already exists
     grep -rn "export function" frontend/src/components   signatures
2. Find the nearest existing component. Read it, including its tests.
3. Find every consumer of anything you might change (grep the export name).
4. Read the page you are changing and the tokens it uses.
5. Check iconRegistry.ts for the icons you need.
6. Check the locale namespaces for existing keys before inventing new ones
     (common, navigation, workspace, forms, tables, dashboard, ai, auth, errors,
      help, reports, settings, users, validation).
7. Check whether the page is in FLOWBITE-EXCEPTIONS.json — if so, prefer removing the exception
   over adding to it.
8. Decide: reuse / extend / extract / create (§15).
```

## 15. Decision framework

**An existing component does this** → use it. `ResponsiveDataView` for tabular data,
`AppModal` (+ `AppModalForm`/`Body`/`FooterBar`) for overlays, `FormField`/`TextField`/`SelectField`
/`FileField` for inputs, `AsyncState` for loading/empty/error, `MutationFeedback` for write
outcomes, `ConfirmDialog` for destructive confirmation, `RowActionsMenu` for row actions,
`DataTableToolbar` for filters, `StatusBadge` for status, `Typography` for text roles.

**It nearly does** → extend by prop or composition, then check every consumer. A new optional prop
with a default that reproduces current behavior is the safe shape.

**The same markup appears three times** → extract a component into the right layer (atom = one
element with a role; molecule = a small composition; organism = a page-level region).

**Nothing fits and it is genuinely new** → create it under `components/`, not in the page, with the
token vocabulary, all states, a test, and both locales.

**A page needs raw Flowbite** → it does not. Wrap it in a shared component. The five existing
exceptions are a backlog.

**A table will not fit on mobile** → do not scroll it. Use the card representation
`ResponsiveDataView` provides, with the same actions available.

**A control is icon-only** → it needs `aria-label` and a tooltip; a critical action keeps its text
label at all widths.

**A one-off value seems necessary** (`text-[13px]`) → the scale is missing a step, or the design is
wrong. Add a token deliberately or use the nearest step; do not inline the pixel value.

## 16. Execution workflow

```text
INVENTORY     what exists; what nearly fits; who consumes it
DECIDE        reuse / extend / extract / create
COMPOSE       shared wrappers, AppIcon, tokens; no raw Flowbite in pages
STATES        default, hover, focus, active, disabled, loading, empty, success, warning, error,
              unauthorized, offline — whichever the surface can actually reach
RESPONSIVE    design for 320 first; verify 390 / 768 / 1024 / 1440
A11Y          keyboard order, visible focus, accessible names, contrast
I18N          keys in the right namespace, ES and EN together
TEST          component test for behavior and states
CHECK         npm run agent:flowbite
VERIFY        lint, vitest, build; then /visual-qa for rendered evidence
```

## 17. Proactive behavior

- **Local:** while fixing one state, add the missing siblings — a surface with a loading state and
  no empty state is unfinished.
- **Horizontal:** grep the component's consumers before changing its signature; `AppModal` and
  `ResponsiveDataView` are used across several pages, and a change there is fleet-wide.
- **Vertical:** page → shared component → token. If a page-level symptom is caused by the wrapper,
  fix the wrapper and re-check every consumer; that is the difference between a patch and a fix.
- **Pattern:** if you are about to write the same flex/gap/border trio for the fourth time, it is a
  component.
- **Regression risk:** a token change touches every screen. A wrapper change touches every consumer.
  Say so in the change fragment and screenshot more than the page you were asked about.

## 18. Expected agent behavior

Inventory before writing markup. Reuse before extending, extend before creating, create before
duplicating. Cover the states a real user reaches. Design mobile-first and verify at 320. Keep the
keyboard path working. Move both locales together. Run `agent:flowbite` before claiming done.

## 19. Forbidden behaviors

```text
DO NOT:
- import react-icons outside iconRegistry.ts;
- import flowbite-react inside a page;
- add inline style={{}} to a page;
- use overflow-x-auto as the mobile answer for a table;
- hardcode a hex color, a pixel size or a one-off spacing value;
- duplicate an existing component under a new name;
- add an entry to FLOWBITE-EXCEPTIONS.json without an ADR or a migration task;
- hardcode visible copy, in either language;
- ship a data surface with only a success state;
- remove a label to make something fit on mobile;
- reimplement a backend rule in a component;
- change a shared component's props without checking every consumer.
```

## 20. Error handling strategy

- Async data uses `LoadingState` / `ErrorState` / `EmptyState` from `AsyncState`, never a bare
  spinner or a blank region.
- Writes report through `MutationFeedback` — success and failure both, never silence.
- Backend error codes map through `frontend/src/i18n/backendErrors.ts` to localized copy; an
  unmapped code shows a generic localized message, never a raw code or an English fallback in a
  Spanish session.
- Destructive actions go through `ConfirmDialog` (`useConfirmation`).
- Never swallow a rejected promise; never render `undefined` into text.
- An unauthorized state is a real state: show what the user can do, not an empty page.

## 21. Edge cases

- **320px.** The narrowest governed width and where this project's layouts actually break: long
  Spanish words, two-line buttons, badge rows, sticky footers.
- **Mobile keyboard.** A modal with a focused input loses roughly half the viewport; the primary
  action must remain reachable — `AppModal`'s `fillHeight` and `AppModalFooterBar` exist for this.
- **Long English strings versus accented Spanish.** English is often longer; Spanish has diacritics
  that change line height. Check both, not one.
- **Content taller than the viewport** in a modal → scroll inside `AppModalBody`, never the page.
- **Empty collections at first run** — a new client has no case, no documents, no timeline.
- **Role differences** — attorney and client see different affordances on the same screen.
- **Degraded AI** — the header badge and the chat must show it honestly.
- **Focus return** — closing a modal returns focus to the trigger.
- **Dark backgrounds** — the login hero is the recurring contrast risk.

## 22. Cross-system impact checklist

```text
[ ] 320 / 390 / 768 / 1024 / 1440
[ ] ES / EN
[ ] Keyboard reachable, visible focus, accessible names
[ ] Contrast on light and dark surfaces
[ ] Loading / empty / error / success / disabled / unauthorized / offline
[ ] Table has an equivalent mobile representation with the same actions
[ ] Tokens only — no arbitrary values
[ ] Icons via AppIcon/iconRegistry
[ ] No raw Flowbite or inline style in pages
[ ] Every consumer of a changed shared component checked
[ ] Component test added or updated
[ ] i18n keys added to both locales
[ ] npm run agent:flowbite clean (no new exception entries)
```

## 23. Validation strategy

```bash
npm run agent:flowbite
npm --prefix frontend run lint
npm --prefix frontend run test -- --run
npm --prefix frontend run build          # tsc -b: the real type gate
npm --prefix frontend run i18n:check
npm --prefix frontend run test:e2e       # includes responsive-overflow.spec.ts
```

Then `/visual-qa` or `/visual-acceptance` for rendered evidence at all five breakpoints. A green
`agent:flowbite` proves no *mechanical* violation; it says nothing about whether the screen is
usable at 320px. Both are required.

## 24. Definition of Done

```text
[ ] Reused what existed; extended rather than duplicated
[ ] No mechanical violations; no new exception entries
[ ] All reachable states implemented
[ ] Mobile representation equivalent, not degraded
[ ] Keyboard and screen-reader names verified
[ ] ES/EN parity, checked in the UI not only in the JSON
[ ] Component test covers the new behavior and its states
[ ] Consumers of changed shared components verified
[ ] Screenshots at 320/390/768/1024/1440
[ ] lint, vitest, build, i18n:check, agent:flowbite green
```

## 25. Expected output

```markdown
## UI change

### Implemented
### Components reused
- ResponsiveDataView, AppModal, FormField, AsyncState …

### Components created or extended
| Component | Layer | Why nothing existing fit | Consumers checked |

### States covered
default / hover / focus / disabled / loading / empty / error / success / unauthorized / offline

### Responsive
| Viewport | Behavior | Screenshot |

### Accessibility
### i18n keys added (es + en)
### Verification
### Follow-up (exceptions that could now be removed)
```

## 26. Escalation rules

Escalate when: the request needs a new UI dependency (ADR); it cannot be built without an exception
entry; the information hierarchy is wrong rather than the styling (route to `ux-product-director`);
the design contradicts the token system in a way that suggests the tokens are wrong; or a shared
component change would break consumers owned by another active task.

## 27. Collaboration with other skills

```text
flowbite-design-system
 ├── serves    → create-feature-flow (which owns the flow, this owns the UI)
 ├── pairs     → i18n-change for every visible string
 ├── verified by → visual-qa / visual-acceptance / design-system-audit
 ├── consults  → ux-product-director for hierarchy and IA
 ├── requires  → architecture-decision for a new dependency or a new exception
 └── verified by → targeted-verify, then finish-change
```

## 28. Examples

**Correct.** An attorney queue column: extend the `columns` array passed to `ResponsiveDataView`,
which renders a table on desktop and cards on mobile from one definition; add
`tables.columns.pendingDocuments` to `es/tables.json` and `en/tables.json`; use `StatusBadge` for
the status cell and `RowActionsMenu` for actions; no new markup, no new pattern, both
representations updated by construction.

**Incorrect.**

```tsx
// inside frontend/src/pages/AttorneyDashboardPage.tsx
import { Table } from "flowbite-react";        // page-level Flowbite → flowbite-check error
import { HiEye } from "react-icons/hi2";       // bypasses iconRegistry → error
<div className="overflow-x-auto" style={{ padding: 7 }}>   // two more errors
  <Table>…<th>Documentos pendientes</th>…</Table>          // hardcoded Spanish copy
```

Four mechanical violations and an i18n failure in six lines — and a table with no mobile
representation.

**Complex.** A modal whose primary action is unreachable on a 320px phone with the keyboard open.
The fix is not a margin on that page: read `AppModal`, determine whether `fillHeight` and
`AppModalFooterBar` are being used, fix the shared layout so the footer stays pinned and the body
scrolls, then re-verify **every** modal consumer (`BankruptcyEntryModal`, `ConfirmDialog`,
`ChatPanel`) at 320 and 390 — a shared fix is a fleet-wide change and needs fleet-wide evidence.

## 29. Failure scenarios

```text
Scenario: A button overflows its modal on mobile.
Wrong:    Add margin-left:-20px to that page.
Correct:  Inspect AppModal's container, the footer bar and the button group. Decide whether the
          defect belongs to the shared abstraction. If it does, fix it there and re-verify every
          consumer; a page-local nudge leaves the same bug in four other modals.

Scenario: A table needs one more column and it no longer fits.
Wrong:    Wrap it in overflow-x-auto.
Correct:  flowbite-check denies that in a page, and rightly: horizontal scroll is not a mobile
          design. Use the ResponsiveDataView card representation and decide which fields matter on
          a phone.

Scenario: An icon you need is not in the registry.
Wrong:    import { HiSomething } from "react-icons/hi2" in the component.
Correct:  Add it to iconRegistry.ts — that is the one module allowed to import it — and use
          <AppIcon name="…" />. The registry is what keeps the icon vocabulary finite.
```

## 30. Self-review

1. Did I inventory the existing components before writing markup?
2. Did I reuse, extend, or duplicate — and can I justify it?
3. Is there a single arbitrary value, hex color or local icon import left?
4. Does every state a user can reach exist?
5. Does the mobile representation offer the same actions, not fewer?
6. Did I actually look at 320px?
7. Can I complete the flow with only a keyboard?
8. Are both locales updated, and did I read the screen in both?
9. If I changed a shared component, did I check and screenshot its other consumers?
10. Did I fix the abstraction, or paper over its symptom in one page?
