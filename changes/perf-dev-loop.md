---
taskId: perf-dev-loop
type: patch
scope: test and lint and CI tooling
---
# Summary

The development feedback loop was slow for reasons that had nothing to do with
the amount of code being checked, and CI was red on `main` for a reason nobody
had attributed. Both are fixed here by measurement rather than by guesswork.

**`backend/uv.lock` was out of sync with `pyproject.toml`.** `psycopg[binary]`
is declared as a dependency but was absent from the lockfile, so
`uv lock --check` — the first step of the `backend` job (`.github/workflows/ci.yml`)
— failed. Every pull request was inheriting a red backend job regardless of its
contents. The lockfile is regenerated.

**Vitest spent 52 of its 56 seconds on scaffolding.** The suite's 88 tests do
4.3s of actual work; the rest was a fresh jsdom per test file (~237s of
cumulative environment construction across workers) plus ~126s of setup, plus a
10s hang at the end reported as `close timed out after 10000ms / something
prevents Vite server from exiting`.

Two causes, both addressed in `frontend/vite.config.ts`:

- *The Tailwind and Flowbite plugins were loaded under Vitest.* They exist to
  produce CSS and the `.flowbite-react/class-list.json` codegen for a build; a
  unit test asserts on the DOM and reads neither. Loading them regenerated the
  class list on every test run and left a file watcher open — the hang. The
  config is now a function of `mode`, and under `mode === "test"` only the React
  plugin is loaded.
- *Each test file constructed its own jsdom.* `isolate: false` with the threads
  pool reuses one environment per worker instead of one per file.

**ESLint re-scanned everything on every invocation.** `--cache` is enabled and
the cache file is git-ignored.

**Removing the isolation exposed a real defect, which is fixed here rather than
worked around.** `ChatBubble.tsx` scheduled `setTimeout(() => setCopied(false),
1500)` to revert its "copied" confirmation and never cancelled it. Per-file
isolation had been hiding it: the environment outlived the timer. Without it the
callback fires against a torn-down environment, Vitest reports
`ReferenceError: window is not defined` as an unhandled error and **exits
non-zero** — so this would have broken CI, not merely printed a warning. The
timer now lives in a ref, is cleared on unmount, and is cancelled before being
re-scheduled so repeated clicks cannot stack timers. The same callback was
already setting state on an unmounted component in the browser; the test
environment simply made it audible.

**CI ran five jobs as a serial chain** — `versioning → governance →
{backend, frontend} → e2e` — even though no job consumes another's artifacts:
`e2e` installs its own dependencies and starts its own servers. The critical
path was therefore the sum of the slowest job in each link. The `needs:` edges
are removed, so the critical path is the slowest single job. Playwright's
browser download is now cached, keyed on `frontend/package-lock.json`.

# User-visible behavior

None. No application code was changed, and the production build output is
byte-equivalent: the same 1,117 CSS classes plus one, and no class lost —
verified by diffing the emitted class sets from a build on each configuration.

# Migration / compatibility

`frontend/vite.config.ts` exports a config *function* rather than an object.
Any tooling that imported the default export expecting a plain object must call
it with `{ mode, command }`. Nothing in this repository does.

`isolate: false` is safe here only because the suite already cleans up after
itself: `src/test/setup.ts` runs `cleanup()` in a global `afterEach`, and the two
storage-dependent suites (`auth/session`, `api/http`) clear their own storage in
`beforeEach`. A future test that leaks global state across files will surface as
a failure that only reproduces in a full run; the fix is to quarantine that file,
not to re-enable isolation for all 15.

`--cache` makes ESLint trust mtime and config hash. A rule change inside an
imported plugin without a version bump could go unnoticed locally; CI runs on a
fresh checkout with an empty cache, so the gate is unaffected.

# Tests and evidence

Measured on this machine, same tree, before and after:

| Command | Before | After |
| --- | --- | --- |
| `npm --prefix frontend test -- --run` | 56.3s wall / 4.3s tests | **7.6s** wall |
| `npm --prefix frontend run lint` | 33.3s | **6.4s** cold, **2.9s** warm |
| `cd backend && uv lock --check` | **exit 1** | exit 0 |
| `npm --prefix frontend run build` | 20.7s | 20.7s (unchanged) |

- Frontend 89 tests pass across 15 files: the existing 88 with unchanged
  assertions, plus one new regression test in `ChatBubble.test.tsx` asserting
  that unmounting mid-confirmation leaves no pending timer. That test was
  confirmed to fail against the un-fixed component and pass against the fixed
  one, so it locks the behaviour rather than merely describing it.
- `npm run agent:validate` passes (fleet, architecture, Flowbite checks).
- Production build emits 97,128 bytes of CSS against 97,100 before; the class-set
  diff shows zero classes removed.
- CI critical path, by job timeout budget: was `5 + 5 + 10 + 15`, now `max(5, 5, 10, 10, 15)`.

# Risks / limitations

**Removing the `needs:` edges trades compute for latency.** A governance or
versioning failure no longer cancels the test jobs before they start, so a bad
push burns a few extra runner-minutes. `cancel-in-progress` on the existing
concurrency group bounds this per branch. If runner minutes become the binding
constraint rather than latency, restore `needs: [governance]` on `e2e` alone —
it is the most expensive job and the least likely to be the one that catches a
defect first.

**Playwright parallelism was deliberately left alone.** `frontend/playwright.config.ts`
still has `fullyParallel: false` and a single worker, which is the other large
serial cost in the loop. That file is modified and uncommitted in the
`Glade-Demo-ui-mobile-responsive` checkout; editing it here would fork it, and
the cross-checkout guard denies it. It belongs to that task or to a follow-up
once it lands.

**The 10 ESLint warnings are untouched** and remain warnings, including the
`react-hooks/exhaustive-deps` violation in `BankruptcyWorkspaceContext.tsx`.
They are real defects, not noise, and belong to the frontend architecture work
rather than to a tooling change.
