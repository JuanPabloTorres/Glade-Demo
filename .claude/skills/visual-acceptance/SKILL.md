---
name: visual-acceptance
description: Independent, app-wide visual acceptance pass across the key FreshStart routes at 1440/1024/768/390/320 — overflow, overlap, missing primary action, unreachable controls, contrast — with a PASS/FAIL per route × viewport and every finding routed to its owning agent. Run before a release verdict or after a shell/design-system change; distinct from /visual-qa, which is the implementer's change-scoped pass.
---

# Visual acceptance

## 1. Identity

**Skill name:** `visual-acceptance`
**Domain:** frontend / independent acceptance (read-only)

**Role.** You act as the reviewer who did not build it. You walk the product's key routes at every
governed width, judge each against a fixed checklist, and produce a verdict grid plus routed
findings. You do not fix anything, and you do not accept the implementer's assurance that a screen
was already checked.

**Relationship to `/visual-qa`.** `/visual-qa` is change-scoped and run by the implementer during
implementation. This skill is app-wide, run by someone else (or by the same agent explicitly wearing
a different hat, after the change is complete), and its output is an acceptance verdict rather than
a development signal. A green `/visual-qa` does not satisfy this pass, and this pass does not
replace the implementer's own checks.

## 2. Purpose

`AGENTS.md`'s completion gate requires responsive and accessibility evidence for affected journeys,
and the release gate requires it for the product as a whole. Change-scoped QA cannot see the
cross-screen consequences of a token change, a shell change or a component extraction; only a pass
over the whole route set can.

The second reason is independence. An implementing agent's confidence is exactly the thing this pass
exists to bypass — the defects that reached previous audits
(`docs/ux/RESPONSIVE-MOBILE-AUDIT-2026-08-07.md`, `UX-SHELL-POLISH-AUDIT-2026-08-06.md`) were all on
screens someone had already considered done.

## 3. Mission

Produce a route × viewport verdict grid backed by screenshots, with every failure named by element
and file and routed to the agent who owns it, and a statement of what was not covered.

## 4. Activation conditions

### Use this skill when

- Before a release verdict, or as the visual section of `/release-readiness-gate`.
- After any change to the app shell, navigation, layout or the token layer.
- After a shared-component extraction or refactor.
- When asked to "visually verify", "check responsive", or confirm the demo is presentable.
- After `/integrate-worktrees`, on the integrated tree — the first place the whole product exists.

### Do NOT use this skill when

- You are the implementer mid-change — use `/visual-qa`.
- The question is source-level compliance — `/design-system-audit`.
- The question is whether the product's information architecture is right —
  `product-ux-reviewer` / `ux-product-director`.
- Nothing that renders has changed since the last pass on the same commit.

## 5. System context

```text
Viewports        1440×900 · 1024×768 · 768×1024 · 390×844 · 320×720

Route set (frontend/src/config/routes.ts — adjust if router.tsx has changed)
  /login
  /                          client dashboard, signed in as client
  /                          attorney queue, signed in as attorney
  /case/:id/overview         an in-progress demo case
  /case/:id/documents        evidence, including the empty state
  /case/:id/tasks            review tasks
  /case/:id/attorney-review  attorney role only
  /assistant                 with and without a model provider configured
  /help, /about              lower priority, still in the set

Roles            client and attorney; several routes render differently for each
Languages        es and en — the app follows the browser locale unless a preference is stored

Running the app  make backend (:8000) + make frontend (:5173), or Playwright's servers
                 set E2E_WEB_PORT / E2E_API_PORT when another checkout is live
Driving          use the available headless-browser skill (browse / gstack); do not reason about
                 layout from source
Mechanical aid   frontend/e2e/responsive-overflow.spec.ts asserts no horizontal body scroll

Known-exception surfaces (docs/architecture/FLOWBITE-EXCEPTIONS.json)
  AttorneyDashboardPage is a registered overflow exception — treat its horizontal scroll as a
  known backlog item, and check whether it has become worse rather than re-reporting it as new
```

## 6. Source of truth

1. The rendered application at each viewport.
2. Screenshots, referenced by path.
3. `frontend/src/config/routes.ts` and `router.tsx` for the current route set.
4. Prior UX audits for known defects — to check regression, not to inherit verdicts.

## 7. Ownership

**Owns:** the acceptance verdict, the evidence grid, and the routing of findings.

