# UI quality and language pass — evidence (2026-08-08)

Task: `ui-quality-i18n-components`. Branch: `feat/ui-quality-i18n-components`.

Reported from a live demo session: mixed languages on screen, two ways into the
assistant, and screens spending their space on the wrong things.

## How this was verified

`frontend/e2e/ui-quality-evidence.spec.ts` captures every screenshot below and
asserts what it is supposed to show. It is a gate, not a gallery — a screenshot
nobody reads proves nothing.

```
cd frontend
E2E_WEB_PORT=5477 E2E_API_PORT=8477 npx playwright test e2e/ui-quality-evidence.spec.ts
```

Screenshots land in `frontend/test-results/ui-quality-evidence/`:
`{mobile,desktop}-{es,en}-{client-home,case-overview,documents,activity}.png`,
`mobile-es-assistant.png`, `desktop-en-attorney-home.png`.

**Use dedicated ports.** `playwright.config.ts` sets `reuseExistingServer` for
local runs, and this repository has eight live checkouts. The first run of this
spec reported four language failures that turned out to be a sibling worktree's
dev server on the port Playwright picked — the suite was testing another
branch's code. Confirm with:

```
Get-NetTCPConnection -LocalPort <port> -State Listen |
  ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" }
```

## What the language check asserts

The whole body, not just the chrome. For an English session, no occurrence of
`Solicitud`, `Talones`, `Identificación`, `Estados bancarios`, `Documentos de
respaldo`, `Próximos pasos`, `Expediente`, `Asistente`; for Spanish, the mirror
list. These are words that can only be on screen if a string leaked.

`shell-overlays-language.spec.ts` keeps its narrower chrome-only check, which is
what makes a failure there point at a specific control.

## Findings, and what caused each

| Reported | Cause | Fix |
|---|---|---|
| Evidence checklist in Spanish under an English UI | `required_evidence` was excluded from the copy catalogue on purpose: satisfaction was decided by intersecting the requirement's Spanish words with the evidence type's Spanish label | Match on canonical slugs (`EVIDENCE_REQUIREMENT_TYPES`); translate the labels |
| Case history in Spanish under "Case process" | Entries persisted as prose at creation time, before locale keys existed | Migrate on read, recovering the key from the entry's `stage` |
| Assistant greets in the wrong language | The greeting was written into the transcript at case creation | `contentKey` on that one message; everything anyone actually said stays verbatim |
| Demo case file in Spanish | Seed built in a `useState` initializer, before `LanguageContext` applied the stored preference | `i18n.getFixedT(activeLanguage())` — independent of which effect ran first |
| "IA" beside every answer | Literal `"Tú"` / `"IA"` avatar initials | Translated |
| "Example: Example: …" | Both `exampleLabel` and the example string carried the label | Removed from the strings |

The word matching was also wrong within Spanish: `"Estados bancarios recientes"`
never matched `"Estado bancario"` (plural against singular), while `"Contrato de
arrendamiento o estado hipotecario"` matched it on the stray word `"estado"`. A
bank statement therefore satisfied the housing requirement and left the banking
one unticked. Asserted in `backend/tests/test_analysis_localization.py`.

## Assistant entry points

Before: a sidebar entry and a raised bottom-bar slot, both navigating to
`/assistant`, plus a floating launcher opening a panel over the current page —
three controls, two surfaces, different behaviour, and the launcher hidden on
phones because it landed on top of page content.

After: the launcher, on every breakpoint, offset above the bottom bar. The panel
takes the whole viewport below `md`. `/assistant` redirects into the panel and
carries its `?prompt=` through. A navigating suggestion minimizes the panel
rather than covering the section it just opened.

Asserted in `ui-quality-evidence.spec.ts` (launcher clears the bar; the panel is
≥389px wide and ≥700px tall at 390×844; the launcher hides itself while open),
`assistant-page.spec.ts` and `shell-overlays-language.spec.ts`.

## Responsive

No horizontal overflow on any captured screen at 390 or 1440, read off
`document.documentElement` rather than `body` — `overflow-x: clip` on the root
hides the scrollbar without removing the overflow. The existing
`responsive-overflow.spec.ts` continues to cover 320/375/390/412/430/768/1024/1440.

## Totals

| Gate | Result |
|---|---|
| `backend` pytest | 360 passed |
| `frontend` vitest | 143 passed |
| Playwright | 101 passed |
| `i18n:check` | 14 module files, keys/placeholders/values |
| `lint` | 0 errors (6 pre-existing warnings) |
| `build` | clean |
| `agent:flowbite` | passed |

## Known limitations

- `evidence_score` can move for an existing case: requirements that were
  unsatisfiable under the word matching now map to real slugs, and the housing
  requirement no longer accepts a bank statement.
- Switching language after the demo is seeded re-labels the timeline and the
  greeting but not the synthetic rows, which are ordinary case data by then.
  `resetDemo` regenerates them.
- `CaseStageStepper` still scrolls horizontally inside its own container on a
  phone. Outside this change's ownership.
