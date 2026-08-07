import type { InputHTMLAttributes, ReactNode } from "react";

interface FloatingFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder" | "className"> {
  id: string;
  label: string;
  /** Rendered inside the field box, right-aligned — e.g. a show/hide password toggle. */
  trailing?: ReactNode;
}

/**
 * Floating-label text field, following Flowbite's published floating-label
 * form block: a bottom-rule input whose label starts inline and animates up
 * to a caption on focus or once the field has content.
 *
 * The whole effect is CSS — no JS, no "is the field empty" state to keep in
 * sync. It hangs off `placeholder=" "` (a single space) plus the
 * `peer-placeholder-shown:` variant: while the browser considers the
 * placeholder visible (i.e. the input is empty), the label sits at full size
 * on the baseline; any value or focus flips it to the raised caption. The
 * placeholder is therefore load-bearing and intentionally not configurable —
 * that is why `placeholder` is omitted from the prop surface.
 *
 * `trailing` gets `pe-10` reserved padding on the input so an adornment never
 * overlaps typed text.
 */
export function FloatingField({ id, label, trailing, ...inputProps }: FloatingFieldProps) {
  return (
    <div className="group relative z-0 w-full">
      <input
        {...inputProps}
        id={id}
        placeholder=" "
        className={`peer block w-full appearance-none border-0 border-b-2 border-default-medium bg-transparent px-0 py-2.5 text-sm text-heading focus:border-brand focus:outline-none focus:ring-0 ${
          trailing ? "pe-10" : ""
        }`}
      />
      <label
        htmlFor={id}
        className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-body duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:start-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-fg-brand rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
      >
        {label}
      </label>
      {trailing ? <div className="absolute inset-y-0 end-0 flex items-center">{trailing}</div> : null}
    </div>
  );
}
