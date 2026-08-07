---
taskId: ui-mobile-responsive
type: patch
scope: frontend-responsive
---
# Summary
Fix the structural cause of the app-wide mobile responsive failure: the `AppShell` content
column was a flex item without `min-w-0`, so its `min-width: auto` resolved to its
content-based minimum and the whole app was laid out at that width regardless of viewport
(measured: 875px of content in a 390px viewport on the case workspace, 1280px on the attorney
inbox). Add a measured regression gate across 320–1440px.

# User-visible behavior
On phones and small tablets, page content now fits the screen at every audited width: nothing
is cut off on the right, text is no longer truncated by the layout, and there is no horizontal
overflow. No page-level layout was redesigned — pages already composed correctly; the shell was
overriding them.

# Migration / compatibility
None. One class added in `AppShell`; no API, prop or token changes. `playwright.config.ts`
gains `E2E_WEB_PORT` / `E2E_API_PORT` overrides whose defaults match the previous hardcoded
ports, so existing invocations behave identically.

# Tests and evidence
`frontend/e2e/responsive-overflow.spec.ts` (new, 39 cases): measures the widest right edge
reached by any laid-out element at 320/360/375/390/412/430/768/1024/1440px across login,
client home, the case workspace and all seven of its stages, the entry modal, the assistant
drawer, the attorney inbox and workspace with three of its modals, and `/about` + `/help`;
plus the mobile shell contract (sidebar reserves 0px below `md`, bottom-nav targets ≥44px,
sidebar/bottom-nav never coexist). Full audit in
`docs/ux/RESPONSIVE-MOBILE-AUDIT-2026-08-07.md`.

The spec deliberately does not assert on `scrollWidth`: `index.css` clips horizontal overflow
at the document level, which made the pre-existing mobile assertion
(`bodyBox.width <= 390` in `matter-workflow.spec.ts`) pass by construction and is why this
defect survived in the test suite.

# Risks / limitations
- `overflow-x: hidden` on `html`/`body` is kept — it legitimately contains off-canvas
  overlays — but it is a known `position: sticky` hazard for `ModernHeader`. Recorded as debt
  in the audit doc, not changed without evidence of a concrete defect.
- Integration conflict risk: `BankruptcyEntryModal.tsx` and `ConfirmDialog.tsx` are being
  edited concurrently in the primary worktree on `feat/ui-responsive-branding-nav`. This task
  does not touch either file, but `AppShell.tsx` is shared surface with
  `feat/ui-shell-responsive-nav`, whose worktree holds a divergent uncommitted variant of the
  navigation work already committed at `9fdc614`. integration-manager must reconcile.
