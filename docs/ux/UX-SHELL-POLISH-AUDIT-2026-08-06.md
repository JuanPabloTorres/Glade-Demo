# UX Shell Polish — Flowbite Audit (2026-08-06)

Read-only audit for task `ux-shell-polish-2026-08-06` (branch `feat/ux-shell-polish`). Written standing in for `flowbite-design-system-engineer` (temporarily unavailable). No component/page files were edited to produce this note. `flowbite-react` is pinned at `^0.12.9` (`frontend/package.json:21`); all "does/doesn't ship" claims below were verified against `frontend/node_modules/flowbite-react/dist/components/*` at that version, not from memory or the docs site.

## a. Sidebar — hybrid, not a full swap

`frontend/src/components/organisms/navigation/Sidebar.tsx` desktop variant is a hand-built `<aside className="hidden w-64 shrink-0 ... md:block">` (lines 51–53) with no collapse state at all; Flowbite `Drawer` is used only for the mobile variant (lines 64–69). `SidebarItem.tsx` and `SidebarGroup.tsx` are fully custom — the only `flowbite-react` import between them is `Tooltip`.

`flowbite-react@0.12.9` does ship a complete `Sidebar` family (`frontend/node_modules/flowbite-react/dist/components/Sidebar/`: `Sidebar`, `SidebarItem`, `SidebarItemGroup`, `SidebarItems`, `SidebarCollapse`, `SidebarCTA`, `SidebarLogo`, `SidebarContext`). `SidebarProps` (`Sidebar.d.ts`) exposes `collapsed?: boolean` and `collapseBehavior?: "collapse" | "hide"` directly — native collapse is real, not something to fake.

