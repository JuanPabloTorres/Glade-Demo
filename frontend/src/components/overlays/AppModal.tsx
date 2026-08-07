import { Modal, ModalHeader } from "flowbite-react";
import type { FormEvent, ReactNode, Ref } from "react";
import { FormActions } from "../forms/FormActions";

export type AppModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

/**
 * Theme overrides that turn Flowbite's modal into a real header / body /
 * footer column.
 *
 * Flowbite already ships the right *intent* — `content.inner` is
 * `flex max-h-[90dvh] flex-col` and `body` is `flex-1 overflow-auto` — but two
 * defaults break it for a form modal:
 *
 * 1. `content.base` is `h-full` below `md`, so the panel is stretched to the
 *    full height of the `h-screen` overlay instead of hugging its content, and
 *    `h-screen` is `100vh`, which on mobile browsers is *taller* than the
 *    visible viewport once the URL bar is showing. Both are replaced here with
 *    a content-hugging box and `dvh`, the unit that tracks the dynamic
 *    viewport (and therefore the on-screen keyboard).
 * 2. `footer` is `flex items-center gap-2` — a plain horizontal row with no
 *    wrapping and no `justify-end`, which is why two `w-full sm:w-auto`
 *    buttons fought over the same line on narrow screens. AppModalFooter
 *    below owns that layout instead, via the shared FormActions primitive.
 *
 * `header.title` is set here too, so callers stop reaching for
 * `[&>h3]:text-lg`-style arbitrary variants to restyle the title.
 */
const CONTENT_INNER_BASE =
  "relative flex max-h-[calc(100dvh-3rem)] min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-neutral-primary shadow-xl";

/**
 * `fillHeight` height contract, for dialogs whose content grows during use.
 *
 * A content-hugging panel is right for a form, whose height is known before it
 * opens. It is wrong for a transcript: the panel would be short when the
 * conversation is empty and grow with every turn, so the composer the user is
 * typing into keeps moving down the screen. These dialogs claim a stable
 * working height instead and let the body scroll inside it.
 *
 * Below `sm` that height is the whole dynamic viewport minus the modal's own
 * margin — a phone has no room to spend on a peek of the page behind. From
 * `sm` up it is `min(42rem, …)`, so the dialog stops growing on a tall desktop
 * display rather than becoming a full-height column of mostly empty space.
 */
const CONTENT_INNER_FILL = `${CONTENT_INNER_BASE} h-[calc(100dvh-3rem)] sm:h-[min(42rem,calc(100dvh-3rem))]`;

const APP_MODAL_THEME = {
  root: {
    // `z-modal` from the layer scale (index.css). Menus and tooltips sit
    // deliberately *above* this rung so a dropdown opened inside a dialog is
    // visible; see the scale's own comment for why that cannot leak.
    base: "fixed inset-x-0 top-0 z-modal h-dvh overflow-y-auto overflow-x-hidden md:inset-0 md:h-full",
  },
  content: {
    // `h-auto` is not redundant: Flowbite twMerges these strings over its
    // defaults rather than replacing them, so a utility only disappears when
    // an override from the same group displaces it. Without an explicit
    // `h-*`, the default `h-full` survives and stretches the panel to the full
    // height of the overlay — the very behaviour this override exists to undo.
    base: "relative my-4 flex h-auto w-[calc(100%-2rem)] flex-col p-0",
    inner: CONTENT_INNER_BASE,
  },
  header: {
    base: "flex shrink-0 items-start justify-between gap-4 rounded-t border-b border-default px-5 py-4 sm:px-6",
    title: "min-w-0 text-lg font-semibold text-heading",
    close: {
      base: "-me-1 inline-flex shrink-0 items-center rounded-lg bg-transparent p-1.5 text-sm text-body hover:bg-neutral-secondary-medium hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
      icon: "h-5 w-5",
    },
  },
};

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /**
   * Optional supporting content pinned under the title and announced via
   * `aria-describedby`. Usually a sentence; it accepts nodes so a dialog can
   * pin a status row (subject plus state) that must not scroll away with the
   * body.
   */
  description?: ReactNode;
  size?: AppModalSize;
  /**
   * Claim a stable working height instead of hugging the content. See
   * `CONTENT_INNER_FILL` — for dialogs whose body grows while they are open.
   */
  fillHeight?: boolean;
  children: ReactNode;
}

