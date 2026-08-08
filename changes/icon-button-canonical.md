---
taskId: icon-button-canonical
type: refactor
scope: canonical icon-only button plus the two demonstrated violations
---
# Summary

The two component violations the audit demonstrated, and nothing else.

The login "remember me" checkbox was a raw `<input type="checkbox">` with a hand-written
`<label>` beside it, in a codebase that already had `CheckboxField`. Five standalone
icon-only `<button>` elements agreed on what they were and disagreed on everything else:
three hover treatments, two focus rings, two spellings of a square, and an accessible
name that was right at all five only because five authors each remembered it.

# What changed

**`components/ui/IconButton.tsx`** — new. Square frame with a real hit area, centred
glyph, visible focus ring, `type="button"` by default, and a **required** `label`. The
type makes forgetting the accessible name impossible rather than reviewable.

`className` still passes through and is appended, not substituted, so a call site can say
where a button sits without also deciding what a button is. `ChatBubble` needs exactly
that: `self-center` against a bubble whose height it does not set, plus its own
background to stay visible on top of one.

**Migrated (5):** login password reveal, assistant sheet minimize and close, chat copy,
sidebar collapse. **The login checkbox** now uses `CheckboxField`.

# What was deliberately left alone

Classified, not skipped:

- **`ActionGroup`'s menu trigger** is a segment of a compound control — joined to the
  primary button, carrying `aria-haspopup`/`aria-expanded`/`aria-controls` and a
  forwarded ref for overlay positioning. It is a design-system primitive in its own
  right; routing it through `IconButton` would mean overriding the frame it deliberately
  sets and threading a ref through for no gain.
- **`FileField`'s two buttons** share a local `ICON_BUTTON` constant whose sizing is a
  documented choice: padding rather than a fixed square, so the controls do not compete
  with the file name for width. Absorbing them needs a third size variant, which is the
  additional design-system refactor this task is scoped out of. Recorded in
  `docs/POST-DEMO-BACKLOG.md`.

# Tests and evidence

`IconButton.test.tsx`, five tests aimed at how this control fails rather than at its
markup: reachable by label; **does not submit the form it sits in** (a bare `<button>`
defaults to `type="submit"`, and the password toggle sits inside the login form — the
difference between revealing a password and attempting a login); touch-sized by default;
a call-site `className` adds without dropping the focus ring; `disabled` suppresses the
click.

Frontend 127 → **132 passed** across 19 files. Lint 0 errors, build clean, i18n clean,
`agent:flowbite` passed.

Also fixed: four `TS2532` errors in `ChatPanel.test.tsx` from the previous commit's scope
tests — `mock.calls[0][3]` under `noUncheckedIndexedAccess`. Vitest does not typecheck
and `tsc -b` does, so a green suite had been hiding a broken build. Now `?.[3]`.

# Risks / limitations

**Two visual deltas, both deliberate.** The sidebar collapse toggle hovered to
`text-fg-brand` and now hovers to `text-heading` like the other four; the chat copy
control lost a transparent border that occupied no space. Neither changes layout,
position or size. The alternative was carrying two hover treatments into the shared
component, which would have preserved the divergence this task exists to remove.

**The login row changed shape.** `CheckboxField` is full-width by design, so the flex row
holding it and the forgot-password note needs `min-w-0` — without it the label inflates
the item's automatic minimum size and pushes the note off a 320px screen. This is the
same failure mode as the earlier `truncate` clip on this page. The 320px login geometry
gate in `e2e/governed-viewports.spec.ts` covers it and runs in the release regression.
