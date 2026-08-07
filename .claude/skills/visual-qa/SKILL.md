---
name: visual-qa
description: Validate the rendered result of your own UI change — the affected journeys at 320/390/768/1024/1440, every state the change can reach, keyboard and focus, contrast, console and network health — and capture the screenshots the change fragment needs. Change-scoped and run by the implementer; for the independent app-wide pass before a release verdict, use /visual-acceptance instead.
---

# Visual QA

## 1. Identity

**Skill name:** `visual-qa`
**Domain:** frontend / rendered verification of a change

**Role.** You act as the engineer who looks at what they built before saying it works. Commands
prove that the code compiles and that assertions hold; they say nothing about whether the primary
action is reachable on a phone, whether the empty state is comprehensible, or whether the console is
full of warnings. This skill covers the rendered reality of the change you just made, and produces
the evidence the change fragment is required to carry.

**Relationship to `/visual-acceptance`.** This skill is *change-scoped and self-run*: the journeys
your change touches, judged by you, during implementation. `/visual-acceptance` is *app-wide and
independent*: the key routes of the whole product, run before a release verdict, routing findings to
owning agents. Running this one does not satisfy the other.

## 2. Purpose

`.claude/rules/frontend/i18n-testing.md` requires screenshots at five widths, a no-overflow check
and a keyboard smoke test for any visual change, and `AGENTS.md`'s completion gate requires
responsive and accessibility evidence. Those requirements exist because this project's UI defects
have consistently been rendering defects — a modal footer off-screen at 320px, a table that only
scrolls, a badge colliding with the header — none of which any test in the suite would have caught.

## 3. Mission

Confirm, by looking, that the change works at every governed viewport, in both languages, in every
state it can reach, with a clean console — and produce referenced screenshots that make the claim
checkable by someone else.

## 4. Activation conditions

### Use this skill when

- You changed anything that renders: a component, a page, a token, a layout, copy that affects
  length.
- You changed a shared component — then its *other* consumers are in scope too.
- You added or changed a state (loading, empty, error, unauthorized, offline).
- You need evidence for a change fragment or for `/finish-change`.
- A defect report is visual and you need to reproduce it.

### Do NOT use this skill when

- The change cannot render (backend-only, contracts, tooling) — say so rather than producing
  irrelevant screenshots.
- You need the independent, app-wide pre-release pass — `/visual-acceptance`.
- The question is source-level design-system compliance — `/design-system-audit`.
- The question is whether the information architecture is right —
  `product-ux-reviewer` / `ux-product-director`.

## 5. System context

```text
Governed viewports (frontend/CLAUDE.md, .claude/rules/frontend/i18n-testing.md)
  1440×900   1024×768   768×1024   390×844   320×720

Routes (frontend/src/config/routes.ts)
  /login · / (client dashboard or attorney queue by role) · /assistant · /about · /help
  /case/:id and /case/:id/<section> where section ∈ overview, household, income, expenses,
  debts, assets, documents, tasks, submitted, activity, attorney-review

Running the app
  make backend        uvicorn on :8000
  make frontend       vite on :5173
  or: npm --prefix frontend run test:e2e   (Playwright starts both; locale es-PR;
      set E2E_WEB_PORT / E2E_API_PORT when another checkout is live)

Driving a browser
  A headless-browser skill is available in this environment (browse / gstack). Prefer it over
  reasoning about the DOM from source. frontend/e2e/responsive-overflow.spec.ts already encodes
  the no-horizontal-overflow assertion and is the cheapest first signal.

Surfaces that carry state
  AsyncState (LoadingState / ErrorState / EmptyState), MutationFeedback, ConfirmDialog,
  ModernHeader AI badge (available / degraded), ChatPanel degraded answer
```

## 6. Source of truth

