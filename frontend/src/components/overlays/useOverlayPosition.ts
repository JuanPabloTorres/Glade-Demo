import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export type OverlaySide = "top" | "bottom" | "left" | "right";
export type OverlayAlign = "start" | "center" | "end";

const OPPOSITE: Record<OverlaySide, OverlaySide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

interface UseOverlayPositionOptions {
  open: boolean;
  /** Preferred side. Flipped automatically when that side has no room. */
  side?: OverlaySide;
  /** Alignment along the cross axis. Clamped to the viewport, never overflows. */
  align?: OverlayAlign;
  /** Gap between anchor and overlay, in px. */
  offset?: number;
  /** Minimum distance kept from every viewport edge, in px. */
  padding?: number;
  /** Layer token value, written straight onto the returned style. */
  zIndex: string;
}

interface OverlayPosition {
  style: CSSProperties;
  /** The side actually used after flipping — for arrow/animation direction. */
  side: OverlaySide;
  /** Recompute now (after the overlay's own content changes size). */
  reposition: () => void;
}

function crossAxisOffset(align: OverlayAlign, anchorSize: number, overlaySize: number): number {
  if (align === "start") return 0;
  if (align === "end") return anchorSize - overlaySize;
  return (anchorSize - overlaySize) / 2;
}

function clamp(value: number, min: number, max: number): number {
  // When the overlay is wider than the space available, `max` drops below
  // `min`. Pinning to `min` keeps the leading edge on screen, which is the
  // readable failure; honouring `max` would push it off the opposite edge.
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

/**
 * Fixed-position, viewport-aware placement for overlays that must escape their
 * container.
 *
 * Why this exists rather than `flowbite-react`'s Tooltip/Dropdown positioning:
 * those render the floating element as a sibling of the trigger with
 * `position: absolute` and no portal (verified in
 * `flowbite-react@0.12.9/dist/components/Floating/Floating.js`, where `strategy`
 * is whatever `useFloating` defaults to and is not a prop). An absolutely
 * positioned element is clipped by any ancestor with `overflow: hidden|auto|
 * clip` — which in this app means every table wrapper, every `Card`, and the
 * scroll container of the app shell. That is the mechanism behind "dropdown
 * cortado por el contenedor" and "tooltip detrás de la tarjeta"; it cannot be
 * fixed with a z-index, because clipping happens before stacking is considered.
 *
 * `position: fixed` resolves against the viewport instead, so no intermediate
 * `overflow` can clip it, and combined with a portal to `document.body` there
 * is no intermediate stacking context either.
 *
 * Behaviour, matching the overlay requirements:
 * - flips to the opposite side when the preferred one does not fit, but only
 *   if the opposite side actually has more room (otherwise flipping trades one
 *   clipped edge for another);
 * - shifts along the cross axis to stay inside the viewport, so a menu on the
 *   right edge of a table does not run off screen;
 * - never positions itself to produce horizontal document scroll, because a
 *   fixed element is outside the document flow entirely;
 * - follows the anchor on scroll and resize, including scrolls of inner
 *   containers (`capture: true` catches them without registering per-container
 *   listeners).
 */
export function useOverlayPosition<Anchor extends HTMLElement, Floating extends HTMLElement>(
  anchorRef: React.RefObject<Anchor | null>,
  floatingRef: React.RefObject<Floating | null>,
  { open, side = "bottom", align = "center", offset = 8, padding = 8, zIndex }: UseOverlayPositionOptions,
): OverlayPosition {
  const [position, setPosition] = useState<{ top: number; left: number; side: OverlaySide } | null>(null);
  // Read in `compute` but deliberately not a dependency: re-running the effect
  // on every measurement would loop.
  const positionRef = useRef(position);
  positionRef.current = position;

  const compute = useCallback(() => {
    const anchor = anchorRef.current;
    const floating = floatingRef.current;
    if (!anchor || !floating) return;

    const anchorRect = anchor.getBoundingClientRect();
    const width = floating.offsetWidth;
    const height = floating.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    const room = {
      top: anchorRect.top,
      bottom: viewportHeight - anchorRect.bottom,
      left: anchorRect.left,
      right: viewportWidth - anchorRect.right,
    };
    const needed = side === "top" || side === "bottom" ? height + offset + padding : width + offset + padding;
    // Flip only when the opposite side is genuinely roomier — flipping into a
    // side that is equally cramped just moves the problem.
    const resolvedSide = room[side] < needed && room[OPPOSITE[side]] > room[side] ? OPPOSITE[side] : side;

    let top: number;
    let left: number;
    if (resolvedSide === "top" || resolvedSide === "bottom") {
      top = resolvedSide === "top" ? anchorRect.top - height - offset : anchorRect.bottom + offset;
      left = anchorRect.left + crossAxisOffset(align, anchorRect.width, width);
      left = clamp(left, padding, viewportWidth - width - padding);
      top = clamp(top, padding, viewportHeight - height - padding);
    } else {
      left = resolvedSide === "left" ? anchorRect.left - width - offset : anchorRect.right + offset;
      top = anchorRect.top + crossAxisOffset(align, anchorRect.height, height);
      top = clamp(top, padding, viewportHeight - height - padding);
      left = clamp(left, padding, viewportWidth - width - padding);
    }

    const rounded = { top: Math.round(top), left: Math.round(left), side: resolvedSide };
    const previous = positionRef.current;
    // Bail when nothing moved: `autoUpdate`-style listeners fire continuously
    // during a scroll and an unconditional setState re-renders every frame.
    if (previous && previous.top === rounded.top && previous.left === rounded.left && previous.side === rounded.side) return;
    setPosition(rounded);
  }, [anchorRef, floatingRef, side, align, offset, padding]);

  // Layout effect, not effect: measure and place before paint, so the overlay
  // never appears at 0,0 for a frame and then jumps to the anchor.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    compute();

    const onViewportChange = () => compute();
    // `capture` catches scrolls of inner containers too — a menu inside a
    // scrolling table body has to track its row.
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onViewportChange);
    if (observer) {
      if (anchorRef.current) observer.observe(anchorRef.current);
      if (floatingRef.current) observer.observe(floatingRef.current);
    }

    return () => {
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
      observer?.disconnect();
    };
  }, [open, compute, anchorRef, floatingRef]);

  return {
    side: position?.side ?? side,
    reposition: compute,
    style: {
      position: "fixed",
      top: position?.top ?? 0,
      left: position?.left ?? 0,
      zIndex,
      // Hidden until measured, so the first paint is never at the wrong place.
      // `visibility` rather than `display`, because the element has to be laid
      // out for `offsetWidth`/`offsetHeight` to be readable at all.
      visibility: position ? "visible" : "hidden",
      // A menu can be taller than the viewport on a phone; scroll it inside
      // its own box rather than letting it run off the bottom edge.
      maxHeight: `calc(100dvh - ${padding * 2}px)`,
      maxWidth: `calc(100vw - ${padding * 2}px)`,
    },
  };
}

/** The layer scale from index.css, readable from TS. Never write a raw z-index. */
export const LAYER = {
  sticky: "var(--z-index-sticky)",
  nav: "var(--z-index-nav)",
  launcher: "var(--z-index-launcher)",
  drawer: "var(--z-index-drawer)",
  backdrop: "var(--z-index-backdrop)",
  modal: "var(--z-index-modal)",
  menu: "var(--z-index-menu)",
  tooltip: "var(--z-index-tooltip)",
  toast: "var(--z-index-toast)",
} as const;
