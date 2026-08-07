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
 *
 * Follows Flowbite's chat-bubble block: attribution row (sender + time) inside
 * the bubble, message body below it, and the action control as a sibling
 * outside the bubble. Two deliberate departures from that block:
 *
 * 1. **The sender/time row is always visible.** It used to be `opacity-0
 *    group-hover:opacity-100`, which put the timestamp — the only thing
 *    distinguishing two similar answers — behind a hover a touch user can
 *    never perform. Flowbite's block shows it unconditionally; so does this.
 * 2. **No dots dropdown.** The block wires a 5-item menu (Reply/Forward/Copy/
 *    Report/Delete); this app has exactly one action, so it keeps a single copy
 *    button wearing that button's styling. A menu holding one item would be
 *    inventing features the chat does not have.
 *
 * The user's own messages mirror the layout (avatar on the trailing side, the
 * flat corner facing their avatar) and use a solid brand fill with white text
 * — the same contrast convention the sidebar and footer active states follow,
 * never a tinted background paired with same-hue text.
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
    <div className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar
        rounded
        size="xs"
        placeholderInitials={isUser ? "Tú" : "IA"}
        className={isUser ? "shrink-0" : "shrink-0 [&>div]:bg-brand [&>div]:text-white"}
      />

      <div
        className={`flex max-w-[80%] flex-col p-4 ${
          isUser ? "rounded-s-base rounded-ee-base bg-brand" : "rounded-e-base rounded-es-base bg-neutral-secondary-soft"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold ${isUser ? "text-white" : "text-heading"}`}>
            {isUser ? t("chat.senderYou") : t("chat.senderAssistant")}
          </span>
          <span className={`text-sm ${isUser ? "text-white/75" : "text-body"}`}>
            {formatTime(message.createdAt, locale)}
          </span>
        </div>
        <p className={`py-2.5 text-sm leading-6 ${isUser ? "text-white" : "text-body"}`}>{message.content}</p>
      </div>

      <Tooltip content={copied ? t("chat.copied") : t("chat.copy")}>
        <button
          type="button"
          onClick={copy}
          aria-label={t("chat.copyToClipboard")}
          className="box-border inline-flex items-center self-center rounded-base border border-transparent bg-neutral-primary p-1.5 text-body hover:bg-neutral-tertiary hover:text-heading focus:outline-none focus:ring-4 focus:ring-neutral-tertiary"
        >
          <AppIcon name={copied ? "check" : "document"} size={16} />
        </button>
      </Tooltip>
    </div>
  );
}
