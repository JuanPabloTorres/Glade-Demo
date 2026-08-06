---
name: design-system-audit
description: Grep-based audit of frontend/src for design-system violations — bypassed icon registry, competing button implementations, hardcoded copy outside i18n, and arbitrary spacing/typography values. Use before or after any UI change, or when asked "is the design system actually being followed".
---

# Design system audit

Run these checks against `frontend/src` and report every hit with file:line — do not summarize away
individual violations, list them.

## 1. Icon registry bypass
```
grep -rn "from \"react-icons" frontend/src --include="*.tsx" | grep -v "AppIcon.tsx\|iconRegistry.ts"
```
Any match outside `AppIcon.tsx`/`iconRegistry.ts` is a violation. Known baseline violations at time of
writing: `LoginPage.tsx` (`HiEye`/`HiEyeSlash`), `LanguageSelector.tsx` (`FaLanguage`). If the count
hasn't dropped from baseline, the fix hasn't landed.

## 2. Competing button implementations
```
grep -rln "components/ui/AppButton" frontend/src --include="*.tsx"
grep -rln "from \"flowbite-react\"" frontend/src --include="*.tsx" | xargs grep -l "Button"
```
Compare the two file lists — pages appearing in only one are fine; the concern is the app having BOTH
patterns live long-term. Flag if new pages introduce a *third* button pattern (raw `<button>` with
custom classes).

## 3. i18n bypass — hardcoded copy
```
grep -rnE ">[A-ZÁÉÍÓÚÑ][a-záéíóúñ ]{3,}<" frontend/src/components frontend/src/pages --include="*.tsx"
```
Cross-check each hit isn't inside a `t("...")` call or a dev-only comment. Known baseline violations:
`CaseStageStepper.tsx` ("Flujo guiado", "Paso X de Y"), `StageOrientation.tsx` ("Preguntar al
asistente").

## 4. Arbitrary spacing/typography (token bypass)
```
grep -rnE "text-\[[0-9]+px\]|p-\[[0-9]+px\]|m-\[[0-9]+px\]" frontend/src --include="*.tsx"
```
Any match means a component reached for a one-off pixel value instead of the Tailwind scale or a
design token. Once `design-system-engineer` lands token/typography files, re-run this to confirm no
new arbitrary values crept in.

## 5. Design tokens presence check
```
grep -n "^  --color-\|^  --font-\|^  --space-" frontend/src/index.css
```
Confirm a typography scale (`--font-*`) and spacing scale (`--space-*`) exist — as of the last
verified audit (`docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md`) only `--color-*` tokens exist.

## Output format
Report as a table: check → violation count → file:line list → verdict (PASS if zero new violations
vs. the documented baseline, FAIL otherwise). Do not round up partial progress to PASS.
