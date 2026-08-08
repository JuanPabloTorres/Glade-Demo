import type { ButtonHTMLAttributes } from "react";
import { AppIcon, type AppIconName } from "../atoms/AppIcon";

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">;

export interface IconButtonProps extends NativeButtonProps {
  icon: AppIconName;
  /**
   * The accessible name, already translated. Required, not optional: an
   * icon-only control with no name is an unlabelled button to a screen reader,
   * and every one of the five call sites this replaced had already written one
   * by hand. Making it part of the type means the next call site cannot forget.
   */
  label: string;
  /**
   * `md` (44px) is the touch target for a control a finger reaches for — a
   * sheet's close button, a password reveal. `sm` (36px) is for a control that
   * sits inside dense chrome next to text, where 44px would push the layout
   * around; it stays above the 24px minimum and is never the only way to do
   * something.
   */
  size?: "sm" | "md";
  /** Glyph size. Defaults to the one that suits `size`. */
  iconSize?: number;
  /** Applied to the glyph — rotation for a direction that flips, and nothing else. */
  iconClassName?: string;
}

const FRAME: Record<"sm" | "md", string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
};

const GLYPH: Record<"sm" | "md", number> = { sm: 16, md: 18 };

/**
 * The icon-only button.
 *
 * Five of these existed as hand-written `<button>` elements — the login
 * password reveal, the assistant sheet's minimize and close, the chat copy
 * control and the sidebar collapse toggle. They agreed on what they were and
 * disagreed on everything else: three hover treatments, two focus rings, two
 * ways of spelling a square, and an accessible name that was correct at all
 * five only because five separate authors remembered it.
 *
 * The behaviour that belongs to every one of them lives here: a square frame
 * with a real hit area, a centred glyph, a visible focus ring, and a required
 * `label`. `className` still passes through, because a call site legitimately
 * needs to say where the button sits (`self-center`) or what it sits on — the
 * chat control needs its own background to stay visible against a message
 * bubble. Placement is the call site's business; what a button looks and
 * behaves like is not.
 *
 * A tooltip is not built in. `AppTooltip` wraps this where one is wanted, and a
 * tooltip is unreachable by touch — so it can add detail but never carry the
 * name, which is why `label` is required here rather than delegated.
 */
export function IconButton({
  icon,
  label,
  size = "md",
  iconSize,
  iconClassName,
  className = "",
  type = "button",
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      // Defaulted rather than demanded: an icon button inside a form that
      // submits it because nobody wrote type="button" is the single most
      // common way this control goes wrong.
      type={type}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-base text-body outline-none transition-colors hover:bg-neutral-tertiary hover:text-heading focus-visible:ring-4 focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:opacity-50 ${FRAME[size]} ${className}`}
      {...buttonProps}
    >
      <AppIcon name={icon} size={iconSize ?? GLYPH[size]} className={iconClassName} />
    </button>
  );
}
