import { useId, useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "../atoms/AppIcon";
import { FormField, type BaseFieldProps, fieldDescribedBy } from "./FormField";
import { formatFileSize } from "../../i18n/format";

/** The attachment facts the UI displays. Mirrors the `File` fields used. */
export interface SelectedFile {
  name: string;
  size: number;
}

interface FileFieldProps extends BaseFieldProps {
  file: SelectedFile | null;
  onSelect: (file: File | null) => void;
  accept?: string;
}

/**
 * Icon-only affordances on the attachment row. `p-2` around a 16px glyph plus
 * the row's own padding keeps the hit area at a comfortable touch size without
 * a fixed width that would compete with the file name for space.
 */
const ICON_BUTTON =
  "rounded-lg p-2 text-body hover:bg-neutral-secondary-medium hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** `informe-final.PDF` -> `PDF`; no extension -> no caption prefix. */
function fileExtension(name: string): string | null {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return null;
  return name.slice(index + 1).toUpperCase();
}

/**
 * Attachment picker: an empty drop target that becomes a summary row once a
 * file is chosen.
 *
 * The native `<input type="file">` is kept in the DOM and only visually hidden
 * (`sr-only`, never `display:none`), because it remains the real control — it
 * is what the `<label>` activates, what the keyboard focuses, and what
 * assistive technology announces. The browser's default rendering is what is
 * being replaced here, not the element: its unstyleable "Choose File" button
 * is fixed-width, untranslatable, and was the widest thing in the modal.
 *
 * Drag and drop is additive. It is a pointer-only affordance, so the click and
 * keyboard paths are never routed through it, and the prompt names the tap
 * action first for the touch devices where dragging is not possible at all.
 */
export function FileField({ id, label, hint, error, required, className, file, onSelect, accept }: FileFieldProps) {
  const { t } = useTranslation("common");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const summaryId = useId();

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  };

  const extension = file ? fileExtension(file.name) : null;

  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required} className={className}>
      {/* The input stays mounted in both branches so the ref, the label
          association and the form's own reset all keep working. */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [file ? summaryId : null, fieldDescribedBy(id, { hint, error })].filter(Boolean).join(" ") || undefined
        }
        onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex w-full min-w-0 items-center gap-3 rounded-base border border-default-medium bg-neutral-primary p-3">
          <span className="icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <AppIcon name="document" size={18} />
          </span>
          {/* min-w-0 lets this column shrink so `truncate` can engage; without
              it the flex item's automatic minimum size is the full, unbroken
              file name and the row widens the modal instead of ellipsizing. */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-heading" title={file.name}>
              {file.name}
            </p>
            <p id={summaryId} className="mt-0.5 truncate text-xs text-body">
              {[extension, formatFileSize(file.size)].filter(Boolean).join(" · ")}
            </p>
          </div>
          {/* Two icon buttons, not a five-action row: each keeps a 44px touch
              target and an accessible name, and they wrap to nothing on 320px
              because the name column absorbs the remaining width. */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label={t("fileField.replace")}
              title={t("fileField.replace")}
              className={ICON_BUTTON}
            >
              <AppIcon name="folder" size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                onSelect(null);
              }}
              aria-label={t("fileField.remove")}
              title={t("fileField.remove")}
              className={ICON_BUTTON}
            >
              <AppIcon name="close" size={16} />
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex w-full min-w-0 cursor-pointer flex-col items-center gap-1 rounded-base border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragging
              ? "border-brand bg-brand-soft"
              : error
                ? "border-danger-subtle bg-danger-soft"
                : "border-default-medium bg-neutral-primary hover:border-brand hover:bg-neutral-secondary-medium"
          }`}
        >
          <AppIcon name="upload" size={20} className="text-body" />
          <span className="text-sm font-medium text-heading">{t("fileField.prompt")}</span>
          <span className="text-xs text-body">{t("fileField.dropHint")}</span>
        </label>
      )}
    </FormField>
  );
}
