import { Checkbox, Label, Select, Textarea, TextInput } from "flowbite-react";
import type { ComponentProps, ReactNode } from "react";
import { BaseFieldProps, FormField, fieldDescribedBy } from "./FormField";

/**
 * The governed control classes. `.app-input` is the app-wide input contract
 * declared in index.css (height, radius, border and focus ring); Flowbite
 * applies a wrapper `<div>` around the real control, and the stylesheet
 * targets both that wrapper (`.app-input input`) and the bare element
 * (`input.app-input`), so passing it as the wrapper class is enough.
 *
 * `w-full min-w-0` is repeated on every control for the reason spelled out in
 * FormField: inside a grid or flex track, intrinsic content width — not the
 * declared width — is what overflows.
 */
const CONTROL = "app-input w-full min-w-0";

/** Extra classes for the control itself, when a field needs more than the layout. */
interface ControlClassName {
  controlClassName?: string;
}

type TextFieldProps = BaseFieldProps &
  ControlClassName &
  Omit<ComponentProps<typeof TextInput>, "id" | "color" | "className">;

export function TextField({ id, label, hint, error, required, className, controlClassName, ...inputProps }: TextFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <TextInput
        {...inputProps}
        id={id}
        required={required}
        color={error ? "failure" : undefined}
        className={`${CONTROL} ${controlClassName ?? ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(id, { hint, error })}
      />
    </FormField>
  );
}

type SelectFieldProps = BaseFieldProps &
  ControlClassName &
  Omit<ComponentProps<typeof Select>, "id" | "color" | "className">;

export function SelectField({ id, label, hint, error, required, className, controlClassName, children, ...selectProps }: SelectFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <Select
        {...selectProps}
        id={id}
        required={required}
        color={error ? "failure" : undefined}
        className={`${CONTROL} ${controlClassName ?? ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(id, { hint, error })}
      >
        {children}
      </Select>
    </FormField>
  );
}

type TextareaFieldProps = BaseFieldProps &
  ControlClassName &
  Omit<ComponentProps<typeof Textarea>, "id" | "color" | "className">;

export function TextareaField({
  id,
  label,
  hint,
  error,
  required,
  className,
  controlClassName,
  rows = 3,
  ...textareaProps
}: TextareaFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <Textarea
        {...textareaProps}
        id={id}
        rows={rows}
        required={required}
        color={error ? "failure" : undefined}
        className={`${CONTROL} resize-y ${controlClassName ?? ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(id, { hint, error })}
      />
    </FormField>
  );
}

interface CheckboxFieldProps {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

/**
 * A checkbox reads as a single statement, so unlike the other fields its label
 * sits beside the control rather than above it. `items-start` plus `mt-0.5`
 * keeps the box aligned to the first line when the statement wraps on a narrow
 * screen, instead of floating to the vertical centre of a two-line block.
 */
export function CheckboxField({ id, label, checked, onChange, hint }: CheckboxFieldProps) {
  return (
    <div className="flex w-full min-w-0 items-start gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 shrink-0"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-normal leading-5 text-heading">
          {label}
        </Label>
        {hint ? (
          <p id={`${id}-hint`} className="mt-1 text-xs leading-5 text-body">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Responsive field grid: one column until there is room for two, so a narrow
 * screen never has to divide its width between two controls. Pair a field with
 * `className="md:col-span-2"` when it should stay full width on desktop.
 */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}
