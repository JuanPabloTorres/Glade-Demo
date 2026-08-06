---
name: visual-acceptance
description: Independent visual QA pass across breakpoints (1440/1024/768/390/320) for FreshStart pages — checks for overflow, overlap, missing primary action, and readable contrast. Use after any UI/shell change, before a release verdict, or when asked to "visually verify" or "check responsive" the app.
---

# Visual acceptance check

This project has a headless-browser skill available (`browse`/`gstack`) — prefer it over describing
what you'd expect the UI to look like. Actually navigate and screenshot; do not guess from source
reading alone.

## Viewports (architecture guide §9.1 / §20.4)
1440px, 1024px, 768px, 390px, 320px.

## Routes to check (adjust if `router.tsx` has changed)
- `/login`
- `/` (client dashboard, logged in as client)
- `/` (attorney queue, logged in as attorney)
- case workspace route for an in-progress demo case
- case workspace route scrolled to the attorney-review tab (if role is attorney)

## Per-route, per-viewport checklist
- [ ] No horizontal overflow (page body should never scroll sideways — if a table/diagram needs it,
      it must be contained in its own `overflow-x: auto` wrapper, not leak to `<body>`).
- [ ] No overlapping elements (badges colliding with nav, modals clipping off-screen, sticky actions
      covering content).
- [ ] Primary action for the page is visible without scrolling on mobile (390/320) — if not, that's a
      hierarchy defect, escalate to `ux-product-director`.
- [ ] Text contrast readable against its background (spot-check dark login hero, badges).
- [ ] Sidebar (once it exists) collapses to a drawer below 768px and does not overlay content
      unexpectedly on desktop.
- [ ] No hidden/inaccessible controls — anything reachable by mouse must also be reachable by
      keyboard tab order.

## Reporting
For each route × viewport combination, report PASS or FAIL with a screenshot reference and the
specific defect (not "looks a bit off" — name the element and the problem: "urgent-cases badge in
ModernHeader.tsx overlaps the search input at 768px"). Route findings to the owning agent:
navigation/shell issues → `frontend-shell-engineer`; spacing/typography/token issues →
`design-system-engineer`; content hierarchy issues → `ux-product-director`.

Do not mark a route PASS at a viewport you did not actually screenshot.
