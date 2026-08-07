---
name: design-system-audit
description: Read-only audit of frontend/src for design-system violations — icon-registry bypass, page-level Flowbite, inline styles, arbitrary colors and sizes, competing component implementations, hardcoded copy, missing mobile representations, and the state of the registered exceptions backlog. Reports every hit with file:line and compares against a measured baseline. Use before or after any UI change, and when asked whether the design system is actually being followed.
---

# Design system audit

## 1. Identity

**Skill name:** `design-system-audit`
**Domain:** frontend / design-system compliance (read-only)

**Role.** You act as the auditor of the UI layer's consistency. You do not judge whether a screen is
attractive — that is `product-ux-reviewer` — and you do not judge whether it renders correctly at
390px, which is `/visual-acceptance`. You determine, from the source, whether the governed layers
are actually being used, and you count.

## 2. Purpose

`scripts/agent/flowbite-check.mjs` enforces four rules mechanically and passes as soon as a
violation is registered in `docs/architecture/FLOWBITE-EXCEPTIONS.json`. That is the right design —
the exception file is a migration backlog — but it means a green `agent:flowbite` is not the same as
a healthy design system. Several real drift patterns are outside its rule set entirely: hardcoded
hex colors, arbitrary sizes, duplicate components, tables without mobile representations, copy
outside i18n.

This audit covers the whole surface, distinguishes *new* drift from the known backlog, and refuses
to round partial progress up to a pass.

## 3. Mission

Produce a per-check count and a `file:line` list of every design-system violation currently in
`frontend/src`, separated into new drift (must be fixed) and registered backlog (must be shrinking),
with a verdict that is FAIL if either got worse.

## 4. Activation conditions

### Use this skill when

- Before or after any change under `frontend/src/components` or `frontend/src/pages`.
- As part of `/release-readiness-gate`.
- When asked "is the design system actually being followed".
- When `agent:flowbite` passes but the UI still looks inconsistent.
- Periodically, to check the exceptions backlog is shrinking rather than growing.

### Do NOT use this skill when

- You intend to fix what you find — audit first, then `/flowbite-design-system`.
- The question is about rendered layout, overflow or contrast at a viewport —
  `/visual-acceptance`.
- The question is about copy quality or hierarchy — `/i18n-change`,
  `product-ux-reviewer`.

## 5. System context

```text
Mechanically enforced (scripts/agent/flowbite-check.mjs, via npm run agent:flowbite)
  1. react-icons/hi2 imported outside frontend/src/config/iconRegistry.ts
  2. flowbite-react imported inside frontend/src/pages/**
  3. style={{ … }} inside frontend/src/pages/**
  4. overflow-x-auto inside frontend/src/pages/**
  Any path listed in docs/architecture/FLOWBITE-EXCEPTIONS.json is downgraded to a warning.

NOT mechanically enforced — this audit's added value
  5. hardcoded hex colors and arbitrary Tailwind values
  6. competing component implementations (a second button, a third table)
  7. visible copy outside i18n
  8. tables without an equivalent mobile representation
  9. token coverage (do --color-*, --font-*, --space-* exist and get used?)

Token layer            frontend/src/index.css
Icon registry          frontend/src/config/iconRegistry.ts
Shared components      frontend/src/components/{atoms,molecules,organisms,ui,forms,overlays,
                       data-display,feedback}
Exceptions registry    docs/architecture/FLOWBITE-EXCEPTIONS.json
Standards              docs/ux/FLOWBITE-COMPONENT-STANDARDS.md
                       docs/architecture/PATTERN-CATALOG.md
```

## 6. Source of truth

1. The source under `frontend/src`.
2. `scripts/agent/flowbite-check.mjs` for what is enforced and how exceptions are applied.
3. `docs/architecture/FLOWBITE-EXCEPTIONS.json` for the sanctioned backlog and its policy note.
4. `frontend/src/index.css` for the token vocabulary that exists.
5. Prior audit documents — history only; the baseline below was measured, not inherited.