1. The rendered page in a real browser at a real viewport.
2. The screenshots you capture, referenced by path.
3. `frontend/e2e/responsive-overflow.spec.ts` for the mechanical overflow check.
4. `docs/ux/RESPONSIVE-MOBILE-AUDIT-2026-08-07.md` and `UX-SHELL-POLISH-AUDIT-2026-08-06.md` for
   known, previously-found defects worth re-checking.

Source reading is never evidence of rendering.

## 7. Ownership

**Owns:** the rendered verification of this change and its evidence artifacts.

**Does not own:** the fix (that is `/flowbite-design-system`), the release verdict, the IA judgement,
source-level compliance.

## 8. Boundaries

- Never mark a viewport verified without having rendered it.
- Never substitute a desktop screenshot with "it should reflow".
- Never accept a console error as background noise — attribute it or report it.
- Do not fix what you find in the same breath without checking whether the defect belongs to a
  shared component; a page-local patch on a shared defect is the failure mode this project keeps
  hitting.

## 9. Invariants

```text
INVARIANT-01  Every viewport reported was actually rendered and captured.
INVARIANT-02  The page body never scrolls horizontally; a wide element scrolls inside its own
              container.
INVARIANT-03  The primary action of the screen is reachable without scrolling at 390 and 320.
INVARIANT-04  Every state the change can reach was exercised, not only success.
INVARIANT-05  The whole flow is completable with the keyboard, with visible focus.
INVARIANT-06  Both languages were rendered, not only the authoring one.
INVARIANT-07  The console has no new errors and no new warnings attributable to the change.
INVARIANT-08  Defects are named by element and file, never as "looks off".
INVARIANT-09  A shared-component change is verified in every consumer, not only the page you
              were working on.
```

## 10. Dependencies

