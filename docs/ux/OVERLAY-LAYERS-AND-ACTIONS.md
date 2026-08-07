# Overlays, layers, actions, language and the assistant

How to use the shared frontend primitives introduced by `ui-global-refactor`.
This is a usage guide, not a survey — if a pattern below covers your case, use
it rather than writing new markup.

---

## 1. The overlay layer scale

Declared once, in `frontend/src/index.css`, as Tailwind v4 `--z-index-*` theme
tokens. Never write a numeric z-index anywhere else.

| Rung | Token / utility | What sits there |
| --- | --- | --- |
| 0 | `z-base` | page content |
| 10 | `z-raised` | a control lifted above its own background (the login language switcher) |
| 30 | `z-sticky` | app header, sidebar column |
| 40 | `z-nav` | mobile bottom navigation |
| 50 | `z-launcher` | assistant launcher |
| 60 | `z-drawer` | assistant panel, side sheets |
| 70 | `z-backdrop` | modal scrim |
| 80 | `z-modal` | modal panel |
| 90 | `z-menu` | dropdown, popover, select menu, context menu |
| 100 | `z-tooltip` | tooltip |
| 120 | `z-toast` | critical notification |

Two orderings are deliberate and look wrong at a glance:

* **Menus and tooltips sit above the modal.** A dropdown inside a dialog is a
  normal case; under the intuitive ordering it renders behind the dialog it was
  opened from. A menu is only open because its trigger was interactive, and a
  trigger behind a modal is not — so "above" cannot leak an overlay over a
  surface the user is actually looking at.
* **Tooltip sits above menu,** so a tooltip on a menu item is visible.

Gaps are 10 so a new rung can land between two without renumbering.

From TypeScript, read the scale through `LAYER` in
`components/overlays/useOverlayPosition.ts` — a portal writes it as an inline
style, where a Tailwind class cannot reach.

---

## 2. Why overlays are portaled

`flowbite-react@0.12.9` renders `Tooltip` and `Dropdown` as absolutely
positioned siblings of their trigger, at `z-10`, with no portal (`strategy` is
not a prop — see `dist/components/Floating/Floating.js`). Two consequences,
both of which were live defects:

* an absolutely positioned element is clipped by **any** ancestor with
  `overflow: hidden | auto | clip` — in this app that is every table wrapper
  and every `Card`. Clipping happens before stacking is considered, so no
  z-index can fix it;
* `z-10` is below the sticky header and the bottom bar.

`AppTooltip` and `ActionGroup` therefore render into `document.body` with
`position: fixed`, positioned by `useOverlayPosition`, which flips to the
opposite side when the preferred one has no room, shifts along the cross axis
to stay on screen, tracks the anchor on scroll (including inner containers) and
resize, and caps itself to the viewport.

**Use `AppTooltip`, never `flowbite-react`'s `Tooltip`.**

```tsx
<AppTooltip content={t("navigation:sidebar.collapse")} side="right">
  <button aria-label={t("navigation:sidebar.collapse")}>…</button>
</AppTooltip>
```

A tooltip is auxiliary. An icon-only control still needs its own `aria-label` —
a tooltip is unreachable by touch, so it must never be the only place an action
is named.

---

## 3. `ActionGroup` — the standard action control

One primary action inline, everything else behind one menu trigger:

```
┌─────────────────┬────┐
│ Primary action  │  ▼ │
└─────────────────┴────┘
```

```tsx
<ActionGroup
  align="end"
  primary={{ id: "open", label: t("common:actions.open"), icon: "search", href: `/case/${item.id}` }}
  actions={[
    { id: "urgent", label: t("workspace:…"), icon: "alert", onClick: toggleUrgent },
    {
      id: "delete",
      label: t("common:actions.delete"),
      destructive: true,
      allowed: user.role === "attorney",
      confirm: { title: t("…title"), message: t("…message") },
      onClick: () => deleteCase(item.id),
    },
  ]}
/>
```

Rules the component enforces so call sites do not have to:

* **`href` renders a real `<Link>`**, so middle-click and open-in-new-tab work.
  A control that navigates is a link, not a button.
* **`destructive` requires `confirm`.** Without it the component warns in
  development; a delete must never fire straight off a menu click.
* **`allowed: false` and `hidden: true` remove the item.** Permission is decided
  by the caller — role, service, policy — and only *presented* here. Do not
  re-derive a business rule inside the component.