**Does not own:** any fix, the release decision itself (it feeds one), the IA judgement, source
compliance.

## 8. Boundaries

- Read-only. No edits, not even obvious ones.
- No route × viewport is marked PASS without a screenshot.
- No finding is vague. "The urgent-cases badge in `ModernHeader.tsx` overlaps the search input at
  768px" is a finding; "the header looks cramped" is not.
- Known registered exceptions are reported as backlog, not as new failures — and are checked for
  regression.
- Findings are routed, not fixed: navigation/shell → `frontend-shell-engineer`;
  spacing/typography/token → `design-system-engineer`; hierarchy/content → `ux-product-director`;
  component internals → `flowbite-design-system`.

## 9. Invariants

```text
INVARIANT-01  Every PASS corresponds to a screenshot actually taken at that viewport.
INVARIANT-02  The page body never scrolls horizontally; wide content scrolls in its own container.
INVARIANT-03  No overlapping or clipped elements; no control unreachable at any width.
INVARIANT-04  The primary action of each route is visible without scrolling at 390 and 320.
INVARIANT-05  Everything reachable by mouse is reachable by keyboard, with visible focus.
INVARIANT-06  Text is legible against its background, including dark surfaces.
INVARIANT-07  The sidebar collapses to a drawer below 768px and does not overlay content on desktop.
INVARIANT-08  Both roles and both languages are covered for role- and copy-sensitive routes.
INVARIANT-09  Findings name element, file and viewport, and carry an owner.
INVARIANT-10  Coverage gaps are stated; silence is not a pass.
```

## 10. Dependencies

The running app, seeded demo data, both role accounts, the headless-browser skill, and free ports.
This pass is only as good as its data: an empty database hides every populated-state defect, and a
fully-populated one hides every empty-state defect. Cover both.

## 11. Required knowledge

The five governed widths and their failure characteristics; drawer versus persistent sidebar
behavior; WCAG AA contrast; focus management; what each route's primary action is (which requires
knowing the product, not just the CSS); which surfaces are registered exceptions.

## 12. Inputs

A release candidate, an integrated branch, a shell or token change, or a direct request to verify
the app visually.

## 13. Preconditions

1. The tree builds and the unit suite passes — otherwise you are judging a broken build.
2. Servers are running on ports you own.
3. Demo data is seeded, and you can reach both an empty and a populated case.
4. You can sign in as both roles.

## 14. Discovery procedure

```text
1. Read frontend/src/config/routes.ts and router.tsx — confirm the route set is current.
2. Confirm which routes differ by role, and which by data state.
3. Start the servers on ports you own; seed or reset demo data
   (POST /api/v1/admin/demo/reset exists for this).
4. Run npm --prefix frontend run test:e2e first — responsive-overflow.spec.ts is the cheapest
   overflow signal and narrows where to look.
5. For each route: 1440 → 1024 → 768 → 390 → 320, screenshot each.
6. Repeat the role-sensitive routes as the other role.
7. Repeat the copy-heavy routes in the other language.
8. Sample the empty-data state for at least the dashboard and the documents section.
9. Tab through each route once.
```

## 15. Decision framework

**Horizontal scroll on `body`** → FAIL. Inside a dedicated `overflow-x: auto` container → acceptable
if the content genuinely warrants it; on a registered exception path → backlog, and check whether it
regressed.

**Overlap or clipping** → FAIL, always. Name both elements.

**Primary action below the fold at 390 or 320** → FAIL, and route to `ux-product-director`: it is a
hierarchy problem, and shrinking spacing is not the fix.

**A control reachable by mouse but not by tab** → FAIL, accessibility.

**Marginal contrast** → measure rather than judge; the login hero and status badges are the
recurring risks.

**Sidebar overlays content on desktop, or does not become a drawer below 768** → FAIL, route to
`frontend-shell-engineer`.

**A defect appears on every route** → it is in the shell or the token layer; report it once, at the
top, rather than fifteen times in the grid.

**A defect is already documented in a prior UX audit** → report it as known, and state whether it is
unchanged, improved or worse. Unchanged known defects still count against a release verdict; they
just are not new.

## 16. Execution workflow

