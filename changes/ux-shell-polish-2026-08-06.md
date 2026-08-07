---
taskId: ux-shell-polish-2026-08-06
type: minor
scope: frontend shell/navigation, design tokens, guided-flow stepper, attorney dashboard filter bug, login page
---

# Summary

UX polish pass requested after live product review of the running app: collapsible desktop
sidebar, a systemic dark-mode contrast fix, header/footer cleanup, a real single-source-of-truth
stepper for the guided intake flow, an attorney-dashboard filter bug fix, and login page
decluttering. **Status: in progress** — this fragment is being kept up to date as each unit lands;
see the checklist below for what's actually done vs still running.

## Work units and status

- [x] W1 — dark-mode token fix (`design-system-engineer`, `frontend/src/index.css`) — **done**.
      Added `@custom-variant dark (&:where(.dark, .dark *));` (Tailwind v4) so `dark:` only
      activates under an explicit `.dark` ancestor class, which this app never applies — instead of
      firing on OS `prefers-color-scheme: dark` and colliding with flowbite-react's built-in dark
      classes. Verified live (Playwright, colorScheme:dark emulation): header Card/metric
      tiles/avatar dropdown on "Mi caso" went from illegible dark-on-dark to legible light surface,
      unaffected by OS scheme. `npm run build`/`lint`/`agent:flowbite` all pass. Note: found one
      now-inert `dark:` class pair left in `frontend/src/components/atoms/PageTitle.tsx` (outside
      this unit's ownership, not a live bug post-fix, flagged for a future cleanup pass).
- [x] Wave 0 — Flowbite primitive adoption audit — **done**, see
      `docs/ux/UX-SHELL-POLISH-AUDIT-2026-08-06.md`.
- [x] W1b — **Flowbite v3 semantic token layer** (`frontend/src/index.css`) — **done**. Upstream
      Flowbite blocks are now written against a token vocabulary (`bg-neutral-primary-soft`,
      `border-default`, `text-heading`, `text-fg-brand`, `rounded-base`) that `flowbite-react@0.12.9`
      does not ship — verified by grepping `node_modules/flowbite-react/dist` (zero matches; it still
      emits literal `bg-white`/`text-gray-900`). Added a `@theme` block mapping ~20 of those names
      onto the existing `:root` palette, so it is a naming adapter, not a second palette. Verified in
      the built CSS that the `var()` indirection survives
      (`--color-neutral-primary-soft:var(--color-surface)`) and that variant utilities generate
      (`.hover\:bg-neutral-tertiary:hover{…}`). One collision: `text-body` already existed as a
      *typography* class; it had **zero call sites**, so it was renamed `.type-body` with no migration.
- [x] W2 — header cleanup (`ModernHeader.tsx`) — **done**. Version badge removed (footer is now its
      only home — verified live: exactly 1 `v3.1.0` badge in the DOM); all three avatar-dropdown items
      carry icons (`home`, `help`, new `logout` registered in `iconRegistry.ts`), with sign-out in
      `text-fg-danger` per Flowbite's own avatar-dropdown block.
- [x] W3 — collapsible desktop sidebar (`navigation/**`) — **done**, hand-rolled rather than swapping
      in flowbite-react's `Sidebar` (audit §a: its `SidebarItem` is leaf-only, with no slot for this
      app's group label, and a swap would mean re-deriving the working active-state contrast and
      disabled+tooltip rules). Verified live: 256px → 80px, labels hidden when collapsed, preference
      persisted across reload via `localStorage`, re-expands to 256px. Collapsed items keep an
      `aria-label` + tooltip, so the label never leaves the accessibility tree. Mobile Drawer never
      collapses.
- [x] W7 — **shared wrappers from the Flowbite blocks** — **done**. New
      `components/molecules/AppAccordion.tsx` and `components/molecules/FloatingField.tsx`.
      `AboutPlatformPage.tsx` now composes `AppAccordion` instead of a page-local `Accordion`.
      Note: `flowbite-react@0.12.9`'s `AccordionTitle` emits **no** `aria-expanded`/`aria-controls`
      (its only ARIA attribute is `aria-hidden` on the arrow), which Flowbite's published block does
      have — the wrapper restores both by reading `isOpen` from the panel context. Verified live:
      `aria-expanded` flips false→true and the five footer deep-link anchors (`#privacy`, `#security`,
      `#accessibility`, `#terms`, `#help`) all still resolve.
- [x] W8 — footer (`ModernFooter.tsx`) — **done**. Seven flat links regrouped into three labeled
      columns (Plataforma / Legal / Soporte) following Flowbite's footer block; the active-link pill
      is kept on top of it because the contrast convention is required by
      `.claude/rules/frontend/flowbite-design-system.md`.
