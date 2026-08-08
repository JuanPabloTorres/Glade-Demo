---
taskId: delivery-guardrails
type: patch
scope: command hook, gitignore, demo seed language
---
# Summary

Three defects surfaced by delivering 4.11.0, all of them process rather than
product — and one of them a real bug the 4.11.0 suite was blind to.

1. `validate-command.mjs` denied *integration* on `main` as if it were
   *authoring*, so after a pull request merged, the checkout could not
   fast-forward its own `main`.
2. `.gitignore` listed `.env`, which matches a file called exactly that.
   `.env.production.local` was untracked, **not ignored**, and one
   non-selective `git add` away from the repository.
3. The demo seed read the session language with its own rule, which fell back
   to Spanish, while the app falls back to `VITE_DEFAULT_LANGUAGE` and consults
   the browser first. A deployment defaulting to English rendered an English UI
   around a Spanish case file. Observed in production at 4.11.0.
4. `npm run test -- --run` exited **1** on the 4.11.0 tree while printing "143
   passed". `ChatPanel` began calling `minimizePanel`, and every one of the six
   `useChatPanel` mocks was an object literal without it, so the click threw
   into Vitest's unhandled-error channel — which fails the run without failing
   a named test. It was reported as passing because the unit suite was last run
   before that call was added and never re-run after it.

# User-visible behavior

Only (3) is user-visible: a first-time visitor to the deployed demo, with
nothing stored and an English browser, saw *"Hi, Elena. Here is your case
progress."* over *"Organizar mis finanzas y saber qué debo discutir con un
abogado de quiebras."* `activeLanguage()` calls `resolveLanguage` now — the same
rule `LanguageProvider` uses — so the seed agrees with the first render that
produces it.

The profile is deliberately not consulted there: the workspace mounts before the
session resolves, and `LanguageProvider` persists its choice on first render, so
persisted → browser → default is exactly what the UI will have picked.

# Migration / compatibility

None. The hook change only widens what is permitted on `main`; the `.gitignore`
line only affects untracked files; `activeLanguage` returns the same value
whenever a preference is stored, which is every session after the first render.

# Tests and evidence

**The hook**, exercised on `main` with a task registered — nine cases, each run
through the real hook with the real branch:

| Command | Result |
| --- | --- |
| `git pull --ff-only` | allowed |
| `git merge --ff-only origin/main` | allowed |
| `git merge --no-ff fix/delivery-guardrails` | allowed |
| `git push origin main` | allowed |
| `git pull` (bare) | denied |
| `git merge --no-ff feat/somebody-else` | denied |
| `git commit` | denied |
| `npm run version:minor` | denied |
| `git rebase` | denied |

Then used for real: `git pull --ff-only` on `main` fast-forwarded `46f641e ..
dff9efc`, which is the operation that was impossible before.

**The gitignore**: `git check-ignore -v .env.production.local` now resolves to
`.gitignore:30:.env*.local`, and the file no longer appears in `git status`.

**The seed language**: `e2e/ui-quality-evidence.spec.ts` gains
`the demo seed follows the UI, not its own default`, which runs under
`locale: "en-US"` with nothing persisted — the combination the rest of the file
misses, because the Playwright config pins `es-PR` and that is why a green suite
shipped the defect. **Verified as a gate**: reverting `activeLanguage` to its
previous form fails the test; restoring it passes. 8 passed in the file.

A second new case asserts the footer badge equals the repository's `VERSION`,
so "the build is a release behind" fails a suite instead of being spotted on a
screen.

**The unit suite** now exits 0. Every `useChatPanel` mock goes through one
factory, so the next field added to that context is added once rather than six
times, and the navigating-suggestion test asserts `minimizePanel` was called —
the behaviour that had none when it was introduced.

Full run on this tree: 360 backend, 143 frontend (**exit 0**), 103 e2e, plus
`i18n:check`, `lint`, `build` and `agent:flowbite`.

**Production, measured rather than assumed** (`glade-demo-sandy.vercel.app`):
the footer renders `v4.11.0`, `/api/v1/health` reports `4.11.0`, and the HTML is
served `Cache-Control: public, max-age=0, must-revalidate`. The `4.10.1` that
was reported was a tab holding a page from before the deployment; there is
nothing to fix server-side.

# Risks / limitations

- The hook now permits `git push` on `main` whenever a task is registered. It
  cannot verify that what is being pushed arrived by fast-forward or governed
  merge — only that force pushes are refused (unchanged) and that nothing was
  authored on `main` (unchanged). A PR remains the stronger path and is what the
  rule now recommends when there is review.
- `git merge --no-ff <branch>` is matched by substring against the manifest's
  `workingBranch`. A branch whose name contains another branch's name would
  satisfy it. Tightening that needs the hook to parse git's argument grammar,
  which is more machinery than this guard is worth.
- The seed still cannot see the signed-in profile's language. In the one case
  where profile and browser disagree *and* nothing is persisted, the case file
  follows the browser, as the first render does.