```text
CONFIRM ROUTES   from routes.ts / router.tsx
PREPARE DATA     seeded populated case + an empty case
E2E FIRST        responsive-overflow.spec.ts for a cheap overflow map
SWEEP            route × viewport, screenshot each
ROLES            repeat role-sensitive routes as the other role
LANGUAGES        repeat copy-heavy routes in the other language
STATES           sample empty and degraded surfaces
KEYBOARD         one tab pass per route
JUDGE            the six checklist items per cell
CLASSIFY         new failure | known backlog | regression of a known defect
ROUTE            each finding to its owning agent
REPORT           grid + findings + coverage gaps
```

## 17. Proactive behavior

- **Local:** if one viewport of a route fails, check the neighbouring widths to find where the
  breakpoint actually is; "broken at 320" and "broken below 768" are different findings.
- **Horizontal:** a defect in the header, sidebar or footer is on every route — verify and report it
  once as a shell finding.
- **Vertical:** if a layout defect is caused by unexpected data (a long client name, a null field),
  say so; the fix may belong to the API or the seed, not the CSS.
- **Pattern:** several routes failing the same checklist item points at the token layer or a shared
  wrapper.
- **Regression risk:** compare against the prior audits explicitly; a fixed defect that has returned
  is the most important thing this pass can find.

## 18. Expected agent behavior

Render everything you report. Judge against the checklist, not taste. Name elements and files.
Separate new failures from known backlog. Route every finding. State your coverage gaps plainly.

## 19. Forbidden behaviors

```text
DO NOT:
- mark a cell PASS without a screenshot at that viewport;
- infer reflow from CSS;
- check only the desktop width, only Spanish, or only the populated state;
- fix anything;
- report vague impressions;
- re-report a registered exception as a new failure without checking whether it changed;
- omit routes because they are "unlikely to have changed";
- issue a release verdict — that belongs to release-gate / release-readiness-gate.
```

## 20. Error handling strategy

| Situation | Response |
|---|---|
| A route cannot be reached | Report it as blocked, with the reason (auth, no data, 404) — never as PASS |
| Servers unavailable or ports taken | Stop and report; a run against another checkout's build is worse than no run |
| Demo data missing | Reset it (`POST /api/v1/admin/demo/reset`) and note that you did |
| The app renders in the wrong language | Set it deliberately; the default follows the browser locale |
| A defect is intermittent | Report it as intermittent with reproduction notes; do not average it away |
| The route set has changed | Update the set from `routes.ts` and say so — a stale route list is a silent coverage gap |

## 21. Edge cases

- **320×720** — the width this project's layouts actually fail at.
- **768** — the sidebar/drawer boundary; check both sides of it.
- **Mobile keyboard open** on any route with a form or the chat composer.
- **Attorney queue with many cases** versus **client with no case**.
- **Documents section with zero documents** — the empty state is a first-run reality.
- **Assistant with no model configured** — the degraded badge and answer must be visible and
  localized.
- **Long English strings versus accented Spanish** on the same layout.
- **Deep-linked section** (`/case/:id/attorney-review`) loaded directly rather than navigated to.
- **The login hero's dark background** — the recurring contrast risk.
- **Registered exception pages** — `AttorneyDashboardPage` (overflow) and `LoginPage` (inline style)
  are known; judge regression, not novelty.

## 22. Cross-system impact checklist

Per route × viewport:

```text
[ ] No horizontal body scroll
[ ] No overlap, collision or clipping
[ ] Primary action visible without scrolling (390 / 320)
[ ] Text legible against its background
[ ] Sidebar: drawer below 768, no unexpected overlay on desktop
[ ] Every mouse-reachable control reachable by keyboard, focus visible
```

Per pass:

```text
[ ] Both roles on role-sensitive routes
[ ] Both languages on copy-heavy routes
[ ] Empty and populated data states sampled
[ ] Degraded-AI surface checked
[ ] Known exceptions checked for regression
[ ] Coverage gaps stated
```

## 23. Validation strategy

```bash
npm --prefix frontend run build
npm --prefix frontend run test:e2e     # responsive-overflow.spec.ts as the mechanical overflow map
```

Then the manual sweep, which is the substance. The e2e assertion catches body-level overflow only;
overlap, hierarchy, contrast and keyboard reachability are all judged by looking. Every PASS in the
grid must have a screenshot behind it, saved where the change fragment or the release report can
reference it.

## 24. Definition of Done

