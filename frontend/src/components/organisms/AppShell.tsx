import { Drawer, Tooltip } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { ChatPanelProvider, useChatPanel } from "../../chat/ChatPanelContext";
import { AppIcon } from "../atoms/AppIcon";
import { ChatPanel } from "./ChatPanel";
import { ModernFooter } from "./ModernFooter";
import { ModernHeader } from "./ModernHeader";

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
          className="glade-gradient fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl shadow-indigo-950/25 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
        >
          <AppIcon name="chat" size={24} />
        </button>
      </Tooltip>
      <Drawer open={isOpen} onClose={closeChat} position="right" className="w-full p-0 sm:max-w-sm md:max-w-md">
        <ChatPanel onClose={closeChat} />
      </Drawer>
    </>
  );
}

export function AppShell() {
  return (
    <ChatPanelProvider>
      <div className="app-shell-background flex min-h-screen flex-col text-(--color-text)">
        <ModernHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <Outlet />
        </main>
        <ModernFooter />
        <ChatEntryPoint />
      </div>
    </ChatPanelProvider>
  );
}
