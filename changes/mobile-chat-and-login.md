---
taskId: mobile-chat-and-login
type: patch
scope: mobile chat panel and login layout
---
# Summary

Two reported mobile problems, both measured before and after rather than judged
by eye.

**The assistant sheet carried two headers.** `AiPanel`'s sheet header already
shows "Asistente de preparación" plus the minimize and close controls, and it
rendered `ChatPanel`'s full page header underneath: a second brand tile, the
same title again, the case line and the status badge. `ChatPanel` gains a
`variant` prop; `AiPanel` passes `"embedded"`, which drops the tile and the
duplicate `h1` and keeps what the sheet header does *not* say — which case,
which section, whether the model is reachable — on one line.

**The login form sat below a full marketing hero on a phone.** In the
single-column layout the hero came first: eyebrow, brand block, a 36px headline
and a body paragraph, roughly 400px, and only then the card. Signing in meant
scrolling past copy to reach the task.

DOM order is now the phone order — brand, form, hero copy — and the two-column
desktop layout is restored with explicit grid placement rather than `order`
utilities, so there is exactly one copy of each element in the markup. An
`lg:hidden` duplicate of the brand block would have been two things to keep in
sync for one breakpoint.

Transcript and composer padding drops to `px-4` below `sm`. On a 320–390px
screen the sheet is full-bleed, so every horizontal pixel spent on panel padding
comes out of the bubble, which already gives up room to an avatar and a copy
control.

# A defect this change introduced and then fixed

The first version of the login grid **clipped the form card by 47px at 320px**.
The brand row uses `truncate`, whose `white-space: nowrap` makes its min-content
the entire string; a grid item's automatic minimum size is its min-content, so
the single-column track widened to 351px in a 320px viewport and the card's
`w-full` followed it.

It was invisible to a naive overflow assertion — `<main>` is `overflow-hidden`,
so `document.documentElement.scrollWidth` never grew and only the rendered
screenshot showed the clipped eye icon and truncated text. `min-w-0` on the two
grid items clamps the minimum and the card is back to 288px with a 16px margin.

The reserved corner for the absolutely-positioned language switcher is `pe-24`,
not the `pe-28` it inherited: measured, the switcher needs 88px, and the extra
16px was truncating the product tagline at 390px for no reason.

# User-visible behavior

On a phone the login form is the first thing under the brand; the hero copy
follows it. The assistant sheet shows one header instead of two, and announces
its title once instead of twice.

Desktop is unchanged: at `lg` and above the login is the same two-column layout
in the same positions, and the `/assistant` route still renders the full header
because it owns its title.

# Migration / compatibility

`ChatPanel` gains an optional `variant` prop defaulting to `"page"`, so the
`/assistant` route and every existing test are unaffected without changes.

The embedded status badge shows "IA lista" without the model name, which the page
variant still carries. Deliberate: on a phone that badge shares one line with a
truncating case name, and the model identifier is diagnostic detail rather than
something the user acts on.

# Tests and evidence

Measured on a dev server verified to be serving this branch — a stale server on
the first port chosen was serving the *previous* `LoginPage`, which is the same
trap `changes/live-run-defects.md` records, so the served module was checked for
a marker unique to this change before any measurement was trusted.

Login, first input's distance from the top of the document:

| width | before | after | viewport |
| --- | --- | --- | --- |
| 320 | 936 — below the fold | **528** | 720 |
| 390 | 884 — below the fold | **504** | 844 |

Document height at 390 falls from 1325 to 1224. No horizontal overflow and no
card clipping at 320, 390, 768, 1024 or 1440.

Assistant sheet at 768:

| | before | after |
| --- | --- | --- |
| headings matching the title | 2 | **1** |
| chrome above the transcript | 142px | **106px** |
| transcript height | 779px | **815px** |

- Frontend 91 tests pass (88 plus three new): the embedded variant does not
  repeat the title, still names the case and the model state, and still renders
  a working composer.
- `lint`, `build`, `i18n:check` and `npm run agent:flowbite` all pass.
- Screenshots at all five governed widths plus the sheet before/after in
  `docs/testing/screenshots/mobile-*.png`.

# Risks / limitations

**The phone `/assistant` page is not fixed here, and it is the surface the
report was probably about.** Below `md` the launcher that opens the sheet is
hidden (`AiLauncher` is `hidden md:inline-flex`) and the bottom bar links to the
`/assistant` route instead, so a phone gets the page, not the sheet. Measured at
390×844: the page itself scrolls 318px while the conversation scrolls inside it,
the card is 604px of an 844px viewport, and the transcript gets 382px — 45% of
the screen for the product's primary capability.

The cause is chrome the page does not own: the shell header, the compact footer,
and the 104px bottom-navigation reserve, which together leave less room than the
card's `h-[calc(100svh-15rem)]` assumes. Shrinking the card to stop the page
scrolling would leave a 284px conversation, which is worse. The real fix is to
let the assistant route own the viewport, and that lives in `AppShell.tsx` —
modified and uncommitted in the `Glade-Demo-ui-mobile-responsive` checkout, so
editing it here would fork the file. It belongs to that task or to a follow-up
once it lands.

**The brand tagline still truncates at 320px.** 144px is not enough for "Guía de
casos de bancarrota" alongside a 48px mark and the reserved switcher corner. It
truncates cleanly and clears the switcher by 30px; at 390px it renders in full.