- [x] W4 — attorney dashboard filter bug (`frontend-shell-engineer`, `AttorneyDashboardPage.tsx`) —
      **done**. `view` was a lazy `useState(() => searchParams.get("view") ...)` initializer, so it
      only ever read the URL on first mount; a second sidebar filter link click while already on `/`
      is a query-only navigation (no remount), so the state silently never re-synced and the list kept
      showing the first filter's results. Fixed by deriving `view` with `useMemo` from `searchParams`
      on every render instead (removed the now-redundant `setView(...)` calls in `setView_` and
      `clearFilters` — `setSearchParams` alone drives re-filtering). Verified live with a scripted
      Playwright run (three sidebar filter clicks in a row: Urgentes -> Documentos solicitados ->
      Urgentes, on the same route) confirming each click re-filters correctly, not just the first —
      not committed as `frontend/e2e/**` because that path is outside this task's `ownedPaths`; a
      maintainer should add it as a permanent regression spec once `frontend/e2e/**` is in scope.
      `npm run lint` (0 errors), `npm run i18n:check`, `npm run build`, and `npx vitest run` (37/37)
      all pass.
- [ ] W5 — guided-flow stepper rebuild (`frontend-shell-engineer`, `CaseStageStepper.tsx` +
      `CaseWorkspacePage.tsx`): replace the pill-row *and* the redundant duplicate `Tabs` strip with
      one hand-built Flowbite-styled stepper (single source of truth per
      `.claude/rules/frontend/feature-architecture.md`) — **running**, highest-risk unit (state
      logic rebuild).
- [x] W6 — login page declutter (`LoginPage.tsx`) — **done**. The gradient layer, how-it-works card
      grid, divider-with-floating-label, 3-way alert stack and alert-styled disclaimer had already
      landed before this pass; this pass finished it by removing the remaining demo badge (the
      disclaimer at the foot of the same form already says the data is synthetic) and rebuilding the
      credential fields on Flowbite's floating-label block via the new `FloatingField`, with the card
      header following Flowbite's authentication-modal block (ruled title row, checkbox + secondary
      text row, full-width submit).
- [x] W9 — chat bubble (`ChatBubble.tsx`) — **done**, on Flowbite's chat-bubble block: attribution
      row (sender + time) inside the bubble, body below, action control as a sibling outside it;
      `bg-neutral-secondary-soft` with the flat corner facing the avatar, mirrored for the user's own
      messages (solid brand fill + white text, same contrast convention as the sidebar/footer active
      states). **Behavioral fix carried by the restyle:** the timestamp row was
      `opacity-0 group-hover:opacity-100`, so the only thing distinguishing two similar answers was
      behind a hover a touch user can never perform — the block shows it unconditionally, and so does
      this now. Verified live: sender + time visible without hover for both roles, 3 copy controls
      visible, no overflow. Two i18n keys added (`chat.senderYou`, `chat.senderAssistant`).
      Deliberately **not** adopted: the block's 5-item dots dropdown (Reply/Forward/Copy/Report/
      Delete) — this chat has exactly one action, so the single copy button just wears that button's
      styling instead of a menu holding one item.
- [x] W10 — entry modal shell (`BankruptcyEntryModal.tsx`) — **done**, on Flowbite's modal block:
      ruled header (`border-b border-default`, `text-lg font-medium text-heading`), ruled footer, and
      a primary action that fills the width below `sm`. Also replaced a hardcoded `text-[#777]`
      helper with `text-body`. Deliberately **not** adopted: the block's
      `bg-neutral-secondary-medium` field styling — `.app-input` (index.css) is this app's app-wide
      input contract, so changing the look there would restyle every form in the product, which is a
      larger decision than this modal.
- [x] W11 — **application shell + shared primitives** (UI directive §4/§5/§6/§14/§16/§23) — **done**.
      - `MobileBottomNavigation` + `MobileNavigation`: persistent bottom bar below 768px with the
        four primary destinations plus a "Más" overflow that opens the existing Drawer. Replaces the
        previous arrangement where a single floating menu button was the *only* way to reach any
        destination on a phone — every navigation cost two taps and the UI showed nothing about the
        current location. `Sidebar` is now desktop-only (>=768px).
      - `useRoleNavigation()` hook: the single resolver for "which destinations does this role get",
        consumed by the sidebar, the bottom bar and the drawer, so a role rule cannot drift between
        the three surfaces. It previously lived inside Sidebar's render body.
      - `UserMenu`: the avatar dropdown extracted out of `ModernHeader` so the product has exactly
        one implementation. Entries are limited to destinations that exist — no profile/settings
        items, which would be the decorative fake controls the directive forbids.
      - `Typography.tsx`: `SectionTitle`/`CardTitle`/`BodyText`/`HelperText`/`ErrorText`/`FieldLabel`.
        `ErrorText` carries `role="alert"` plus an icon so an error never relies on color alone.
      - `ModernFooter` gained a `compact` variant, used by the authenticated shell: a full
        multi-column footer under every case screen is navigation the workflow never asks for
        (directive §23). The legal disclaimer is condensed, **not** dropped — for a
        bankruptcy-preparation product that line is load-bearing.
      - Token/i18n cleanups found by the audit sweep: `PageTitle`, `AsyncState`, `ProtectedRoute`,
        `LanguageSelector` and two dashboards moved off raw palette classes (`text-gray-900`,
        `bg-slate-50`, `text-indigo-700`, …) onto the semantic layer; `AsyncState` and
        `ProtectedRoute` had **hardcoded English** default copy that a Spanish session rendered in
        English, now in `common:states.*`; `ConfirmDialog` had **hardcoded Spanish** button defaults
        ("Confirmar"/"Cancelar") whose `t()` fallbacks were unreachable, now `common:actions.*`.
      - `LanguageSelector` announced as just "ES": its `aria-label` sat on an inner `<span>`, which
        contributes nothing to a button's accessible name. Moved onto the control.
