import { Label } from "flowbite-react";
import type { ReactNode } from "react";

export interface FieldMessages {
  /** Standing guidance, shown while the field is valid. */
  hint?: string;
  /** Validation message, shown in place of the hint once set. */
  error?: string;
}

export interface BaseFieldProps extends FieldMessages {
  id: string;
  label: string;
  required?: boolean;
  /** Layout-only escape hatch, e.g. `md:col-span-2` inside a FormGrid. */
  className?: string;
}

/**
 * The id of whichever message a field is currently showing, for the control's
 * `aria-describedby`. Only one of the two is rendered at a time, so only one
 * is ever referenced — pointing at a hidden element would make screen readers
 * announce nothing.
 */
export function fieldDescribedBy(id: string, { hint, error }: FieldMessages) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

/**
 * Label + control + message, the layout every field in the app shares.
 *
 * `min-w-0` is not cosmetic: a flex or grid item defaults to
 * `min-width: auto`, which floors it at its content's intrinsic width. Without
 * it, a long `<option>` or an unbroken file name widens the column past its
 * track and pushes the whole form sideways — `w-full` on the control does not
 * prevent that, because the track itself is what grew.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: BaseFieldProps & { children: ReactNode }) {
  return (
    <div className={`flex w-full min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
      {/* The required marker is a sibling of the <label>, never a child of it.
          Inside, it would join the label's text content, and the field's name
          would become "Categoría *" for anything that reads text rather than
          the accessibility tree — including the test queries that stand in for
          that reading. The state itself is carried by the control's `required`
          and `aria-invalid`; this glyph is only the sighted shorthand. */}
      <div className="flex items-baseline gap-1">
        <Label htmlFor={id} className="text-sm font-medium text-heading">
          {label}
        </Label>
        {required ? (
          <span aria-hidden="true" className="text-fg-danger">
            *
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-fg-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs leading-5 text-body">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