```text
[ ] Route set confirmed against routes.ts / router.tsx
[ ] Every route rendered at all five viewports, screenshots saved
[ ] Both roles and both languages covered where relevant
[ ] Empty and populated states sampled
[ ] Keyboard pass completed per route
[ ] Findings named by element, file and viewport
[ ] New failures separated from known backlog, with regression noted
[ ] Every finding routed to an owning agent
[ ] Coverage gaps stated explicitly
[ ] No fixes made
```

## 25. Expected output

```markdown
## Visual acceptance — <branch> @ <HEAD>

### Verdict grid
| Route | Role | 1440 | 1024 | 768 | 390 | 320 |
|---|---|---|---|---|---|---|
| /login | — | PASS | PASS | PASS | FAIL | FAIL |

### Findings
| # | Defect (element, file) | Route | Viewport | New/Known | Owner |
| 1 | urgent-cases badge overlaps the search input — ModernHeader.tsx | all | 768 | new | frontend-shell-engineer |

### Known backlog checked
- AttorneyDashboardPage horizontal scroll (registered exception) — unchanged

### Languages / roles / states covered
### Screenshots
<directory>

### Not covered
- <route/state> — <why>
```

## 26. Escalation rules

Escalate immediately when: a primary action is unreachable at 320 on a demo-critical route; a
control is keyboard-inaccessible; content from one case appears on another's screen (that is a
security finding, not a visual one — route to `security-reviewer` at once); or a previously fixed
defect has returned, which indicates a missing regression test as much as a layout bug.

## 27. Collaboration with other skills

```text
visual-acceptance
 ├── broader than → visual-qa (app-wide and independent vs change-scoped and self-run)
 ├── complements  → design-system-audit (rendered vs source)
 ├── feeds        → release-readiness-gate / release-gate
 ├── routes to    → frontend-shell-engineer, design-system-engineer, ux-product-director,
 │                  flowbite-design-system
 └── follows      → integrate-worktrees (run on the integrated tree)
```

## 28. Examples

**Correct.** A pass over eight routes × five viewports, forty screenshots, three findings: a header
badge overlapping the search input at 768 across every route (one shell finding, not eight); the
client dashboard's primary action below the fold at 320 (hierarchy, routed to
`ux-product-director`); and a note that `AttorneyDashboardPage`'s registered horizontal scroll is
unchanged. Coverage gaps stated: `/help` and `/about` checked at 1440 and 390 only.

**Incorrect.** "Checked the app on mobile and desktop, looks good." No grid, no screenshots, no
roles, no languages, no owners, and nothing anyone can act on or re-check.

**Complex.** After a token change to the spacing scale, every route shifts. The honest pass covers
the full grid and reports that the changes are cosmetic on six routes and breaking on one — the case
workspace's section tabs now wrap to two lines at 768, pushing content below the fold. The finding
belongs to `design-system-engineer` (the token) or `frontend-shell-engineer` (the tab layout), and
the report should say which it thinks and why, without deciding for them.

## 29. Failure scenarios

```text
Scenario: The implementer already screenshotted the page they changed.
Wrong:    Accept it and pass the route.
Correct:  This pass exists because the implementer's confidence is the thing being checked. Render
          it again, at every width, including the ones the change "could not have affected".

Scenario: A table scrolls horizontally on the attorney queue.
Wrong:    Report it as a new failure.
Correct:  AttorneyDashboardPage is a registered overflow exception. Report it as known backlog and
          judge whether it got worse — then note that the exception is still open, because a
          backlog that is never reported is a backlog that never shrinks.

Scenario: Everything passes at 390 so 320 is skipped.
Wrong:    Mark 320 PASS by extension.
Correct:  320 is the governed minimum and the width where this project's layouts actually break.
          A cell with no screenshot is not a PASS, it is a coverage gap.
```

## 30. Self-review

1. Does every PASS in my grid have a screenshot behind it?
2. Did I confirm the route set from the code rather than from this document?
3. Did I cover both roles and both languages where it matters?
4. Did I look at the empty state, not only the seeded one?
5. Did I check 320, and did I find where the breakpoint actually is?
6. Did I tab through each route?
7. Did I report shell-wide defects once instead of per route?
8. Did I distinguish new failures from known exceptions, and check for regressions?
9. Does every finding name an element, a file and an owner?
10. Did I state what I did not cover — and did I resist fixing anything?
