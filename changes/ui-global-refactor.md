# ui-global-refactor — global UI/UX, overlay, i18n, action-control and assistant refactor

**Type:** refactor · **SemVer impact:** MINOR (new shared primitives and a new
global surface; no contract, route or business-rule change)
**Branch:** `refactor/ui-global-audit` · **Worktree:** `Glade-Demo-ui-global-refactor`

## Root causes fixed

1. **`overflow-x: hidden` on `html`/`body` disabled every `position: sticky`.**
   `hidden` computes `overflow-y` to `auto`, making the element a scroll
   container; sticky descendants then bind to a scrollport that never scrolls.
   The sidebar *and* the header scrolled away on a long page. Replaced with
   `overflow-x: clip`, which suppresses horizontal scroll without creating a
   scroll container. Measured both values before and after.
2. **`flowbite-react` overlays cannot escape a clipping ancestor.** `Tooltip`
   and `Dropdown` render as absolutely positioned siblings at `z-10` with no
   portal. Every table wrapper and `Card` clipped them, and `z-10` is below the
   header and bottom bar. Replaced with portaled primitives on a documented
   layer scale.
3. **UI text composed in code bypassed i18n entirely.** The attorney's generated
   summary was ~17 hardcoded Spanish template literals; locale-file parity
   passed because none of it lived in a locale file.
4. **The profile's language outranked the device's explicit choice** on every
   load, silently reverting a switch to English.
5. **`fallbackLng` pointed at Spanish**, so any English gap rendered Spanish and
   looked like a translation that existed.
6. **Nine equal action buttons** with no primary, wrapping into ragged rows.

## Added

- `components/overlays/useOverlayPosition.ts` — fixed-position, viewport-aware
  placement (flip, shift, scroll/resize tracking) plus the `LAYER` token map.
- `components/overlays/AppTooltip.tsx` — portaled tooltip, hover + keyboard
  focus, Escape, `aria-describedby`.
- `components/ui/ActionGroup.tsx` — the standard action control: primary
  segment + portaled menu, keyboard navigation, permission gating, async
  loading guard, mandatory confirmation for destructive actions.
- `components/molecules/LanguageSwitcher.tsx` — one switcher, `surface` /
  `onDark` tones.
- `components/ai/AiLauncher.tsx`, `components/ai/AiPanel.tsx` — the assistant as
  a global surface with `closed | open | minimized` state.
- Overlay layer scale (`--z-index-*`) in `index.css`.
- `docs/ux/OVERLAY-LAYERS-AND-ACTIONS.md`, evidence under
  `docs/ux/evidence/ui-global-refactor/`.

## Removed

- `RowActionsMenu.tsx` (superseded by `ActionGroup`).
- `LanguageToggle.tsx` (superseded by `LanguageSwitcher`).
- `MutationFeedback.tsx` — dead, three hardcoded English strings, and it
  surfaced raw `error.message` / backend `detail` to the user.
- `StatusBadge.tsx` — dead, seven hardcoded English labels.
- `auth:login.backgroundFallback` from both locales and from the login UI.

## Verification

| Gate | Result |
| --- | --- |
| `npm run i18n:check` | pass (now also checks values and array contents) |
| `npx tsc -b` | pass |
| `npm run lint` | pass (0 errors; 10 pre-existing warnings) |
| `npx vitest run` | 78 → 88 tests, all pass |
| `npm run build` | pass |
| `npx playwright test` | 80/80 pass (`--workers=1`) |
| Visual | 24 screenshots, ES + EN, 320/390/768/1024/1440 |

## Known debt

- **Backend seed content stays Spanish in an English session** (client goal,
  timeline entries, stage descriptions). Visible in
  `client-home-en-390.png`. Backend-owned; the e2e language assertions are
  scoped to UI chrome and say so.
- **Route context is displayed, not sent** to the assistant. Widening
  `bankruptcy.guide` is a contract change owned elsewhere.
- **e2e is flaky under parallel workers** (three narrow-width failures that pass
  serially and in isolation) — the specs share one backend SQLite database.
- `components/atoms/AsyncState.tsx` has no consumers; either adopt it in the
  pages that hand-roll loading/empty states, or drop it.
- This branch is based on `main` at 4.6.0; `main` is now 4.6.1. The newer
  commits touch only version manifests, so integration is clean.
- **`backend/uv.lock` is stale against `backend/pyproject.toml`** — running the
  API regenerates it to add `psycopg[binary]`, which `pyproject.toml` already
  declares. Reverted here (out of this task's ownership); it should be committed
  by whoever owns the backend, or CI will keep producing a dirty tree.
- The sibling checkout `Glade-Demo-ui-mobile-responsive` still holds an
  uncommitted variant of `AppShell.tsx`. Integration must keep one version —
  this branch's.
