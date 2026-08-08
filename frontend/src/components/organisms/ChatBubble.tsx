import { Avatar } from "flowbite-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatTime } from "../../i18n/format";
import { IconButton } from "../ui/IconButton";
import { AppTooltip } from "../overlays/AppTooltip";
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
  // The "copied" confirmation reverts on a timer. Held in a ref and cancelled
  // on unmount because otherwise the callback runs against a component that no
  // longer exists: React warns in the browser, and under test the timer fires
  // after the environment is torn down, which Vitest reports as an unhandled
  // `ReferenceError: window is not defined` and exits non-zero. Cancelling
  // before re-scheduling also keeps rapid repeat clicks from stacking timers
  // that each clear the flag at a different moment.
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (revertTimer.current) clearTimeout(revertTimer.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      if (revertTimer.current) clearTimeout(revertTimer.current);
      revertTimer.current = setTimeout(() => setCopied(false), 1500);
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

      <AppTooltip content={copied ? t("chat.copied") : t("chat.copy")}>
        <IconButton
          onClick={copy}
          icon={copied ? "check" : "document"}
          label={t("chat.copyToClipboard")}
          size="sm"
          // Placement and ground, which are this row's business: the control is
          // centred against a bubble whose height it does not set, and it needs
          // its own background to stay visible on top of one.
          className="self-center bg-neutral-primary"
        />
      </AppTooltip>
    </div>
  );
}