- AI response-grounding fix (Ollama/RuleBasedProvider ignoring user message + conversation history)
  is tracked as a **separate branch/task** (backend, different domain/SemVer) — not part of this
  fragment.

# User-visible behavior

Landed so far:

- The desktop sidebar collapses to an icon rail and stays collapsed across reloads. Collapsed items
  keep their names as tooltips and accessible labels.
- The build version appears once, in the footer, instead of twice.
- Every avatar-dropdown entry has an icon; signing out reads as the destructive action it is.
- Footer links are grouped under Plataforma / Legal / Soporte instead of one seven-item row.
- Login asks for credentials with floating labels and one less badge.
- The "Acerca de" disclosure list now announces open/closed state to screen readers.
- Chat messages show who said what and when without needing a hover, so the attribution is readable
  on touch devices for the first time.
- The add-entry modal has a ruled header/footer and a full-width primary action on phones.
- On a phone, navigation is a persistent bottom bar showing where you are, instead of a floating
  button that hid every destination behind two taps.
- Loading, empty and session-restore screens are no longer in English during a Spanish session.

Still open on this branch: W4 (attorney dashboard filter bug) and W5 (guided-flow stepper).

# Migration / compatibility

No API/contract changes expected. Purely frontend presentation/interaction; no data model changes.

# Tests and evidence

Run against the W1/W1b/W2/W3/W6/W7/W8 units (all green at the time of the run, with
`CaseWorkspacePage.tsx` in a compiling state):

- `npm run i18n:check` — passed, 13 module files, ES/EN parity for all new keys.
- `npm run lint` — 0 errors (9 pre-existing warnings, none in changed files).
- `npm run build` — passed.
- `npm test -- --run` — 37/37 passed, 11 files (includes the existing `Sidebar.test.tsx`, unchanged
  and still green after the collapse rework).
- `npm run agent:flowbite` — passed.

Live browser verification (Playwright against the dev server + real backend, Chromium):

- Login at 320/390/768/1024/1440: no horizontal overflow at any width, no console errors.
- Floating label measured in all four states — empty+blurred sits inline (y=430.6, scale 1);
  with-value, focused, and refilled all raise it (y=409.1, scale 0.75).
- Sidebar: 256px expanded → 80px collapsed → 80px after reload (persistence) → 256px re-expanded;
  nav labels not visible while collapsed.
- Exactly 1 version badge in the DOM.
- Accordion `aria-expanded` false→true, `aria-controls` resolves, all 5 footer anchors present.
- Chat drawer with a real assistant round-trip: sender + timestamp visible without hover for both
  the user and the assistant bubble, 3 copy controls rendered and visible, no overflow, no console
  errors.

Scripted audit sweep (Playwright, `/login` + `/` + `/about` at 320/375/768/1024/1440, signed in
against the real backend) — all of the following came back clean:

- **Zero duplicate DOM ids** on every audited page (the directive's specific concern about copied
  Flowbite example ids: `accordion-collapse`, `dropdown-user`, `authentication-modal`, `dropdownDots`).
- **Zero console errors, React warnings, page errors or failed requests** across the whole run.
- **Zero horizontal overflow** at any of the 5 widths on any of the 3 routes.
- **Zero `href="#"` fake links**; **zero unlabeled form controls**.
- Desktop 1440: sidebar visible, bottom bar absent. Mobile 375: bottom bar visible, sidebar absent.
- Bottom-bar tap targets all >= 44px tall; the page bottom clears the bar at full scroll.
- Bottom-nav link navigates and marks `aria-current="page"`; overflow drawer opens with 12 entries;
  avatar dropdown renders 3 items; accordion `aria-expanded` false->true; language switch changes
  rendered copy (footer text flips ES->EN).

