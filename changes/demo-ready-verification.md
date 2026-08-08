---
taskId: demo-ready-verification
type: patch
scope: release verification
---
# Summary

Closes the blocker `changes/demo-close-integration.md` opened, verifies the
integrated tree end to end, and corrects the 4.9.0 release notes, which still
described the attorney 404 as an open limitation after it was fixed.

# Verification performed

Automated, on the integrated tree:

| Check | Result |
| --- | --- |
| `uv lock --check` · `ruff` · `mypy` | pass, 69 files |
| `pytest` | **283 passed** |
| `i18n:check` | pass, 14 module files |
| `eslint` | 0 errors, 6 warnings |
| `vitest --run` | **121 passed**, 18 files |
| `tsc -b && vite build` | pass |
| `agent:flowbite` · architecture check | pass |

Browser, fresh seeded database:

- **Client** — all 10 case sections render, preparation score from the server
  analysis, assistant answers the filing question as an eligibility question,
  console clean.
- **Attorney** — all 11 sections including `attorney-review`, preparation score
  renders, console clean. Opening the assistant from inside the case gives a
  working composer and an 899-character answer scoped to
  "Miguel Santos · sección overview".
- **Responsive** — no horizontal overflow at 320, 390, 768, 1024, 1440.
- **English** — 1 Spanish marker in the case workspace.

# Two findings that were my harness, not the product

Both are recorded because a false defect costs as much as a missed one.

**"Attorney has no composer."** The journey script navigated to `/assistant`,
which leaves the case behind — the assistant is deliberately case-bound, so it
correctly showed "open a case first". Then a retry clicked
`button[aria-label*="asistente"]).first()`, which matches **"Actualizar estado
del asistente"** — the AI-health refresh — before it matches "Abrir asistente".
Clicking the right control shows the attorney's assistant works.

**A CORS failure on `analyze`** in an earlier run did not reproduce; the
preflight returns correct headers and `analyze` returns 200 against a live
token. It was a startup race in the harness.

# A governance guard that fired on a stale record

`npm run agent:fleet --strict` reported a `file-collision` on
`RELEASE_NOTES.md` between this task and `skills-standard`. Inspected before
proceeding: the `Glade-Demo-skills-standard` checkout has a clean working tree
and no diff on that file, so the entry is a stale edit-ledger record rather than
a real fork. Recorded rather than silently overridden — the guard is right to be
loud, and the next person should know why it was passed.

# Risks / limitations

Several §34 checklist items were **not** exercised in this pass and are the
reason the verdict is READY WITH KNOWN LIMITATIONS rather than READY:

- **The committed Playwright E2E suite was never run.** Journeys were driven
  directly, covering the same routes, but that is not the same artifact.
- **Document intelligence was not exercised end to end.** No upload → extract →
  classify → chunk → index → retrieve run against the live app; only the unit
  and integration tests cover it.
- **AI failure modes were not exercised in the browser** — provider unavailable,
  timeout, malformed response, empty retrieval. The deterministic fallback is
  covered by `tests/evals`, but the UI's degraded and retry states were not
  driven.
- **No modal audit** across viewports, and no accessibility pass beyond what the
  component tests assert.
- **Security probes** beyond the existing suite — spoofing, role escalation,
  hand-edited case ids — were not driven through the browser.