**Recommendation: hybrid.** Adopt flowbite-react's `Sidebar` / `SidebarItems` / `SidebarItemGroup` / `SidebarItem` primitives for the collapse mechanics (width transition, icon-only collapsed state, `collapsed` prop), but keep this app's own `SidebarGroup` label and the role badge ("CLIENTE" / attorney equivalent) as app-specific children — flowbite-react's `SidebarItem` is a leaf-only href/icon/label component with no slot for a role badge above a group, and its `SidebarItemGroup` has no header-label prop either. Re-deriving `SidebarItem.tsx`'s current active-state contrast rule and disabled+tooltip pattern (lines 39–58, already correct per this repo's own contrast convention) inside Flowbite's item is more rework than the collapse feature is worth. A full swap is not realistic without losing or rebuilding that content; a hybrid gets native collapse behavior without discarding working, spec-compliant code.

## b. Stepper — no flowbite-react Stepper exists; hand-build one, single source of truth

`frontend/src/components/molecules/CaseStageStepper.tsx`, consumed by `frontend/src/pages/CaseWorkspacePage.tsx`.

**Confirmed:** no `Stepper` directory under `frontend/node_modules/flowbite-react/dist/components/`. Full component list at this version: Accordion, Alert, Avatar, Badge, Banner, Blockquote, Breadcrumb, Button, Card, Carousel, Checkbox, Clipboard, DarkThemeToggle, Datepicker, Drawer, Dropdown, FileInput, Floating, FloatingLabel, Footer, HR, HelperText, Kbd, Label, List, ListGroup, MegaMenu, Modal, Navbar, Pagination, Popover, Progress, Radio, RangeSlider, Rating, Select, Sidebar, Spinner, Table, Tabs, TextInput, Textarea, Timeline, Toast, ToggleSwitch, Tooltip. Vanilla flowbite.com's Tailwind block library has a Stepper pattern (CSS-only: numbered circles + connecting line, no JS), but flowbite-react never packaged it as a component.

**Confirmed duplicate control (feature-architecture.md violation):** `CaseWorkspacePage.tsx` renders `CaseStageStepper` (lines 293–299, the pill-button row) directly above Flowbite's `Tabs`/`TabItem` strip (lines 301–645). Both are driven by the same `activeStage` state through `navigateToStage` / the `isSyncingTabsRef` sync effect (lines 136–193) — two separate rendered controls for one navigation concept, which is exactly what `.claude/rules/frontend/feature-architecture.md` ("Navegación de etapas tiene una sola fuente de verdad controlada") prohibits.

**Recommended replacement:** remove both the pill row and the `Tabs`/`TabItem` strip. Hand-build one stepper component using Flowbite's visual language — numbered circle per step (filled/brand color + check icon via `AppIcon` for completed, filled brand color for current, outline/muted for upcoming — reuse the contrast convention already established in `SidebarItem.tsx`'s active state), and a connecting line between circles (a plain absolutely-positioned or `border-t` div; this is pure CSS, the same technique flowbite.com's own Stepper block uses, no library needed). This becomes the *only* stage-navigation control. Tab body content currently living inside each `TabItem` should render conditionally on `activeStage` directly (e.g. per-stage extracted sections or a simple conditional block), not wrapped in Flowbite `Tabs` at all — `Tabs` is the second source of truth being removed, not repurposed as the content container. Keep the existing `Progress` bar (already Flowbite, already correct) for overall completion; only the pill row + tab strip need replacing.

## c. Login page — element-by-element clutter inventory

`frontend/src/pages/LoginPage.tsx`:

- **Background stack (4 layered elements for one photo):** remote hero image via CSS `background-image` (lines 75–79), a hidden `sr-only` `<img>` that exists solely to catch `onError` (80–85), a linear-gradient scrim (86), **and** a second radial-gradient indigo bloom layered on top of the scrim (87).
- **Triple identity treatment:** a glass "heroBadge" `Badge` (95–97, border + `backdrop-blur-md`) sits directly above a brand-mark block with its own rounded-2xl icon tile + shadow (99–107), immediately followed by the `h1`/`p` (109–114) — three separate visual treatments (badge, icon tile, headline) all saying "this is FreshStart" in sequence.
- **"How it works" 4-card grid** (116–136): each of the 4 items is a full Flowbite `Card` with `backdrop-blur-md`, border, its own icon tile, a "Paso N" eyebrow, title and detail — rendered on top of the two gradient layers from the background stack, compounding blur-on-gradient-on-photo.
- **Form card's internal stacking:** the credentials `Card` (140) contains a "demo" `Badge` (143), heading + subtitle (144–145), a decorative divider with a floating uppercase label between the role buttons and the fields (167–171, not load-bearing for comprehension), then up to **3 simultaneously-renderable `Alert`s** (173–179: error / validationError / backgroundFailed, no mutual exclusivity in the render logic) plus a **4th** disclaimer `Alert` at the bottom (217–219) — 4 uses of the same colored-bordered-icon `Alert` primitive for 4 different concerns (error, warning, info, legal disclaimer) stacked vertically.
- **Three independent blur/glass intensities** on one screen: hero badge (95), how-it-works cards (123), credentials card (140) — each with its own opacity/blur combination.

**Decluttered version keeps:** the background photo + a single scrim (drop the extra radial bloom); brand mark + `h1`/`p` as one identity block (fold the hero-badge copy into an eyebrow line above the `h1`, or drop it); the two role-selection buttons (client/attorney — the actual primary action); the email/password fields; and exactly **one** alert slot with priority-based content (error > validation > background-fallback) instead of three that can stack simultaneously.
**Cuts:** the 4-card "how it works" grid (move to onboarding/help content, not every login render); the demo badge + divider-with-floating-label combo (replace with a plain label, no divider needed for two buttons); the bottom legal disclaimer `Alert` (downgrade to plain muted text — it isn't an actionable state, so it doesn't need the alert treatment).

## d. Avatar dropdown — icon coverage

`ModernHeader.tsx` `Dropdown` (lines 86–98) has 3 `DropdownItem`s:
- "home" (line 92) — **no `AppIcon`**.
- "help" (lines 93–95) — **has** `<AppIcon name="help" size={16} />`.
- "logout" (line 97) — **no `AppIcon`**.

2 of 3 items are missing an icon. `iconRegistry.ts` already registers `home: HiHome` (line 55) but it isn't used at this call site; there is no dedicated logout icon in the registry yet (e.g. `HiArrowRightOnRectangle`), so adding one to `logout` requires a registry entry first, not just a call-site change.

## e. "Everywhere" clutter — other surfaces (concrete examples, not exhaustive)

- **`frontend/src/pages/ClientDashboardPage.tsx`** — 9 separate `<Card className="app-card...">` instances wrapping nearly every section (greeting/status, next-action, chat entry, attorney-status, pending tasks, requested documents, financial summary, timeline, other-cases): lines 84, 105, 126, 140, 159, 176, 195, 212, 226. The whole page reads as a stack of bordered boxes. It also hand-builds `icon-tile` circular icon wrappers per-card (lines 108, 128, 142) instead of a shared component, even though `docs/ux/FLOWBITE-COMPONENT-STANDARDS.md` already names `MetricCard`/`SummaryCard` as intended Card-role wrappers for exactly this.
- **`frontend/src/pages/AttorneyDashboardPage.tsx`** — the "Vistas / filtros" row (lines 192–202) is a hand-built horizontally-scrolling `AppButton` pill strip with an inline `Badge` count (`<div className="flex gap-2 overflow-x-auto pb-1">...`) — the same custom-pill-row anti-pattern flagged for `CaseStageStepper` in section (b), here used for view filters instead of stages, duplicating what Flowbite `Tabs` (already used correctly elsewhere in this same codebase, e.g. `CaseWorkspacePage.tsx`) could provide as a real component.
- **`frontend/src/pages/CaseWorkspacePage.tsx`** — 14 separate `Card className="border ... shadow-sm"` instances inside `TabItem` bodies (metrics tiles, next-steps, warnings, discussion points, chapter comparison, household form, evidence checklist, review checklist, attorney notes, etc.), so a single tab can render 3–4 stacked bordered boxes. For contrast: `frontend/src/components/organisms/CaseTimeline.tsx` in the same codebase uses Flowbite's actual `Timeline`/`TimelineItem`/`TimelinePoint`/`TimelineContent` components with zero custom containers — proof the correct pattern already exists in this repo and the dashboards/workspace pages simply aren't reusing it.

Whether to scope (e) into this pass or a follow-up is a product-owner call — listed here for visibility only, not as a recommendation to act on all of it now.
