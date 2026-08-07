import type { ReactNode } from "react";
import { AppIcon } from "./AppIcon";

/**
 * Typography primitives — the reusable answer to "what size/weight/color is
 * this text?", so pages stop inventing a `text-[13px] text-slate-500` per
 * screen.
 *
 * Every role resolves through the semantic token layer (`text-heading` /
 * `text-body` / `text-fg-danger`, see index.css), never a raw Tailwind palette
 * color. The size/weight pairs come from the documented typography scale in
 * docs/ux/FLOWBITE-COMPONENT-STANDARDS.md §7.
 */

interface WithChildren {
  children: ReactNode;
  className?: string;
}

/** Section heading inside a page — one level below PageTitle. */
export function SectionTitle({ children, className = "" }: WithChildren) {
  return <h2 className={`text-lg font-semibold tracking-tight text-heading ${className}`}>{children}</h2>;
}

/** Heading for a card or panel — one level below SectionTitle. */
export function CardTitle({ children, className = "" }: WithChildren) {
  return <h3 className={`text-base font-semibold text-heading ${className}`}>{children}</h3>;
}

/** Default running copy. */
export function BodyText({ children, className = "" }: WithChildren) {
  return <p className={`text-sm leading-6 text-body ${className}`}>{children}</p>;
}

/** Secondary guidance under a field or control — never used to convey errors. */
export function HelperText({ children, className = "" }: WithChildren) {
  return <p className={`text-xs leading-5 text-body ${className}`}>{children}</p>;
}

/**
 * Validation/error copy tied to a control.
 *
 * `role="alert"` so a screen reader announces the message when it appears
 * rather than only on focus, and the icon means the message does not rely on
 * color alone to read as an error.
 */
export function ErrorText({ children, className = "", id }: WithChildren & { id?: string }) {
  return (
    <p id={id} role="alert" className={`flex items-start gap-1.5 text-xs leading-5 text-fg-danger ${className}`}>
      <AppIcon name="alert" size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Form field label. Always tied to a control via `htmlFor`. */
export function FieldLabel({
  children,
  htmlFor,
  required = false,
  className = "",
}: WithChildren & { htmlFor: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={`mb-2 block text-sm font-medium text-heading ${className}`}>
      {children}
      {/* aria-hidden: "required" is already announced from the input's own
          `required`/`aria-required`; the asterisk is a visual echo, and reading
          it out would duplicate the announcement. */}
      {required ? <span aria-hidden="true" className="ms-0.5 text-fg-danger">*</span> : null}
    </label>
  );
}
