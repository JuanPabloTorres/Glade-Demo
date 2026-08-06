import { Label, Textarea } from "flowbite-react";
import { type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { AssistantAction } from "../../types/bankruptcy";
import { AppIcon } from "../atoms/AppIcon";
import { AppButton } from "../ui/AppButton";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  suggestedActions: AssistantAction[];
  onSelectAction: (action: AssistantAction) => void;
  busy: boolean;
}

export function ChatComposer({ value, onChange, onSubmit, suggestedActions, onSelectAction, busy }: ChatComposerProps) {
  const { t } = useTranslation("ai");

  return (
    <div className="border-t border-(--color-border) pt-3">
      {suggestedActions.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestedActions.map((action) => (
            <AppButton key={action.id} size="xs" color="light" onClick={() => onSelectAction(action)}>{action.label}</AppButton>
          ))}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Label htmlFor="chat-composer-message" className="sr-only">{t("chat.inputLabel")}</Label>
        <Textarea
          id="chat-composer-message"
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("chat.inputPlaceholder")}
          className="flex-1"
        />
        <AppButton type="submit" className="glade-button shrink-0" disabled={busy || !value.trim()}>
          {busy ? <AppIcon name="calculator" size={16} className="mr-2 animate-spin" /> : null}
          {busy ? t("chat.analyzing") : t("chat.send")}
        </AppButton>
      </form>
    </div>
  );
}