## 7. Ownership

**Owns:** the findings and the verdict. Nothing on disk.

**Does not own:** any fix. Findings route to `/flowbite-design-system` or
`design-system-engineer`.

## 8. Boundaries

- Read-only. No `Edit`, no `Write`, no formatter.
- Every violation is listed individually with `file:line`. Counts without locations are not
  findings.
- A registered exception is reported as backlog, not silently excluded — the count matters because
  it should be going down.
- The audit does not decide whether a violation is acceptable; it reports and routes.

## 9. Invariants

```text
INVARIANT-01  Every violation is reported with file:line. No summarizing away individual hits.
INVARIANT-02  New drift and registered backlog are counted separately.
INVARIANT-03  A grep hit is confirmed by reading the line before it is counted.
INVARIANT-04  Zero new violations is the only PASS. Partial progress is not rounded up.
INVARIANT-05  An increase in the exceptions registry is a FAIL regardless of the other checks.
INVARIANT-06  Nothing is modified.
```

## 10. Dependencies

`agent:flowbite`, the token file, the exceptions registry, the component inventory. If the component
layout moves, the searches must be re-derived rather than re-run verbatim.

## 11. Required knowledge

Tailwind 4 arbitrary-value syntax (`text-[13px]`, `bg-[#hex]`) versus scale utilities and CSS
variables (`text-[var(--color-text)]` is a token reference, not a violation); the atoms/molecules/
organisms layering used here; i18next key usage; what "equivalent mobile representation" means in
`ResponsiveDataView` terms.

## 12. Inputs

A UI change to review, a release gate, or a general health question.

## 13. Preconditions

1. You are in the checkout being audited.
2. You know whether a UI change has just landed (so you can attribute new drift).

## 14. Discovery procedure — the checks

### Check 1 — Icon registry bypass

```
grep -rn "from \"react-icons" frontend/src --include="*.tsx" --include="*.ts"
```

Only `frontend/src/config/iconRegistry.ts` (the `react-icons/hi2` import and the `IconType` type
import) may match. **Measured baseline: 0 violations** — the historical `LoginPage`
(`HiEye`/`HiEyeSlash`) and language-selector (`FaLanguage`) bypasses have been migrated. Any hit
today is new drift.

### Check 2 — Page-level Flowbite

```
grep -rln "from \"flowbite-react\"" frontend/src/pages --include="*.tsx"
```

**Measured baseline: 5 pages, all registered** — `LoginPage`, `ClientDashboardPage`,
`CaseWorkspacePage`, `AttorneyDashboardPage`, `AboutPlatformPage`. That is exactly the
`directFlowbitePages` list, so the registry has no stale entries and no unregistered violations. A
sixth page, or a page not in the registry, is new drift.

### Check 3 — Competing implementations

```
grep -rln "components/ui/AppButton" frontend/src --include="*.tsx"
grep -rn "<button" frontend/src/pages frontend/src/components --include="*.tsx"
```

