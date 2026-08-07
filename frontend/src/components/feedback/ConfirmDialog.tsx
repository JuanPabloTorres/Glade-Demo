import { Modal, ModalBody, ModalFooter, ModalHeader } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppButton } from "../ui/AppButton";

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
 * Destructive/irreversible-action gate, following Flowbite's modal block
 * (ruled header, ruled footer, primary action full-width below `sm`).
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
    <Modal show={open} onClose={onCancel}>
      <ModalHeader className="border-b border-default [&>h3]:text-lg [&>h3]:font-medium [&>h3]:text-heading">
        {title}
      </ModalHeader>
      <ModalBody>
        <p className="text-sm leading-6 text-body">{message}</p>
      </ModalBody>
      <ModalFooter className="border-t border-default">
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
      </ModalFooter>
    </Modal>
  );
}
