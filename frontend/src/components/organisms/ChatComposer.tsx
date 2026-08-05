import { Button, Label, Textarea } from "flowbite-react";
import { type FormEvent } from "react";
import { AppIcon } from "../atoms/AppIcon";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  suggestedActions: string[];
  onSelectAction: (action: string) => void;
  busy: boolean;
}

export function ChatComposer({ value, onChange, onSubmit, suggestedActions, onSelectAction, busy }: ChatComposerProps) {
  return (
    <div className="border-t border-[var(--color-border)] pt-3">
      {suggestedActions.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestedActions.map((action) => (
            <Button key={action} size="xs" color="light" onClick={() => onSelectAction(action)}>{action}</Button>
          ))}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Label htmlFor="chat-composer-message" className="sr-only">Mensaje</Label>
        <Textarea
          id="chat-composer-message"
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ej. ¿Qué documentos me faltan?"
          className="flex-1"
        />
        <Button type="submit" className="glade-button shrink-0" disabled={busy || !value.trim()}>
          {busy ? <AppIcon name="calculator" size={16} className="mr-2 animate-spin" /> : null}
          {busy ? "Analizando…" : "Enviar"}
        </Button>
      </form>
    </div>
  );
}
