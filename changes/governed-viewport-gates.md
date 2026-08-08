---
taskId: governed-viewport-gates
type: test
scope: e2e viewport gates
---
# Summary

Automates the two gates the E2E suite did not have — the sidebar's collapse
toggle and the login form's geometry — and fixes the real defect the second one
found: **at 320×720 the sign-in button sat 84px below the fold**, so a phone user
had to scroll past the form to submit it.

E2E 80 → **95 passed**.

# R1 was already done, and my audit was wrong about it

`COMPLETION-GAP-AUDIT.md` listed "add 320 and 390 to the responsive sweep" as
work. It is not: `responsive-overflow.spec.ts` already declares
`WIDTHS = [320, 360, 375, 390, 412, 430, 768, 1024, 1440]` and
`playwright test --list` confirms all nine are gated. The audit's claim came
from a truncated log — the background run captured only its last 20 lines, which
happened to start at 412px.

Corrected rather than quietly dropped. Three separate items in that audit turned
out to be already built, which is worth more than the items that were not: an
audit that reports finished work as missing sends the next session to rebuild
it.

Similarly already covered, and therefore not repeated in the new spec: rendered
i18n residue in both directions, overlay stacking and portaling, modal viewport
containment at seven widths, keyboard operability and focus return, the full
client and attorney journeys, the mobile shell contract, and the assistant
surface at 320/390/768/1440.

# The defect

The gate asserts every control needed to sign in has its bounding box inside the
first screen. At 320×720 the submit button ended at y=804.

An earlier manual check in this session had measured the *first field* at y=528,
concluded "reachable", and moved on. The submit button was never checked. That is
exactly why it needed to be a gate rather than an inspection.

The fix follows the acceptance contract's instruction to prioritize rather than
compress: the two role-button hints are `hidden sm:block` (each wrapped to two
lines at 320px and the buttons say the same thing), the form's rhythm is
`space-y-4 sm:space-y-6`, and the field stack is `space-y-5 sm:space-y-7`. The
fields keep their size; secondary copy yields.

# Two harness bugs, fixed, not worked around

**The collapse tests raced a CSS transition.** Measuring immediately after the
click returned 241px for a rail that settles at 80px. `settledWidth` polls until
the width stops moving instead of sleeping a guessed interval.

**The language selector was ambiguous** — three controls carry "EN". It now uses
the same locator `shell-overlays-language.spec.ts` uses: the switcher names its
destination, not its state.

# User-visible behavior

On a phone the login form fits: the role buttons, both fields and the sign-in
button are all reachable without scrolling. Their hints reappear from `sm` up.
Desktop and tablet are unchanged.

# Tests and evidence

- **E2E 80 → 95 passed**, full suite, 2.1 minutes.
- Frontend 121 unit tests pass; `lint` 0 errors, `build`, `i18n:check` clean.
- The collapse gate asserts four things the suite could not: the rail narrows and
  restores, the main content takes the width back (a toggle that narrows the rail
  without widening the content has no effect), every navigation entry keeps an
  accessible name while collapsed, and the choice survives a reload.
- The login gate runs at all five governed widths in both languages, asserting
  bounding-box geometry rather than pixel values so a layout change that keeps
  the form usable does not fail it.

# Risks / limitations

**Hiding the hints below `sm` is a content decision, not a layout trick.** A
phone user no longer sees "Verás tu expediente, progreso y el chat de guía
inteligente" under the client button. The button already says what it does, and
the alternative was a form that cannot be submitted without scrolling.

**`settledWidth` polls for up to 1.5s.** If the sidebar transition is ever made
longer than that, the gate reports the mid-transition width instead of failing
clearly.

**Backend-served case content is still Spanish in an English session.**
`shell-overlays-language.spec.ts` documents this deliberately and scopes its
assertions to application chrome. It is a real finding that belongs to the
backend seed and contract, and it is not addressed here.
