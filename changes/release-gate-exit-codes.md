---
taskId: release-gate-exit-codes
type: minor
scope: release verification harness, playwright isolation, locale acceptance
---
# Summary

Two release gates reported green while being wrong, and neither is catchable by
reading output more carefully.

1. **A suite passed its summary and failed its process.** Vitest printed
   `Tests 143 passed (143)` and exited 1, because a `TypeError` reached its
   unhandled-error channel from a click handler — a failure that fails a *run*
   without failing a *named test*.
2. **A run measured another branch.** `reuseExistingServer` accepted a sibling
   worktree's dev server on the port Playwright picked, and three minutes of
   assertions described a different tree. The wasted run was the cheap part; a
   *green* run against the wrong tree is the expensive one, and nothing in the
   output would have said so.

`npm run release:verify` now judges every gate by its exit code and nothing
else, and release regression runs on servers it started itself.

# User-visible behavior

None — this is release machinery. What changes is what a release claim means.

**`npm run release:verify`** runs twelve gates, continues past a failure so the
summary names every one, and prints real exit codes:

```
Release gate — FreshStart 4.13.0
  PASS  governance       exit 0
  ...
  PASS  playwright       exit 0
RELEASE GATE = PASS — every gate exited 0.
```

`scripts/agent/release-verify.mjs` parses no output. It does not count tests and
the word "passed" does not appear in it: if a tool can print a perfect summary
and fail, only the status distinguishes them.

**Server isolation.** In release mode `reuseExistingServer` is off for both
servers, ports come from `freePort()` (asked of the OS, not guessed — eight
checkouts can be live here), the API gets its own SQLite file per port, and
`e2e/global-setup.ts` refuses to continue unless `/api/v1/health` reports this
checkout's `VERSION`.

**Locale is explicit.** `playwright.config.ts` no longer forces `es-PR` on every
run — that global made Spanish the invisible default and left the English
first-visit path untested, which is how an English UI shipped around a Spanish
case file. Six suites that assert Spanish declare `test.use({ locale: "es-PR" })`
themselves. First-visit acceptance now runs in both directions with no stored
preference, and both assert that the UI *and* the seeded case file resolve
through the same `resolveLanguage` path.

# Migration / compatibility

- `npm run release:verify` and `release:verify:quick` are new. `agent:verify` is
  unchanged and still the per-change gate; its docstring points at the new one.
- Specs that relied on the config's global `es-PR` now declare it. A new spec
  that asserts Spanish must do the same — it will otherwise run under
  Playwright's default locale, which is the honest "some browser" case.
- `E2E_RELEASE=1` is the only new environment flag; without it local runs behave
  exactly as before.

# Tests and evidence

Every gate, actual exit codes, on this tree:

| Gate | Result |
| --- | --- |
| governance / architecture / flowbite | exit 0 |
| version / i18n | exit 0 |
| backend lint / types / tests | exit 0 (385 passed) |
| frontend lint / tests | exit 0 (143 passed) |
| build | exit 0 |
| playwright | exit 0 (104 passed) |

`harness exit=0`, `RELEASE GATE = PASS`.

**The rule was tested against the failure it exists for**, not assumed:

```
$ node -e "console.log('Tests  143 passed (143)'); process.exit(1)"
printed: "Tests  143 passed (143)"   status: 1   verdict: would FAIL (correct)
```

**The isolation guard was tested by making it fire**:

```
$ E2E_EXPECTED_VERSION=9.9.9 npx playwright test -g "footer reports"
Error: The API on http://127.0.0.1:8493 reports version 4.12.0, but this
checkout is 9.9.9. ...
exit=1
```

Full write-up: `docs/evidence/release-verification-2026-08-08.md`.

# Risks / limitations

- **A check I wrote fired against a correct build and was deleted.** The first
  version also fetched `/src/config/version.ts` looking for the substituted
  `__APP_VERSION__`; Vite serves that module in dev with the token
  *unsubstituted*, so it failed on this repository's own server. Removed rather
  than softened to a warning — a guard that cries wolf is worse than no guard.
  The frontend's identity is covered by release mode starting the server itself
  and by the footer-badge assertion, which reads the value where it is resolved.
- **An assertion I wrote was wrong, not the app.** The first-visit helper
  checked that `localStorage` was empty on arrival; `LanguageProvider` persists
  the resolved language in its first effect, so no observable moment has empty
  storage. Replaced with the observable property: the persisted value matches
  the browser's locale.
- The harness runs gates sequentially and takes roughly six minutes here, most
  of it Playwright. `release:verify:quick` skips it for the inner loop.
- The `>` shell-redirection guard in `validate-command.mjs` is untouched, per
  instruction. It is still noisy on `2>/dev/null` while standing on `main`; it
  blocked no required release command.
- Gate ordering is cheapest-to-act-on, not fastest: governance first because a
  fleet conflict invalidates everything measured after it.
