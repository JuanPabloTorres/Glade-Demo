import { Modal, ModalBody, ModalFooter, ModalHeader } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { AppButton } from "../ui/AppButton";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  busy = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");

  return (
    <Modal show={open} onClose={onCancel}>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-(--color-text-muted)">{message}</p>
      </ModalBody>
      <ModalFooter>
        <AppButton color="light" onClick={onCancel} disabled={busy}>
          {cancelLabel || t("actions.cancel")}
        </AppButton>
        <AppButton color={destructive ? "failure" : "indigo"} onClick={onConfirm} loading={busy}>
          {confirmLabel || t("actions.confirm")}
        </AppButton>
      </ModalFooter>
    </Modal>
  );
}
