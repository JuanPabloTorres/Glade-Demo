import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";
import { ConfirmDialog } from "../feedback/ConfirmDialog";
import { AppTooltip } from "../overlays/AppTooltip";
import { LAYER, useOverlayPosition, type OverlayAlign } from "../overlays/useOverlayPosition";

/**
 * One contextual action. Everything that varies between a table row, a card and
 * a detail header is expressed here rather than by writing different markup.
 */
export interface ActionItem {
  id: string;
  /** Already translated — this component never guesses at a key. */
  label: string;
  icon?: AppIconName;
  /** May be async; the item shows a spinner and refuses re-entry until it settles. */
  onClick?: () => void | Promise<void>;
  /** Navigation actions declare a route instead of a handler. */
  href?: string;
  disabled?: boolean;
  /** Removed entirely — use for actions the user's role must not see at all. */
  hidden?: boolean;
  /**
   * Permission gate. `false` removes the action, exactly like `hidden`; the
   * separate name is what lets a call site pass a permission result straight
   * through without restating the rule. Permission itself is decided by the
   * caller (role/service), never by this component.
   */
  allowed?: boolean;
  destructive?: boolean;
  /** Auxiliary detail only. The label is always present, so this is never the sole affordance. */
  tooltip?: string;
  /**
   * Confirmation copy. Required in practice for destructive actions — a
   * destructive item without it is reported by `ActionGroup` in development,
   * because "delete" firing straight off a menu click is the defect this
   * component exists to prevent.
   */
  confirm?: { title: string; message: string; confirmLabel?: string };
}

interface ActionGroupProps {
  /**
   * The one action worth a click of its own. Rendered as the left segment.
   * Omit it and the group collapses to a single icon-only menu button, which
   * is the right shape inside a dense table.
   */
  primary?: ActionItem;
  /** Everything else. Empty means no dropdown segment is rendered at all. */
  actions?: ActionItem[];
  /** Menu alignment against the trigger. `end` keeps it inside a right-hand table column. */
  align?: OverlayAlign;
  /** Hides the primary action's label below `sm`, keeping its icon. Needs `primary.icon`. */
  collapsePrimaryLabel?: boolean;
  className?: string;
}

const SEGMENT =
  "inline-flex items-center justify-center border border-default bg-neutral-primary-soft text-sm font-medium leading-5 text-body transition-colors hover:bg-neutral-secondary-medium hover:text-heading focus:z-10 focus:outline-none focus-visible:ring-3 focus-visible:ring-neutral-tertiary-soft disabled:cursor-not-allowed disabled:opacity-50";

/** 44px min touch target on every segment, per the responsive/a11y baseline. */
const SEGMENT_HEIGHT = "min-h-11";

function visibleActions(actions: ActionItem[]): ActionItem[] {
  return actions.filter((action) => !action.hidden && action.allowed !== false);
}

/**
 * The standard action control.
 *
 * Replaces three patterns that had drifted apart: `RowActionsMenu` (a primary
 * button beside a separate bordered dropdown), `CaseActionBar`'s flat row of
 * nine equal buttons, and the one-off buttons inside `ResponsiveDataView`
 * cards. They looked different, wrapped differently on a phone and had
 * different keyboard behaviour, and the destructive ones fired straight from a
 * menu click.
 *
 * Shape is Flowbite's button-group block: segments joined by `-space-x-px` so
 * their borders collapse into one hairline, the primary rounded on the leading
 * edge and the menu trigger on the trailing edge.
 *
 *   ┌─────────────────┬────┐
 *   │ Primary action  │  ▼ │
 *   └─────────────────┴────┘
 *
 * The menu is portaled to `document.body` at the `menu` layer rung, so it is
 * not clipped by the table wrapper's `overflow-x-auto` or the card's
 * `overflow-hidden`, and does not render behind the following row. It flips
 * above the trigger near the bottom of the viewport and shifts inward near the
 * right edge — see `useOverlayPosition`.
 *
 * Keyboard: the trigger opens on Enter/Space/ArrowDown/ArrowUp, arrows and
 * Home/End move between items, Escape closes and returns focus to the trigger,
 * and Tab closes rather than trapping. Items are `role="menuitem"` inside a
 * `role="menu"`, and the trigger carries `aria-haspopup`/`aria-expanded`.
 *
 * This component decides only how an action is *presented*. What an action
 * does, and whether the user may perform it, stay with the caller and the
 * services behind it.
 */
