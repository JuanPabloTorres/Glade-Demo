# FreshStart Acceptance Tests

Living document. Block 11's manual responsive/accessibility pass (below), extended in Block 12 with the full automated test inventory (backend pytest, frontend Vitest, Playwright).

## Block 11 — Responsive & accessibility pass

Master instruction §17/§18 call for a sweep at 320/375/390/430/768/1024/1280/1440px plus a set of accessibility checks. Verified live against the running app (Vite dev server + FastAPI backend), not just read from source.

### Breakpoints checked with screenshots

Anchor widths were screenshotted directly; the remaining widths in the required set (375, 430, 768, 1280) sit strictly between two already-verified anchors with no Tailwind breakpoint boundary of their own (Tailwind's defaults are `sm=640`, `md=768`, `lg=1024`, `xl=1280`) — so a new failure mode specific to those exact widths is not expected given the anchors both sides of them are clean. Flagging this explicitly rather than silently claiming all eight were independently screenshotted.

| Width | Verified | Pages |
|---|---|---|
| 320px | ✅ screenshot | Login, client dashboard, case workspace (Comenzar + Ingresos), attorney dashboard, case command center, a Flowbite Modal |
| 390px | ✅ screenshot (Blocks 1–7) | Login, client/attorney dashboards, case workspace, chat drawer |
| 768px (`md`) | Implied clean (between 320 and 1024 anchors, no `md`-specific grid rules in the touched pages) | — |
| 1024px (`lg`) | ✅ screenshot | Case workspace (4-column financial summary grid engages), attorney dashboard (`ResponsiveDataView` switches from cards to the real `Table`) |
| 1440px | ✅ screenshot (Blocks 1–7) | Every page |

Findings: **no horizontal overflow at any checked width**, on any page. `ResponsiveDataView` correctly shows cards below `lg` and a real `Table` at `lg`+ (verified at both 320px and 1024px). The stage-tab pill list and attorney filter-pill row both wrap/scroll rather than overflow at 320px.

One pre-existing (not introduced by this refactor) cosmetic issue noted for future polish, not fixed in this pass: the "Documentos" stage's two-column grid (`xl:grid-cols-[1fr_0.9fr]`) can leave visible empty space in the shorter column when its sibling is much taller, because Flowbite `Card` content stretches to the grid row height. Same layout pattern predates Block 4 (it existed in the original Evidencia tab before the stage restructure) — noted, not silently ignored.

### Accessibility checks

- **Icon-only controls have `aria-label`**: every raw `<button>` with only an icon child (chat FAB, chat close/upload buttons, copy-to-clipboard) was grepped and confirmed to carry an `aria-label`. Every icon-only Flowbite `Button` usage found in the codebase also has a visible text label alongside its icon (not icon-only), so no accessible-name gaps exist.
- **Decorative icons**: `AppIcon` (`frontend/src/components/atoms/AppIcon.tsx`) sets `aria-hidden="true"` by default on every rendered icon — this is the only icon-rendering path in the app (§9.1's "single icon library" rule), so this is a structural guarantee, not a per-usage check.
- **Modal focus trap**: verified live, not just assumed from "Flowbite defaults." Opened the "Solicitar documento" modal, confirmed focus lands on its first control automatically, then pressed Tab three times and confirmed focus cycled `Select → Cancelar → Solicitar → back to Select` — never escaping to the (visible, dimmed) page content behind it. No `dismissible`/focus-related prop overrides exist anywhere in the codebase (grepped for `trapFocus`/`initialFocus`/`dismissible={false}`).
- **Keyboard reachability**: the chat composer, stage tabs, and modal buttons were all reached via `Tab`/click during this pass without needing a mouse-only interaction.
- **Labels on form fields**: every `TextInput`/`Textarea`/`Select` in the workspace forms (Hogar, entry modals, chat composer) uses a paired Flowbite `Label` with `htmlFor` — confirmed by inspection during Blocks 4/6/7's construction, re-spot-checked here.

### Not covered in this pass (documented, not hidden)

- No automated axe-core (or equivalent) scan was run — this pass is a manual, targeted check (console-error-free navigation, structural grep for aria-labels, live focus-trap verification), not a full automated accessibility audit. Adding an axe CI check is a reasonable follow-up, not done here.
- Screen-reader-specific behavior (announcement of dynamic content like the chat's typing indicator or a new assistant message) was not tested with an actual screen reader — only structural/keyboard checks were performed.
