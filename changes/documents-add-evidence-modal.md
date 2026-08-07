---
taskId: documents-add-evidence-modal
type: minor
scope: frontend-design-system
---
# Summary
Return Documents → Add Evidence to the design system. Adds a governed modal shell
(`components/overlays/AppModal`) and a reusable form layer
(`components/forms`: `FormField`, `TextField`, `SelectField`, `TextareaField`,
`CheckboxField`, `FileField`, `FormGrid`, `FormActions`), then rebuilds
`BankruptcyEntryModal` on top of them. Every other dialog in the app —
`ConfirmDialog`, the six `CaseActionBar` action modals and the `ChatPanel`
upload notice — now composes the same shell instead of repeating Flowbite's
dialog markup.

# Root cause
The footer escaped the modal because the `<form>` wrapped `ModalBody` +
`ModalFooter` *inside* Flowbite's `content.inner` flex column. That made the
form the flex item, and it carried neither `flex-col` (so the body's `flex-1`
had no flex parent to resolve against) nor `min-h-0` (so it refused to shrink
below its content height and overflowed the panel's `max-h`, dragging the
footer out with it). A second `max-h-[72vh]` on the body double-capped a box
already capped at `90dvh`, and `vh` ignores mobile browser chrome. The footer
itself was Flowbite's `flex items-center gap-2` — one unwrapped row — so two
`w-full sm:w-auto` buttons fought over the same line.

Measured before, at 320×568: panel bottom 527px, footer bottom **591px** — 64px
below the panel and 23px below the viewport.

# User-visible behavior
- The modal fits every viewport from 320 to 1440; body scrolls, header and
  actions stay put.
- Actions stack full-width on mobile (primary on top) and right-align from
  `sm` up; previously they were left-aligned on desktop.
- Fields use the governed `.app-input` contract and a responsive 1→2 column
  grid.
- The file picker replaces the browser's unstyleable "Choose File" control with
  a drop target, a truncating file name, a `PDF · 2.4 MB` caption and
  replace/remove actions.
- Required fields report inline messages under the field instead of native
  validation bubbles; the first invalid field takes focus.
- Submit shows a loading label and is guarded against double submit; a failed
  save keeps the modal open with a retryable form-level message.
- Long evidence names truncate in the Documents list instead of widening the
  card.

# Migration / compatibility
No API, payload, contract, id, permission or validation-rule change. The
required fields are exactly those previously marked `required`; the evidence
payload is byte-for-byte the same. `onSave` may now return a promise; a `void`
return is unchanged. Selecting a file still names the document after it — the
file is now tracked separately, so editing the name no longer detaches it.
Two icons (`close`, `upload`) were added to the registry.

# Tests and evidence
- New `BankruptcyEntryModal.test.tsx` (6): inline validation, error clearing,
  unchanged payload, double-submit guard, failed-save retry, file/name coupling.
- New `e2e/documents-add-evidence.spec.ts` (13): panel and both actions inside
  the viewport at 320/375/390/430/768/1024/1280/1440, body scroll with fixed
  header and footer, inline validation, long-file-name truncation, keyboard
  trap + Escape + focus return, save and cancel.
- Full suites: vitest 43/43, lint 0 errors, i18n parity, production build,
  `agent:flowbite` pass.
- Browser audit at all 8 viewports: 0 geometry issues, no page-level horizontal
  overflow. Behaviour/a11y audit 26/26 (role, `aria-modal`, `aria-labelledby`,
  focus trap, scroll lock, Escape, focus return).

# Risks / limitations
- `aria-modal` is set by `AppModal` because Flowbite's `Modal` does not emit it;
  it is forwarded through unknown props and also lands on the overlay element,
  where it is inert.
- Flowbite twMerges theme overrides over its defaults rather than replacing
  them, so `content.base` must state `h-auto` explicitly to displace the
  default `h-full`. Noted in the component.
- The attorney summary textarea keeps its `font-mono text-xs` intent via
  `controlClassName`, but the unlayered `input, textarea, select { font: inherit }`
  rule in `index.css` outranks every Tailwind utility, so that styling has never
  taken effect. Preserved as-is; changing the global rule would restyle every
  input in the product.
- `matter-workflow.spec.ts` step 5 fails on the assistant's "Abrir sección
  recomendada" button. Pre-existing and unrelated: the provider is the
  `rule_based` fallback returning no actions, the backend AI layer has
  large in-flight changes, and `ChatComposer.test.tsx` still proves the UI
  renders those buttons when actions are present. The attorney 9-step flow and
  the mobile flow pass.
