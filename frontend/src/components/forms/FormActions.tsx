import type { ReactNode } from "react";

/**
 * The app's one action-row layout for forms, in and out of modals.
 *
 * Children are written in reading order — cancel first, primary action last —
 * and `flex-col-reverse` flips that on narrow screens so the primary action
 * sits on top, where a thumb reaches it first. From `sm` up the row is
 * horizontal and right-aligned, the conventional desktop placement.
 *
 * Buttons pass `w-full sm:w-auto` themselves: full-bleed while stacked, then
 * intrinsic width once there is room for them side by side.
 */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>;
}
