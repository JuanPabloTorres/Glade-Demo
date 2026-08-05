import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";
import type { BankruptcyCase } from "../types/bankruptcy";

interface ChatPanelContextValue {
  /** The case the chat is currently scoped to — null if none is resolvable (e.g. attorney on the inbox). */
  caseData: BankruptcyCase | null;
  isOpen: boolean;
  prefill: string;
  openChat: (prefill?: string) => void;
  closeChat: () => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

/**
 * Master instruction §6.1: the chat must be a persistent, always-reachable
 * companion after login — not a tab buried inside a case. This provider
 * resolves "which case is the chat currently about" from route + role, so
 * a single floating entry point (rendered once in AppShell) works from the
 * dashboard, the case workspace, and everywhere else behind auth.
 *
 * Scoping rule: the chat is always case-bound (it needs case context per
 * §6.2 — id, financials, evidence, etc. — a contextless chat has nothing to
 * reason about). For a client, that's their own case. For an attorney,
 * that's whichever case is currently open (no case open → no chat entry
 * point, since there is nothing to be contextual about yet).
 */
export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState("");

  const caseData = useMemo(() => {
    if (!user) return null;
    if (user.role === "client") {
      return workspace.cases.find((item) => item.ownerUserId === user.id) ?? null;
    }
    const match = location.pathname.match(/^\/case\/([^/]+)/);
    if (!match) return null;
    return workspace.cases.find((item) => item.id === match[1]) ?? null;
  }, [user, workspace.cases, location.pathname]);

  const openChat = (nextPrefill?: string) => {
    if (nextPrefill) setPrefill(nextPrefill);
    setIsOpen(true);
  };
  const closeChat = () => setIsOpen(false);

  return (
    <ChatPanelContext.Provider value={{ caseData, isOpen, prefill, openChat, closeChat }}>
      {children}
    </ChatPanelContext.Provider>
  );
}

export function useChatPanel(): ChatPanelContextValue {
  const context = useContext(ChatPanelContext);
  if (!context) throw new Error("useChatPanel must be used within a ChatPanelProvider");
  return context;
}