The dev servers (or Playwright's), the headless-browser skill, seeded demo data
(`backend/app/repositories/seed.py`) for realistic content, and both role accounts. Ports collide
across checkouts — `reuseExistingServer` is on locally, so an unset `E2E_WEB_PORT` can leave you
testing another worktree's build.

## 11. Required knowledge

The five governed widths and why 320 is the one that breaks; how the mobile keyboard halves the
viewport; focus management in modals; WCAG AA contrast in practice; the difference between a
horizontal scroll on `body` and one inside a scroll container; how a degraded AI state should look.

## 12. Inputs

The change you just made, the states it can reach, the routes it appears on, and the list of
consumers if you touched a shared component.

## 13. Preconditions

1. The change builds (`npm --prefix frontend run build`).
2. Unit tests pass — a failing test means you are looking at the wrong build.
3. Servers are running on ports you own.
4. You can log in as both roles if the change is role-sensitive.

## 14. Discovery procedure

```text
1. List the routes the change appears on. For a shared component, grep its imports — every
   consumer is in scope.
2. List the states it can reach: loading, empty, populated, validation error, server error,
   unauthorized, offline, degraded-AI.
3. Start the servers on ports you own.
4. For each route × viewport (1440, 1024, 768, 390, 320): render, screenshot, inspect.
5. Repeat the critical screens in the other language.
6. Walk the flow once with the keyboard only.
7. Read the console and the network panel throughout.
```

## 15. Decision framework

**A defect appears at one viewport only** → a layout rule is missing at that breakpoint; check
whether the shared component or the page owns it.

**The same defect appears in several pages** → it belongs to the shared component. Fix it there and
re-verify every consumer.

**A table does not fit** → it needs its mobile representation, not a scroll container. That is a
`ResponsiveDataView` question.

**The primary action is below the fold at 390** → a hierarchy defect, not a spacing one; route to
`ux-product-director` rather than shrinking the margin.

**A console warning appears** → attribute it. A React key warning or a controlled/uncontrolled
warning is a real defect; an unrelated pre-existing warning is reported as pre-existing.

**Contrast looks marginal** → measure it rather than judging; the login hero's dark background is
the recurring risk here.

**You found a defect outside your change** → report it, route it, and do not silently fix it inside
a change whose fragment does not mention it.

## 16. Execution workflow

```text
BUILD        confirm you are testing your change
RUN          servers on ports you own
ENUMERATE    routes × states × languages (and consumers, for shared components)
RENDER       each viewport: 1440 → 1024 → 768 → 390 → 320
CAPTURE      screenshot per route × viewport, named so it is findable
INSPECT      overflow, overlap, truncation, primary action, contrast
STATES       force each reachable state
KEYBOARD     tab through the flow; check focus visibility and return
CONSOLE      errors, warnings, failed requests
CLASSIFY     defect → owning component/file → owning agent
REPORT       PASS/FAIL per route × viewport, with paths
```

## 17. Proactive behavior

- **Local:** while checking the changed screen, check the states next to the one you changed.
- **Horizontal:** every consumer of a changed shared component; a fix to `AppModal` must be seen in
  `BankruptcyEntryModal`, `ConfirmDialog` and `ChatPanel`.
- **Vertical:** if a rendering defect is caused by data (a missing field, an unexpected null), follow
  it to the API rather than defending the component against it.
- **Pattern:** the same visual defect in three places is a token or wrapper problem; say so instead
  of filing three tickets.
- **Regression risk:** note which screens you did *not* check, so the next gate knows the boundary
  of this evidence.

## 18. Expected agent behavior

Render before judging. Capture before reporting. Name elements and files. Check both languages.
Check the states nobody demos. Report pre-existing defects as pre-existing rather than absorbing
them.

## 19. Forbidden behaviors

```text
DO NOT:
- report a viewport you did not render;
- infer responsive behavior from CSS classes;
- screenshot only the happy, populated, Spanish, desktop case;
- describe a defect as "looks a bit off";
- ignore console warnings;
- patch a shared-component defect in one page;
- test against another checkout's running servers;
- claim keyboard accessibility without tabbing through it;
- treat a passing e2e run as visual verification.
```

## 20. Error handling strategy

| Situation | Response |
|---|---|
| Servers will not start | Report it; do not fabricate results. Check whether another checkout holds the port |
| The app renders in English when you expected Spanish | The default follows the browser locale (`src/i18n/languages.ts`); Playwright forces `es-PR`. Set the language deliberately |
| A screenshot is empty | The route probably requires auth; log in as the right role first |
| A console error comes from a browser extension or the dev server | Attribute it explicitly rather than counting or dismissing it silently |
| A defect reproduces only with seeded data | Say which data; a defect that needs an empty case is still a defect |
| A defect cannot be reproduced | Report it as unreproduced with what you tried; do not close it |

## 21. Edge cases

- **320×720** — long Spanish words, two-line buttons, badge rows, sticky footers.
- **Mobile keyboard open** in a modal form — the submit button is the thing that disappears.
- **Content taller than the viewport** in `AppModal` — the body scrolls, the page does not.
- **Empty first-run state** — a client with no case, no documents, no timeline.
- **Unauthorized** — an attorney-only surface reached by a client.
- **Degraded AI** — the header badge and the chat's degraded answer copy, in both locales.
- **Long English versus accented Spanish** — check both, not the shorter one.
- **Focus return** after a modal closes.
- **Dark surfaces** — the login hero, where contrast risk concentrates.
- **Slow network** — the loading state must exist and be readable, not a flash.

## 22. Cross-system impact checklist

```text
[ ] 1440 / 1024 / 768 / 390 / 320
[ ] ES / EN
[ ] Client / attorney where relevant
[ ] Loading / empty / error / success / unauthorized / offline / degraded
[ ] No horizontal body scroll
[ ] No overlap, clipping or unreachable control
[ ] Primary action visible without scrolling on mobile
[ ] Keyboard path complete, focus visible, focus returns
[ ] Contrast acceptable on light and dark surfaces
[ ] Console clean; no failed requests
[ ] Every consumer of a changed shared component
[ ] Screenshots captured and referenced
```

## 23. Validation strategy

Mechanical first, then human:

```bash
npm --prefix frontend run build
npm --prefix frontend run test -- --run
npm --prefix frontend run test:e2e            # responsive-overflow.spec.ts is the cheap signal
npm run agent:flowbite
```

Then render and capture. The commands cannot see layout; the screenshots cannot prove the code is
correct. Both are required, and the change fragment cites the screenshots.

## 24. Definition of Done

```text
[ ] Every affected route rendered at all five viewports
[ ] Both languages checked on the screens the change touches
[ ] Every reachable state exercised
[ ] Keyboard walk completed
[ ] Console clean or every message attributed
[ ] Consumers of changed shared components verified
[ ] Screenshots saved and referenced by path
[ ] Defects named by element and file, and routed
[ ] Anything not checked stated explicitly
```

## 25. Expected output

```markdown
## Visual QA — <change>

| Route | 1440 | 1024 | 768 | 390 | 320 | Screenshot |
|---|---|---|---|---|---|---|

### States exercised
loading / empty / error / success / unauthorized / offline / degraded

### Languages
es ✓ · en ✓ (screens: …)

### Keyboard
tab order / focus visibility / focus return

### Console
clean | <message> — attributed to <cause>

### Defects
| Defect | Element | File | Viewport | Owner |

### Not checked
- <route/state> — <why>
```

## 26. Escalation rules

Escalate when: the defect is in the information hierarchy rather than the styling
(`ux-product-director`); it is in a shared component owned by another active task; it requires a
token that does not exist (`design-system-engineer`); or the screen cannot be made usable at 320px
without dropping content — a product trade-off, not a CSS decision.

## 27. Collaboration with other skills

```text
visual-qa
 ├── follows   → flowbite-design-system (build, then look)
 ├── narrower than → visual-acceptance (change-scoped and self-run vs app-wide and independent)
 ├── complements → design-system-audit (rendered vs source)
 ├── routes to → design-system-engineer / frontend-shell-engineer / ux-product-director
 └── feeds     → finish-change (its evidence requirement)
```

## 28. Examples

**Correct.** After a change to `AppModal`'s footer: render `BankruptcyEntryModal`, `ConfirmDialog`
and `ChatPanel` at all five widths in both languages, with the mobile keyboard simulated at 320;
capture fifteen screenshots; report that the footer now stays pinned and the body scrolls; note that
`ChatPanel` at 320 in English pushes the send button to a second line and file it with the element,
the file and the viewport.

**Incorrect.** One screenshot of the page you were working on, at your laptop width, in Spanish,
with the success state — and "responsive verified".

**Complex.** A token change to `--space-4`. Every screen moves. The honest scope is the key routes
at all five viewports in both languages, and the report must say which screens were sampled and
which were not — a token change that claims full verification without enumerating what was looked at
is not evidence.

## 29. Failure scenarios

```text
Scenario: The build passes and the unit tests are green.
Wrong:    Report the UI as verified.
Correct:  Neither can see a layout. Render it. The defects this project has actually shipped were
          all invisible to both.

Scenario: A button leaves the modal viewport on mobile.
Wrong:    margin-left: -20px on that page.
Correct:  Inspect AppModal's container, the footer bar and the button group. If the defect is in the
          shared abstraction, fix it there and re-verify every consumer; otherwise you have left the
          same bug in four other modals.

Scenario: A React warning appears in the console.
Wrong:    Ignore it; the page renders.
Correct:  Attribute it. A key or controlled/uncontrolled warning is a real defect that will surface
          as lost input or a mis-rendered list under real use.
```

## 30. Self-review

1. Did I render every viewport I am reporting?
2. Did I look at 320px, or stop at 390?
3. Did I check the states nobody demos — empty, unauthorized, degraded?
4. Did I read both languages on the affected screens?
5. Did I complete the flow with the keyboard?
6. Did I check every consumer of the shared component I changed?
7. Is the console clean, or is every message attributed?
8. Are my defects named by element and file, with an owner?
9. Did I say what I did not check?
10. Did I fix a symptom in a page when the cause was in a wrapper?
