import { Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { ChatPanelProvider, useChatPanel } from "../../chat/ChatPanelContext";
import { AppIcon } from "../atoms/AppIcon";
import { ChatPanel } from "./ChatPanel";
import { ModernFooter } from "./ModernFooter";
import { ModernHeader } from "./ModernHeader";
import { MobileNavigation } from "./navigation/MobileNavigation";
import { Sidebar } from "./navigation/Sidebar";

function ChatEntryPoint() {
  const { t } = useTranslation("ai");
  const { caseData, isOpen, openChat, closeChat } = useChatPanel();
  if (!caseData) return null;

  return (
    <>
      <Tooltip content={t("chat.title")} placement="left">
        <button
          type="button"
          aria-label={t("chat.openAssistant")}
          onClick={() => openChat()}
          // Sits above the mobile bottom bar (bottom-20) and returns to the
          // corner once that bar is gone at md+.
          className="glade-gradient fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl shadow-indigo-950/25 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft md:bottom-5"
        >
          <AppIcon name="chat" size={24} />
        </button>
      </Tooltip>
      <ChatPanel open={isOpen} onClose={closeChat} />
    </>
  );
}

/**
 * Authenticated layout: persistent sidebar column at md+ with (header, page
 * content, footer) stacked to its right. Below md the sidebar is replaced by
 * MobileNavigation — a persistent bottom bar plus an overflow Drawer — rather
 * than re-flowing the desktop column onto a phone.
 *
 * `pb-20 md:pb-0` on the scroll container reserves the bottom bar's height so
 * the last element of a page is never trapped underneath it.
 *
 * The footer renders in its `compact` variant here: this is an administrative
 * workspace, and a full multi-column footer under every case screen is
 * navigation the workflow never asks for. The legal disclaimer still appears,
 * because for a bankruptcy-preparation product that line is load-bearing, not
 * decoration — it is condensed, not dropped.
 */
export function AppShell() {
  return (
    <ChatPanelProvider>
      <div className="app-shell-background flex min-h-screen text-heading">
        <Sidebar />
        {/* `min-w-0` is load-bearing, not decoration. A flex item defaults to
            `min-width: auto`, which refuses to shrink below its content's
            intrinsic width — so one wide descendant (the attorney queue's
            table) pinned this column at ~1280px and pushed the whole page into
            horizontal scroll at every viewport below that, sidebar and header
            included. Allowing the column to shrink is what lets the inner
            `overflow-x-auto` containers actually do their job. */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-20 md:pb-0">
          <ModernHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <Outlet />
          </main>
          <ModernFooter variant="compact" />
        </div>
        <MobileNavigation />
        <ChatEntryPoint />
      </div>
    </ChatPanelProvider>
  );
}
