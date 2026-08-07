import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { ASSISTANT_CASE_PARAM, assistantUrl } from "../config/routes";
import type { BankruptcyCase } from "../types/bankruptcy";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";

interface ChatPanelContextValue {
  /** The case the assistant is scoped to — null if none is resolvable (e.g. an attorney with no case open). */
  caseData: BankruptcyCase | null;
  /** Navigates to the assistant, optionally seeding the composer. */
  openAssistant: (prefill?: string) => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

/**
 * Resolves "which case is the assistant currently about" from route + role, so
 * every entry point agrees without each one re-deriving it.
 *
 * Scoping rule: the assistant is always case-bound — it needs case context to
 * reason about, and a contextless assistant has nothing to say. For a client
 * that is their own case; for an attorney it is whichever case is open.
 *
 * The assistant used to be a floating button opening a `Drawer`, with its
 * open/closed state held here. It is now a route (`/assistant`), so that state
 * is gone: the URL holds it. Three things follow that the drawer could not do —
 * the assistant survives a reload, participates in browser back/forward, and
 * can be linked to. It also stops being a second, parallel navigation surface
 * on mobile competing with the bottom bar's centre action, which now points at
 * the same place.
 *
 * A prefilled prompt travels as a query parameter for the same reason: it is
 * part of where the user is, not hidden state a refresh would silently drop.
 */
export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  // Resolution order: the case named in the URL (the assistant route's own
  // `?case=`, then a `/case/:id` path), and finally the client's own case. A
  // client can only ever reach their own, so the URL is never able to widen
  // their access — `caseData` is looked up in the workspace they already hold,
  // and the workspace is itself ownership-filtered server-side.
  const routeCaseId = useMemo(() => {
    const fromQuery = new URLSearchParams(location.search).get(ASSISTANT_CASE_PARAM);
    if (fromQuery) return fromQuery;
    return location.pathname.match(/^\/case\/([^/]+)/)?.[1] ?? null;
  }, [location.search, location.pathname]);

  const caseData = useMemo(() => {
    if (!user) return null;
    // A client's case comes from their account, never from the URL, so a
    // hand-edited `?case=` can't point their assistant at anyone else's case.
    if (user.role === "client") {
      return workspace.cases.find((item) => item.ownerUserId === user.id) ?? null;
    }
    if (!routeCaseId) return null;
    return workspace.cases.find((item) => item.id === routeCaseId) ?? null;
  }, [user, workspace.cases, routeCaseId]);

  const openAssistant = useCallback(
    (prefill?: string) => navigate(assistantUrl(prefill, caseData?.id ?? routeCaseId)),
    [navigate, caseData?.id, routeCaseId],
  );

  const value = useMemo(() => ({ caseData, openAssistant }), [caseData, openAssistant]);

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
}

export function useChatPanel(): ChatPanelContextValue {
  const context = useContext(ChatPanelContext);
  if (!context) throw new Error("useChatPanel must be used within a ChatPanelProvider");
  return context;
}
