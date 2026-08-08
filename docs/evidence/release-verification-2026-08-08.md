# Release verification hardening — evidence (2026-08-08)

Baseline: **4.12.0**. Task `release-gate-exit-codes`.

## Why

A suite reported green while its process exited 1. Vitest printed
`Tests 143 passed (143)` and returned a non-zero status, because a `TypeError`
had been thrown from a click handler into its unhandled-error channel — a
failure that fails a *run* without failing a *named test*. Reading the summary
was enough to ship it. Reading the status was not attempted.

A second run reported four language failures that were not failures: Playwright
had reused a sibling worktree's dev server on the port it picked, and the suite
spent three minutes measuring another branch.

Both are process defects, not product defects, and neither is caught by any
amount of care while reading output.

## The rule

`npm run release:verify` judges a gate by **its exit code and nothing else**.
No output is parsed, no test count is read, and the word "passed" appears
nowhere in `scripts/agent/release-verify.mjs`. Every gate runs even after one
fails, because "which gate failed" is the first question and stopping early
hides the rest.

Proof that the rule catches the exact failure that shipped:

```
$ node -e "console.log('Tests  143 passed (143)'); process.exit(1)"
printed: "Tests  143 passed (143)"
status : 1
verdict: would FAIL (correct)
```

## Result — every gate, actual exit codes

```
Release gate — FreshStart 4.12.0
  PASS  governance       exit 0
  PASS  architecture     exit 0
  PASS  flowbite         exit 0
  PASS  version          exit 0
  PASS  i18n             exit 0
  PASS  backend lint     exit 0
  PASS  backend types    exit 0
  PASS  backend tests    exit 0
  PASS  frontend lint    exit 0
  PASS  frontend tests   exit 0
  PASS  build            exit 0
  PASS  playwright       exit 0

RELEASE GATE = PASS — every gate exited 0.
harness exit=0
```

Counts behind those statuses: 385 backend, 143 frontend, 104 Playwright.

## Server isolation

Release mode (`E2E_RELEASE=1`, set by the harness):

* `reuseExistingServer` is **off** for both the API and the web server, so
  Playwright starts its own and the port is ours by construction;
* ports come from `freePort()`, which asks the OS for an unused one rather than
  guessing — eight checkouts of this repository can be live at once;
* the API gets its own SQLite file per port, which also removes the
  `database is locked` contention that made unrelated specs flake after many
  runs against one long-lived server;
* `e2e/global-setup.ts` asks `/api/v1/health` what version it is serving and
  refuses to continue on a mismatch.

Proof the refusal works, before any assertion runs:

```
$ E2E_EXPECTED_VERSION=9.9.9 npx playwright test -g "footer reports"
Error: The API on http://127.0.0.1:8493 reports version 4.12.0, but this
checkout is 9.9.9. Playwright is pointed at another checkout's server — start
this run on free ports (scripts/agent/release-verify.mjs does) rather than
reusing whatever is listening.
exit=1
```

### One check was written, fired against a correct build, and removed

The first version also fetched `/src/config/version.ts` and looked for the
substituted `__APP_VERSION__`. Vite serves that module in dev with the token
**unsubstituted**:

```
$ curl http://127.0.0.1:5488/src/config/version.ts
export const APP_VERSION = __APP_VERSION__;
```

So the check failed against this repository's own server. It was deleted rather
than softened into a warning — a guard that cries wolf is worse than no guard.
The frontend's identity is covered instead by release mode starting the server
itself, and by `ui-quality-evidence.spec.ts` asserting the footer badge equals
this checkout's `VERSION`, which reads the value where it is genuinely resolved.

## Locale

`playwright.config.ts` no longer forces `es-PR` on every run. That global made
Spanish the invisible default and left the English first-visit path untested,
which is how an English UI shipped around a Spanish case file.

Six suites that assert Spanish now declare `test.use({ locale: "es-PR" })`
themselves, so a spec's language dependency is visible in the spec.

First-visit acceptance runs in both directions, with **no stored preference**:

| Browser locale | Persisted | UI | Seeded case file |
|---|---|---|---|
| `en-US` | `en` | Home / My case | "Organize my finances…" |
| `es-PR` | `es` | Inicio / Mi caso | "Organizar mis finanzas…" |

Both resolve through the same `resolveLanguage` path — the UI in
`LanguageProvider`, the seed in `BankruptcyWorkspaceContext.activeLanguage`.

An earlier version of the helper also asserted storage was empty on arrival.
That failed against a correct app: `LanguageProvider` persists the resolved
language in its first effect, so no observable moment has empty storage. The
assertion was wrong, not the app, and it was replaced with the one that is
observable — the persisted value matches the browser.

## Unchanged, deliberately

* `.env*.local` stays ignored; no provider secret is committed.
* Main-branch governance keeps its 4.11.1 shape: `git pull --ff-only` and an
  authorized integration merge are allowed; authoring, committing and version
  bumps on `main` remain denied.
* The `>` shell-redirection guard is untouched. It is noisy, it blocked no
  required release command, and refactoring it preemptively was explicitly out
  of scope.

## How to run it

```
npm run release:verify          # every gate, isolated Playwright
npm run release:verify:quick    # everything except Playwright
```