/**
 * The single governed modal shell. Everything that needs a dialog composes
 * this rather than reaching for `flowbite-react/Modal` directly, so the
 * viewport, scroll and focus behaviour is decided in exactly one place.
 *
 * Flowbite still supplies the behaviour underneath — portal, focus trap,
 * `role="dialog"` + `aria-modal`, `aria-labelledby` wired to the header,
 * Escape / outside-click dismissal and background scroll lock — so none of
 * that is reimplemented here.
 */
export function AppModal({ open, onClose, title, description, size = "2xl", fillHeight = false, children }: AppModalProps) {
  const descriptionId = description ? "app-modal-description" : undefined;
  const theme = fillHeight
    ? { ...APP_MODAL_THEME, content: { ...APP_MODAL_THEME.content, inner: CONTENT_INNER_FILL } }
    : APP_MODAL_THEME;

  return (
    <Modal
      show={open}
      onClose={onClose}
      dismissible
      size={size}
      theme={theme}
      // Flowbite wires `role="dialog"` and `aria-labelledby` but stops short of
      // `aria-modal`, so a screen reader is not told the rest of the page is
      // inert even though the focus trap and scroll lock make it so. Unknown
      // props are forwarded to the dialog element, which is how this reaches it.
      aria-modal="true"
      aria-describedby={descriptionId}
    >
      <ModalHeader>{title}</ModalHeader>
      {description ? (
        <p id={descriptionId} className="shrink-0 border-b border-default px-5 py-3 text-sm leading-6 text-body sm:px-6">
          {description}
        </p>
      ) : null}
      {children}
    </Modal>
  );
}

/**
 * The form element for a modal that submits.
 *
 * `flex min-h-0 flex-1 flex-col` is the load-bearing part, and its absence was
 * the structural cause of the footer escaping the panel: a `<form>` wrapped
 * around body + footer becomes the flex *item* of `content.inner`, so unless
 * it is itself a column, the body's `flex-1` has no flex parent to resolve
 * against — and unless it carries `min-h-0`, it refuses to shrink below its
 * content height and simply overflows the panel's `max-h`, taking the footer
 * with it.
 *
 * `noValidate` hands validation to the app's inline field messages instead of
 * the browser's native bubbles, which cannot be styled, translated, or read
 * reliably next to the field they belong to.
 */
export function AppModalForm({ onSubmit, children }: { onSubmit: (event: FormEvent) => void; children: ReactNode }) {
  return (
    <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      {children}
    </form>
  );
}

/**
 * The only scrolling region of a modal. `overscroll-contain` stops a scroll
 * gesture that reaches the end of this box from chaining to whatever is behind
 * the dialog.
 *
 * `ref` reaches the scroll container itself, for bodies that must control their
 * own scroll position — the chat pins itself to the newest message. React 19
 * passes `ref` as an ordinary prop, so no `forwardRef` wrapper is needed.
 */
export function AppModalBody({ children, ref }: { children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
  );
}

/**
 * The region pinned below the scrolling body. `shrink-0` keeps it on screen no
 * matter how tall the body's content is.
 *
 * Use this directly only when the footer is *not* a row of actions — the chat's
 * message composer is the case it exists for. Anything that ends in buttons
 * should use AppModalFooter, which adds the shared action-row layout.
 */
export function AppModalFooterBar({ children }: { children: ReactNode }) {
  return <div className="shrink-0 border-t border-default px-5 py-4 sm:px-6">{children}</div>;
}

/**
 * Action row for a modal, pinned below the scrolling body. The button layout
 * is delegated to FormActions so modal and inline forms stay identical.
 */
export function AppModalFooter({ children }: { children: ReactNode }) {
  return (
    <AppModalFooterBar>
      <FormActions>{children}</FormActions>
    </AppModalFooterBar>
  );
}