* **An async `onClick` shows a spinner and blocks re-entry** until it settles,
  which is the accidental-double-click guard. A synchronous handler does not
  flash one.
* **Keyboard:** Enter/Space/ArrowDown/ArrowUp open; arrows and Home/End move;
  Escape closes and returns focus to the trigger; Tab closes rather than
  trapping. `role="menu"` / `role="menuitem"`, `aria-haspopup`,
  `aria-expanded`.
* **Every segment is at least 44px tall,** and labels wrap (`break-words`)
  rather than shrink — English labels run longer than their Spanish
  equivalents.

Omit `primary` to get an icon-only menu button, which is the right shape in a
dense table. If every action is hidden or disallowed, the component renders
nothing.

Do not build a second action control. `RowActionsMenu` and the case bar's flat
nine-button row were both replaced by this.

---

## 4. `LanguageSwitcher`

One component, two tones — never a second implementation.

```tsx
<LanguageSwitcher compact />                  // header, cards: light surfaces
<LanguageSwitcher compact tone="onDark" />    // login hero: photographic background
```

`tone` changes only the colour tokens. Type scale, icon, radius, spacing, focus
ring and behaviour are shared. The `onDark` tone exists because the control
rendered `text-heading` (#0f172a) with a transparent background on the login
hero — near-black on near-black, legible in the header only because the header
happens to be white.

---

## 5. i18n rules that are now enforced

* `fallbackLng` is **off**. A key missing from `en` no longer silently renders
  its Spanish string; that fallback is what let mixed-language screens survive
  unnoticed. In development a missing key logs an error.
* `npm run i18n:check` fails on missing keys, empty values, placeholder
  mismatches, **and values that are identical in both locales** when they look
  like prose. Genuinely shared strings (the product name, language endonyms)
  are listed explicitly in `IDENTICAL_BY_DESIGN`.
* The validator descends into **arrays**. It previously stopped at them, which
  made the help page — the largest block of prose in the product — invisible to
  every check.
* Text composed in code must go through `t()` with interpolation, not template
  literals. The attorney's generated summary was ~17 hardcoded Spanish
  template literals and stayed Spanish in an English session.
* An explicit language choice on the device outranks the signed-in profile's
  language. The reverse order silently reverted the user's choice on reload.

---

## 6. The app shell

`html` and `body` use `overflow-x: clip`, **never `hidden`**. `hidden` computes
`overflow-y` to `auto`, which makes the element a scroll container; every
`position: sticky` descendant then binds to a scrollport that never scrolls and
stops sticking. That single declaration was why the sidebar and the header
scrolled away on a long page — the sidebar appearing to "end halfway down".
`clip` suppresses horizontal scroll without creating a scroll container.

Clip is a safety net, not the layout strategy. Horizontal overflow is prevented
by `min-w-0` on the shell's flex column and on flex/grid children;
`frontend/e2e/responsive-overflow.spec.ts` measures the widest laid-out edge at
nine widths from 320px and names the offending nodes.

The sidebar is `sticky top-0 h-dvh` (`dvh`, not `vh`, so a phone browser's
toolbars cannot push its foot off screen) and scrolls internally when its own
content is taller than the viewport.

---

## 7. The assistant

Mounted once by `AppShell`, so it is the same instance on every authenticated
route and navigation cannot restart the conversation.

* **`AiLauncher`** — `md` and up only. Below that the bottom navigation already
  carries the assistant as its raised centre action; a floating button as well
  would be two entry points to one destination on the smallest screen, and it
  sat on top of the page's own cards.
* **`AiPanel`** — a right-hand side panel from `md` up (no scrim: the page
  stays visible and usable), a bottom sheet below it.
* **State** is `closed | open | minimized` in `ChatPanelContext`. Minimized
  keeps the panel mounted and hides it, which preserves the composer draft and
  the last answer's cards; the transcript is case state and survives regardless.
  Escape minimizes rather than closes — the less destructive of the two.
* **Context** comes from `routeContext` in `ChatPanelContext`, derived from the
  URL. No page pushes context up, so no page has to know the assistant exists.
  It is currently *displayed* (the panel names the case and section it is
  scoped to) but not sent to the model: the `bankruptcy.guide` request shape is
  owned by `contracts/api-contracts.json` and the backend schema, and widening
  it is a coordinated contract change.

The `/assistant` route still exists and still works. The panel is a second way
in, not a replacement, and neither holds a private copy of the conversation.
