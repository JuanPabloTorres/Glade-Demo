import { useTranslation } from "react-i18next";
import { AppButton } from "../ui/AppButton";
import { AppModal, AppModalBody, AppModalFooter } from "../overlays/AppModal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Overrides the localized default. Omit to use `common:actions.confirm`. */
  confirmLabel?: string;
  /** Overrides the localized default. Omit to use `common:actions.cancel`. */
  cancelLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive/irreversible-action gate.
 *
 * Composes the shared AppModal rather than Flowbite's `Modal` directly, so it
 * inherits the same viewport cap, scrolling body and stacking action row as
 * every other dialog — it previously carried its own copy of Flowbite's footer,
 * which put two `w-full sm:w-auto` buttons on one unwrapped row and squeezed
 * them on narrow screens.
 *
 * The confirm/cancel labels default to the localized `common:actions.*` keys.
 * They previously defaulted to the hardcoded Spanish strings "Confirmar" and
 * "Cancelar", which meant an English session silently rendered Spanish
 * buttons — the `t()` fallbacks below them were unreachable, because a
 * non-empty default parameter never falls through to `||`.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");

  return (
    <AppModal open={open} onClose={onCancel} title={title} size="md">
      <AppModalBody>
        <p className="text-sm leading-6 text-body">{message}</p>
      </AppModalBody>
      <AppModalFooter>
        <AppButton color="light" className="w-full sm:w-auto" onClick={onCancel} disabled={busy}>
          {cancelLabel ?? t("actions.cancel")}
        </AppButton>
        <AppButton
          color={destructive ? "failure" : "indigo"}
          className="w-full sm:w-auto"
          onClick={onConfirm}
          loading={busy}
        >
          {confirmLabel ?? t("actions.confirm")}
        </AppButton>
      </AppModalFooter>
    </AppModal>
  );
}