export function ActionGroup({ primary, actions = [], align = "end", collapsePrimaryLabel = false, className = "" }: ActionGroupProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<ActionItem | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const items = visibleActions(actions);
  const primaryVisible = primary && !primary.hidden && primary.allowed !== false ? primary : null;
  const position = useOverlayPosition(triggerRef, menuRef, { open, side: "bottom", align, zIndex: LAYER.menu });

  if (import.meta.env.DEV) {
    const unguarded = [primaryVisible, ...items].find((action) => action?.destructive && !action.confirm);
    if (unguarded) {
      console.warn(
        `[ActionGroup] destructive action "${unguarded.id}" has no \`confirm\`. A destructive action must not fire straight from a click.`,
      );
    }
  }

  const closeAndRefocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Outside click and Escape. Bound only while open, so a page full of these
  // does not carry a document listener per group.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeAndRefocus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeAndRefocus]);

  // Move focus into the menu once it is on screen, so the first arrow key acts
  // on the menu rather than scrolling the page.
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  // Navigation actions never reach this: they render as real links (see
  // `renderLabel` call sites), so middle-click, "open in new tab" and the
  // browser's own affordances keep working. A control that navigates should
  // be a link.
  const perform = useCallback(
    async (action: ActionItem) => {
      if (action.disabled || runningId || action.href) return;
      if (!action.onClick) return;

      const result = action.onClick();
      // Synchronous handlers must not flash a spinner, so only await a thenable.
      if (!(result instanceof Promise)) {
        setOpen(false);
        return;
      }
      setRunningId(action.id);
      try {
        await result;
      } finally {
        setRunningId(null);
        setOpen(false);
      }
    },
    [runningId],
  );

  const activate = useCallback(
    (action: ActionItem) => {
      if (action.confirm) {
        // Close the menu first: leaving it open behind the dialog gives two
        // stacked overlays and an ambiguous Escape target.
        setOpen(false);
        setPendingConfirm(action);
        return;
      }
      void perform(action);
    },
    [perform],
  );

  const onMenuKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const focusAt = (next: number) => {
      event.preventDefault();
      itemRefs.current[next]?.focus();
    };
    if (event.key === "ArrowDown") focusAt(index === last ? 0 : index + 1);
    else if (event.key === "ArrowUp") focusAt(index === 0 ? last : index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(last);
    else if (event.key === "Tab") setOpen(false);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  if (!primaryVisible && !items.length) return null;

  const primaryClasses = primaryVisible
    ? `${SEGMENT} ${SEGMENT_HEIGHT} gap-2 px-3 py-2 ${items.length ? "rounded-s-base" : "rounded-base"} ${
        primaryVisible.destructive ? "text-fg-danger hover:text-fg-danger-strong" : ""
      }`
    : "";

  const primaryContent = primaryVisible ? (
    <>
      {runningId === primaryVisible.id ? (
        <AppIcon name="refresh" size={15} className="animate-spin" />
      ) : primaryVisible.icon ? (
        <AppIcon name={primaryVisible.icon} size={15} />
      ) : null}
      {/* `min-w-0` + `break-words` rather than a smaller font: English labels
          run longer than their Spanish equivalents and must wrap, not shrink. */}
      <span className={`min-w-0 break-words ${collapsePrimaryLabel ? "hidden sm:inline" : ""}`}>{primaryVisible.label}</span>
    </>
  ) : null;

  const primaryButton = !primaryVisible ? null : primaryVisible.href && !primaryVisible.disabled ? (
    <Link to={primaryVisible.href} aria-label={collapsePrimaryLabel ? primaryVisible.label : undefined} className={primaryClasses}>
      {primaryContent}
    </Link>
  ) : (
    <button
      type="button"
      disabled={primaryVisible.disabled || runningId === primaryVisible.id}
      onClick={() => activate(primaryVisible)}
      aria-label={collapsePrimaryLabel ? primaryVisible.label : undefined}
      className={primaryClasses}
    >
      {primaryContent}
    </button>
  );

  return (
    <>
      <div className={`inline-flex w-fit max-w-full rounded-base shadow-xs -space-x-px ${className}`} role="group">
        {primaryVisible?.tooltip ? <AppTooltip content={primaryVisible.tooltip}>{primaryButton}</AppTooltip> : primaryButton}

        {items.length ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            onKeyDown={onTriggerKeyDown}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            // Always a real accessible name: the trigger is icon-only, and a
            // tooltip is unreachable by touch.
            aria-label={t("actions.moreActions")}
            className={`${SEGMENT} ${SEGMENT_HEIGHT} w-11 shrink-0 ${primaryVisible ? "rounded-e-base" : "rounded-base"}`}
          >
            <AppIcon name="chevron-down" size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        ) : null}
      </div>

      {open && items.length
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={t("actions.moreActions")}
              style={position.style}
              className="min-w-52 overflow-y-auto overscroll-contain rounded-base border border-default bg-neutral-primary-soft py-1 shadow-lg"
            >
              {items.map((action, index) => {
                const itemClasses = `flex min-h-11 w-full items-center gap-2.5 px-4 py-2 text-start text-sm transition-colors focus:outline-none focus-visible:bg-neutral-tertiary disabled:cursor-not-allowed disabled:opacity-50 ${
                  action.destructive
                    ? "text-fg-danger hover:bg-danger-soft hover:text-fg-danger-strong"
                    : "text-body hover:bg-neutral-tertiary hover:text-heading"
                }`;
                const content = (
                  <>
                    {runningId === action.id ? (
                      <AppIcon name="refresh" size={15} className="shrink-0 animate-spin" />
                    ) : action.icon ? (
                      <AppIcon name={action.icon} size={15} className="shrink-0" />
                    ) : (
                      // Keeps labels aligned in a menu that mixes items with
                      // and without icons.
                      <span className="w-[15px] shrink-0" aria-hidden="true" />
                    )}
                    <span className="min-w-0 break-words">{action.label}</span>
                  </>
                );

                const shared = {
                  ref: (node: HTMLElement | null) => {
                    itemRefs.current[index] = node as HTMLButtonElement | null;
                  },
                  role: "menuitem" as const,
                  onKeyDown: (event: React.KeyboardEvent) => onMenuKeyDown(event, index),
                  title: action.tooltip,
                  className: itemClasses,
                };

                return action.href && !action.disabled ? (
                  <Link key={action.id} {...shared} to={action.href} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <button
                    key={action.id}
                    {...shared}
                    type="button"
                    disabled={action.disabled || runningId !== null}
                    onClick={() => activate(action)}
                  >
                    {content}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}

      {/* Destructive actions never execute from the menu click itself. */}
      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.confirm?.title ?? ""}
        message={pendingConfirm?.confirm?.message ?? ""}
        confirmLabel={pendingConfirm?.confirm?.confirmLabel}
        destructive={pendingConfirm?.destructive ?? false}
        busy={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return;
          setPendingConfirm(null);
          triggerRef.current?.focus();
        }}
        onConfirm={() => {
          if (!pendingConfirm) return;
          setConfirmBusy(true);
          void perform(pendingConfirm).finally(() => {
            setConfirmBusy(false);
            setPendingConfirm(null);
          });
        }}
      />
    </>
  );
}