Two live patterns (shared `AppButton` and Flowbite's `Button` inside registered pages) is the known
state. The finding to look for is a *third*: a raw `<button>` with bespoke classes, or a new
`Button`-like component. Do the same for tables (`ResponsiveDataView` versus a hand-rolled
`<table>`) and modals (`AppModal` versus a bespoke overlay).

### Check 4 — Hardcoded colors and arbitrary sizes

```
grep -rnE "\[#[0-9a-fA-F]{3,8}\]" frontend/src --include="*.tsx"
grep -rnE "text-\[[0-9]+px\]|p-\[[0-9]+px\]|m-\[[0-9]+px\]|gap-\[[0-9]+px\]" frontend/src --include="*.tsx"
```

`[var(--color-…)]` is a token reference and is fine; `[#hex]` is not.
**Measured baseline: 4 hex literals in 2 files** —
`CaseWorkspacePage.tsx:349` (`border-[#f8d3d1]`, `bg-[#fff7f6]`), `CaseWorkspacePage.tsx:350`
(`text-[#f85e59]`), `LoginPage.tsx:87` (`bg-[#09111f]`). **Arbitrary px sizes: 0.** These hex values
are *not* covered by `flowbite-check` and are not in the exceptions registry, so they are unguarded
drift — they should become tokens (a warning-surface pair and a login-hero background).

### Check 5 — Copy outside i18n

```
grep -rnE ">[A-ZÁÉÍÓÚÑ][a-záéíóúñ ]{3,}<" frontend/src/components frontend/src/pages --include="*.tsx"
```

**Measured baseline: 0 matches** — the historical `CaseStageStepper` ("Flujo guiado", "Paso X de Y")
and `StageOrientation` ("Preguntar al asistente") strings have been localized. Cross-check any hit
against `t("…")` usage and dev-only comments before counting it. Note this heuristic only catches
Spanish-looking text between tags; also spot-check `aria-label`, `title`, `placeholder` and `alt`
attributes, which it cannot see.

### Check 6 — Token layer

```
grep -nE "^\s*--color-|^\s*--font-|^\s*--space-|^\s*--radius-" frontend/src/index.css
```

**Measured baseline: all three scales exist** — semantic `--color-*`, a typography scale
(`--font-size/weight/leading-{display,page-title,section-title,card-title,body,supporting,label}`),
a spacing scale (`--space-1..10` = 4→64px) and `--radius-base`. The older audit note that "only
`--color-*` tokens exist" is obsolete. The live question is now *usage*: are new components reaching
for these, or for raw Tailwind numbers?

### Check 7 — Mobile representation

```
grep -rln "<table\|Table" frontend/src/pages frontend/src/components --include="*.tsx"
grep -rln "ResponsiveDataView" frontend/src --include="*.tsx"
```

Every tabular surface should either use `ResponsiveDataView` or have an explicit card path. A table
whose only mobile answer is scrolling is a finding even when `flowbite-check` passes it via the
`overflowReviewFiles` exception (currently `AttorneyDashboardPage`).

### Check 8 — Exceptions backlog

Read `docs/architecture/FLOWBITE-EXCEPTIONS.json`. **Measured baseline: 5 `directFlowbitePages`,
1 `directIconImports` (LoginPage), 1 `inlineStyleFiles` (LoginPage), 1 `overflowReviewFiles`
(AttorneyDashboardPage).** Then run `npm run agent:flowbite` and compare: entries that no longer
produce a warning are *stale* and can be removed, which is progress worth reporting. Currently only
two warnings fire (AttorneyDashboardPage overflow, LoginPage inline style), while `directIconImports`
for LoginPage no longer triggers — that entry is removable.

## 15. Decision framework

**A hit is inside a registered exception path** → backlog, not new drift. Count it separately and
check whether it is now removable.

**A hit is outside the registry** → new drift. FAIL.

**The count is lower than baseline but not zero** → still FAIL for that check, reported as
"improving". Rounding partial progress to PASS is how a backlog becomes permanent.

**A registry entry produces no warning** → stale; report it as removable progress.

**The registry grew** → FAIL overall, regardless of everything else. New exceptions require an ADR
or a dedicated migration task, per the policy note in the file itself.

**A violation is a `[var(--token)]` reference** → not a violation. Read the line before counting.

**A check's search finds nothing where you expected something** → re-derive the search; the
component layout has changed before and a stale pattern yields a false PASS, which is worse than a
false FAIL.

## 16. Execution workflow

```text
RUN         npm run agent:flowbite  (capture warnings, not just the exit code)
CHECKS      1 → 8, each with its search
CONFIRM     read every hit; discard token references and comments
CLASSIFY    new drift | registered backlog | removable stale entry
COMPARE     against the measured baselines above
VERDICT     PASS only if new drift is zero and the registry did not grow
ROUTE       findings → design-system-engineer / flowbite-design-system
```

## 17. Proactive behavior

- **Local:** a file with one violation usually has more of the same kind — read it fully rather than
  reporting the single grep hit.
- **Horizontal:** if a pattern appears in two pages, check the remaining seven; drift spreads by
  copy-paste.
- **Vertical:** a hardcoded color in a page often means the token it needed does not exist. Report
  the missing token, not just the literal.
- **Pattern:** several pages hand-rolling the same layout is a missing shared component; that is a
  more valuable finding than the individual hits.
- **Regression risk:** note which findings are inside components with many consumers — fixing them
  is a fleet-wide change and needs `/visual-acceptance` afterwards.

## 18. Expected agent behavior

Run the checks. Read every hit. Count precisely. Separate new drift from backlog. Report locations,
not impressions. Route each finding to an owner. Say what improved as well as what did not.

## 19. Forbidden behaviors

```text
DO NOT:
- modify any file, including "obvious" fixes;
- report a count without file:line locations;
- treat a green agent:flowbite as a passing design system;
- fold registered backlog into the new-drift count, or vice versa;
- count [var(--token)] as a hardcoded value;
- declare PASS on partial progress;
- inherit a baseline from an old audit document instead of measuring;
- report "the UI looks inconsistent" without naming the component and the line.
```

## 20. Error handling strategy

| Situation | Response |
|---|---|
| A search returns nothing where a violation was expected | Re-derive the pattern; report the layout change |
| A file matches but the line is a comment or a doc example | Not a violation; note it if the search is noisy |
| `agent:flowbite` fails outright | An unregistered mechanical violation exists — report it first; it blocks the build |
| `FLOWBITE-EXCEPTIONS.json` is missing or malformed | `readJson` falls back to empty lists, so every registered path becomes a hard error; report the file as the cause |
| The measured baseline in §14 no longer matches reality | Re-measure, report both numbers, and note that this skill's baseline needs updating |

## 21. Edge cases

- **Token references in brackets.** `text-[var(--color-text)]` is correct usage.
- **Test and story files.** A raw `<button>` in a test is not product drift.
- **Generated files.** `apiContracts.generated.ts` is out of scope.
- **Attribute copy.** `aria-label="Cerrar"` is an i18n violation the tag heuristic cannot see.
- **Dark surfaces.** The login hero's `bg-[#09111f]` is both a token gap and a contrast context —
  mention both.
- **Icons via a wrapper.** `AppIcon` is the only legitimate consumer of the registry; a component
  importing `iconRegistry` directly is worth a note.
- **A component that intentionally sits outside the system** (a third-party embed) needs a
  registered exception, not silence.

## 22. Cross-system impact checklist

```text
[ ] Icon registry bypass count
[ ] Page-level Flowbite count vs registry
[ ] Inline style count vs registry
[ ] overflow-x-auto count vs registry
[ ] Hardcoded hex / arbitrary size count
[ ] Competing button / table / modal implementations
[ ] Copy outside i18n, including attributes
[ ] Tables without an equivalent mobile representation
[ ] Token scales present and used
[ ] Exceptions registry: grew / unchanged / shrank
[ ] Every finding routed to an owner
```

## 23. Validation strategy

The audit's own output is validated by reproducibility: another agent running the same searches must
get the same counts. Pair it with `npm run agent:flowbite` (mechanical) and `/visual-acceptance`
(rendered). Source-level compliance and rendered correctness are independent — a screen can be
perfectly token-compliant and unusable at 320px, and vice versa.

## 24. Definition of Done

```text
[ ] All eight checks run against the current tree
[ ] Every hit confirmed by reading and listed with file:line
[ ] New drift and backlog counted separately
[ ] Compared against the measured baselines
[ ] Registry growth checked explicitly
[ ] Stale (removable) registry entries identified
[ ] Verdict PASS/FAIL per check and overall
[ ] Findings routed
```

## 25. Expected output

```markdown
## Design system audit — <branch> @ <HEAD>

| # | Check | Violations | Baseline | New drift | Verdict |
|---|---|---|---|---|---|
| 1 | Icon registry bypass | 0 | 0 | 0 | PASS |
| 2 | Page-level Flowbite | 5 (all registered) | 5 | 0 | PASS (backlog) |
| 4 | Hardcoded hex | 4 | 4 | 0 | FAIL (unguarded drift, not registered) |
| … | | | | | |

### New drift (must fix)
- <file:line> — <what> → <owner>

### Registered backlog
- <file> — <exception kind> — removable? yes/no

### Missing tokens implied by the findings
- warning-surface border/background pair (CaseWorkspacePage.tsx:349)
- login hero background (LoginPage.tsx:87)

### Verdict
PASS | FAIL — <reason>
```

## 26. Escalation rules

Escalate when: the exceptions registry grew without an ADR; a violation is systemic (the same
pattern in five or more files, meaning a component is missing); or a "fix" would require changing a
shared component that another active task owns. Do not escalate individual token literals — route
them.

## 27. Collaboration with other skills

```text
design-system-audit
 ├── precedes  → flowbite-design-system (fix what the audit found)
 ├── feeds     → release-readiness-gate (the UI-consistency section)
 ├── complements → visual-acceptance (source compliance vs rendered correctness)
 ├── routes to → design-system-engineer for token and primitive work
 └── mirrors   → ai-context-audit in method (re-derive, cite, never inherit)
```

## 28. Examples

**Correct.** Check 4 reports: "4 hex literals, 2 files —
`CaseWorkspacePage.tsx:349` (`border-[#f8d3d1]`, `bg-[#fff7f6]`), `:350` (`text-[#f85e59]`),
`LoginPage.tsx:87` (`bg-[#09111f]`). None registered in FLOWBITE-EXCEPTIONS.json, so all four are
unguarded drift. The workspace trio is a warning-surface pattern with no token; the login value is a
hero background with no token. Route to design-system-engineer: add
`--color-warning-surface`/`--color-warning-border` and a hero token, then replace."
Counted, located, explained, routed.

**Incorrect.** "Mostly compliant, a few hardcoded colors remain." No count, no locations, no
distinction between registered and unregistered, and nothing anyone can act on.

**Complex.** `agent:flowbite` is green and every mechanical check passes, but three pages each
render their own summary card with the same flex/border/padding trio. No rule catches it, and no
single hit is a violation. The finding is the pattern: a missing `SummaryCard` component, with the
three call sites listed — the most valuable output this audit can produce, and the one a purely
mechanical check will never generate.

## 29. Failure scenarios

```text
Scenario: agent:flowbite exits 0.
Wrong:    Report the design system as compliant.
Correct:  It passed because four rules were satisfied or registered. Hex literals, duplicate
          components, attribute copy and missing mobile representations are all outside its rule
          set — run checks 3 through 8.

Scenario: The old baseline says LoginPage bypasses the icon registry.
Wrong:    Report it as a live violation.
Correct:  Measure. The registry bypass count is 0 today; the entry in directIconImports is now
          stale and removable. Reporting a fixed violation as open is as damaging as missing a real
          one.

Scenario: Violations dropped from twelve to three.
Wrong:    PASS, "significant progress".
Correct:  Three is not zero. Report FAIL with the three locations and note the improvement — a
          backlog that is allowed to round up never reaches zero.
```

## 30. Self-review

1. Did I run every check against the current tree rather than inheriting a baseline?
2. Did I read each hit, or count grep lines?
3. Did I separate new drift from the registered backlog?
4. Did I check whether the registry grew — and whether any entry is now removable?
5. Did I look beyond the four mechanical rules?
6. Did I check attribute copy, not just text between tags?
7. Did I identify missing tokens implied by the literals I found?
8. Is every finding routed to an owner with a location?
9. Did I round any partial progress up to a pass?
