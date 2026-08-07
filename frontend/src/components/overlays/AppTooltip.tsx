import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LAYER, useOverlayPosition, type OverlayAlign, type OverlaySide } from "./useOverlayPosition";

interface AppTooltipProps {
  /** The tooltip text. Auxiliary information only — never the only place an action is named. */
  content: ReactNode;
  side?: OverlaySide;
  align?: OverlayAlign;
  /** Wrapper display, for tooltips on inline elements inside a sentence. */
  inline?: boolean;
  /**
   * Let the wrapper fill its parent instead of hugging the trigger. Needed
   * wherever the trigger is itself `w-full` — a sidebar row, a full-width
   * button — because the default `w-fit` would otherwise shrink it.
   */
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The single tooltip in the app.
 *
 * Replaces `flowbite-react`'s `Tooltip`, which renders its bubble as an
 * absolutely positioned sibling of the trigger at `z-10`. Two consequences,
 * both of them reported symptoms:
 *
 * - `z-10` is below the app header (sticky) and the mobile bottom bar, so a
 *   tooltip near either one rendered behind it;
 * - no portal plus `position: absolute` means any ancestor with `overflow`
 *   clips it — which is every table wrapper and every `Card` in this app.
 *
 * This renders into `document.body` at the `tooltip` rung of the layer scale
 * and positions itself against the viewport, so neither can happen. See
 * `useOverlayPosition` for the flip/shift behaviour.
 *
 * Accessibility: the bubble is `role="tooltip"` and wired to the trigger with
 * `aria-describedby`, so it is announced as a description rather than as the
 * accessible name. It opens on hover *and* on keyboard focus, and Escape
 * dismisses it while focus stays on the trigger. It is deliberately a
 * description: an icon-only control must still carry its own `aria-label`
 * (see `IconButton`), because a tooltip is not reachable by touch at all.
 */
export function AppTooltip({ content, side = "top", align = "center", inline = false, fullWidth = false, className = "", children }: AppTooltipProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const position = useOverlayPosition(anchorRef, floatingRef, { open, side, align, zIndex: LAYER.tooltip });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!content) return <>{children}</>;

  return (
    <>
      <span
        ref={anchorRef}
        // `contents` would remove the wrapper from layout entirely, but then it
        // has no box to measure. `inline-flex` keeps it tight around the
        // trigger without adding a line box of its own.
        className={`${inline ? "inline" : "inline-flex"} ${fullWidth ? "w-full" : "w-fit"} ${className}`}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>

      {open
        ? createPortal(
            <div
              ref={floatingRef}
              id={tooltipId}
              role="tooltip"
              style={position.style}
              className="pointer-events-none w-max rounded-base bg-heading px-3 py-2 text-sm font-medium text-white shadow-lg"
            >
              {/* `overflow-wrap: anywhere` via `break-words`: English strings run
                  longer than their Spanish equivalents and an unbroken one
                  would otherwise force the bubble past the viewport clamp. */}
              <span className="block max-w-64 break-words">{content}</span>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