Two findings remain, **both originating in `flowbite-react@0.12.9`, not in this codebase**:

- `aria-describedby="drawer-dialog-…"` on the Drawer points at an element that does not exist —
  emitted by `node_modules/flowbite-react/dist/components/Drawer/Drawer.js`.
- Raw palette classes (`bg-gray-900`, `dark:bg-gray-700`, `bg-green-100`, …) still appear in the
  rendered DOM. Every one traces to a flowbite-react component's own markup; a grep of `src/`
  confirms our code no longer contributes any, except the files listed under Risks. The `dark:`
  variants among them are inert (index.css repoints that variant).

Three "problems" the first sweep reported were **defects in the sweep, not the app**, and were
corrected before re-running: a bottom-nav assertion that ignored the stripped `?focus=` query, a
language-selector locator matching `"English"` instead of the rendered `"EN - English"`, and an
overlap check that measured an unscrolled page. The bottom-bar clearance was then confirmed
numerically (column `padding-bottom: 80px` vs bar height `57px`).

Observed but **not caused by this work**: in the chat drawer, a long suggested-action label wraps
outside its button and overlaps its neighbours (visible in the captured chat screenshot). The owning
files (`ChatPanel.tsx`, `ChatComposer.tsx`) have an empty `git diff` against this branch's base, so
this is pre-existing; a follow-up should give those `AppButton size="xs"` chips a wrap-friendly
height. Not measured programmatically — reported from the screenshot.

Screenshots captured: login at 5 widths, shell expanded/collapsed/dropdown/footer, about
open/closed. Not committed to the repo — regenerate with the dev server if needed for sign-off.

**Not yet run for this branch as a whole:** the full `npm run agent:verify` gate, and Playwright
E2E (`npm run test:e2e`) — both currently blocked by the `CaseWorkspacePage.tsx` state described
under Risks.

# Risks / limitations

- **`CaseWorkspacePage.tsx` does not currently typecheck** — 6 `tsc` errors, all in that one file,
  none in any file changed by the units above. W5's rebuild removed the `Tabs`/`TabItem`/`TabsRef`/
  `useRef` imports *and* the `tabsRef`/`isSyncingTabsRef` declarations while the JSX still uses them.
  It was restored to a compiling state once during this pass (the import line) so the build could be
  verified, and was then edited back — the file is being worked on concurrently, so it has been left
  alone rather than fought over. **It blocks `npm run build`, `agent:verify` and E2E until W5 lands.**
  Separately, an unescaped `*/` inside a JSDoc comment (`locales/*/workspace.json`) was terminating
  the comment early and breaking the parse; that fix is still in place.
- **The UI directive is not fully delivered by this branch, and should not be read as such.** What
  landed is the design-token layer, the app shell, and the shared primitives. Still open, each
  needing its own task manifest because they fall outside this one's `ownedPaths`:
  reusable form primitives (`FormField`/`Select`/`Checkbox`/`RadioGroup` — only `FloatingField`
  exists today) and per-field validation across every form; a generic `AppModal` abstraction with
  the `CreateEntityModal`/`EditEntityModal`/`DeleteConfirmationModal` family composed from it
  (`ConfirmDialog` and `BankruptcyEntryModal` are the current, unrelated implementations); a
  user-facing list/card toggle (`ResponsiveDataView` switches on breakpoint only); richer AI message
  blocks (cards/tables/actions inside a bubble); the `components/ui|composite|layout` directory
  restructure the directive sketches — deliberately **not** done, because the repo's existing
  atoms/molecules/organisms convention is applied consistently and renaming every path would touch
  every import for no user-visible gain.
- Raw palette classes remain in `CaseStageStepper.tsx`, `StageOrientation.tsx`, `CaseActionBar.tsx`
  and `CaseWorkspacePage.tsx`. Left alone on purpose: `CaseStageStepper`/`CaseWorkspacePage` are
  W5's active rebuild, and a prior edit of that file during this pass was reverted by the concurrent
  work. They should move to the token layer as part of W5.
- The Flowbite v3 token layer is additive but global — any future page can now reach for
  `bg-neutral-*`/`text-heading`/`rounded-base`, so the two vocabularies (`--glade-*` arbitrary-value
  syntax and the new semantic classes) coexist until older components migrate. New/changed UI should
  prefer the semantic classes.
- Dark-mode token fix changes global CSS variant behavior — needs visual regression check across
  representative pages, not just the two surfaces that surfaced the bug report.
- Stepper rebuild touches shared stage-navigation state consumed by `CaseWorkspacePage.tsx`; must
  preserve existing tab/URL sync behavior while removing the duplicate control.
- flowbite-react has no native `Stepper` export — the replacement is hand-built, not a drop-in
  import, so it carries more implementation risk than a simple component swap.
