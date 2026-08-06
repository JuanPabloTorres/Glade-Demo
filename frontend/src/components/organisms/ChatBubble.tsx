import { Avatar, Tooltip } from "flowbite-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatTime } from "../../i18n/format";
import { AppIcon } from "../atoms/AppIcon";
import type { ChatMessage } from "../../types/bankruptcy";

interface ChatBubbleProps {
  message: ChatMessage;
}

/**
 * Single chat message, master instruction §16: avatar, timestamp, origin
 * indicator, copy action. Extracted from the raw inline `<div>` markup
 * CaseWorkspacePage used to render directly (Block 4/7 audit finding).
 */
export function ChatBubble({ message }: ChatBubbleProps) {
  const { t } = useTranslation("ai");
  const { locale } = useLanguage();
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; failing silently is
      // acceptable here — the message text remains visible and selectable.
    }
  };

  return (
    <div className={`group flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar
        rounded
        size="xs"
        placeholderInitials={isUser ? "Tú" : "IA"}
        className={isUser ? "" : "shrink-0 [&>div]:bg-indigo-600 [&>div]:text-white"}
      />
      <div className={`flex max-w-[80%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            isUser ? "bg-[#111111] text-white" : "border border-(--color-border) bg-(--color-surface-muted) text-(--color-text)"
          }`}
        >
          {message.content}
        </div>
        <div className="flex items-center gap-2 px-1 text-[11px] text-(--color-text-muted) opacity-0 transition-opacity group-hover:opacity-100">
          <span>{formatTime(message.createdAt, locale)}</span>
          <Tooltip content={copied ? t("chat.copied") : t("chat.copy")}>
            <button type="button" onClick={copy} aria-label={t("chat.copyToClipboard")} className="hover:text-(--color-text)">
              <AppIcon name={copied ? "check" : "document"} size={13} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
