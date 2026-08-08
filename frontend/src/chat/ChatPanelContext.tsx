import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { ASSISTANT_CASE_PARAM, assistantUrl } from "../config/routes";
import type { AssistantScope, BankruptcyCase } from "../types/bankruptcy";
import { useBankruptcyWorkspace } from "../workspace/BankruptcyWorkspaceContext";

/**
 * Panel lifecycle. `minimized` is a distinct state from `closed` on purpose:
 * closing is "I am done", minimizing is "keep this, I need the page" — and the
 * two must not collapse into one, or minimizing throws away a conversation the
 * user intended to come back to.
 */
export type AssistantStatus = "closed" | "open" | "minimized";

/**
 * What the assistant knows about where the user is, derived from the route.
 *
 * This is the whole "assistant receives context from the current area"
 * mechanism. It is read from the URL in this provider rather than pushed up by
 * each page, so no page has to know the assistant exists and none of them can
 * disagree about what is currently open.
 */
export interface AssistantRouteContext {
  route: string;
  entityType: "case" | null;
  entityId: string | null;
  /** Case-workspace section slug (`documents`, `debts`, …) when on one. */
  section: string | null;
}

/**
 * Which surface the question is being asked from.
 *
 * Derived from the route the user is actually on, not from the words they
 * typed: the UI already knows whether it is showing a case workspace or the
 * attorney's queue, and a keyword classifier would get "¿qué le falta a este
 * caso?" and "¿cuáles necesitan atención?" wrong in both directions.
 *
 * Only an attorney standing outside a case is asking a portfolio question — a
 * client has one case and never has a queue, and anyone inside a case
 * workspace is asking about that case. The server pairs this with the
 * authenticated role before it means anything, so a wrong answer here narrows
 * or widens *nothing*: it can only pick between scopes the session already
 * allows.
 */
function resolveAssistantScope(
  role: string | undefined,
  routeContext: AssistantRouteContext,
): AssistantScope {
  if (role !== "attorney") return "case";
  return routeContext.entityType === "case" ? "case" : "portfolio";
}

interface ChatPanelContextValue {
  /** The case the assistant is scoped to — null if none is resolvable (e.g. an attorney with no case open). */
  caseData: BankruptcyCase | null;
  /** Navigates to the assistant page, optionally seeding the composer. */
  openAssistant: (prefill?: string) => void;
  /** Where the user currently is, for the assistant to reason about. */
  routeContext: AssistantRouteContext;
  /** Which authorized scope the server should build for this turn. */
  assistantScope: AssistantScope;
  status: AssistantStatus;
  /** Opens the global panel in place — no navigation. Optionally seeds the composer. */
  openPanel: (prefill?: string) => void;
  minimizePanel: () => void;
  closePanel: () => void;
  /** Composer seed handed to the panel when it is opened from a suggestion. */
  panelPrefill: string;
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

  const [status, setStatus] = useState<AssistantStatus>("closed");
  const [panelPrefill, setPanelPrefill] = useState("");

  const openPanel = useCallback((prefill?: string) => {
    if (prefill) setPanelPrefill(prefill);
    setStatus("open");
  }, []);
  const minimizePanel = useCallback(() => setStatus("minimized"), []);
  const closePanel = useCallback(() => setStatus("closed"), []);

  // Derived, not stored: the route is already the source of truth for where
  // the user is, so there is nothing here to keep in sync.
  const routeContext = useMemo<AssistantRouteContext>(() => {
    const caseMatch = location.pathname.match(/^\/case\/([^/]+)(?:\/([^/]+))?/);
    return {
      route: location.pathname,
      entityType: caseMatch ? "case" : null,
      entityId: caseMatch?.[1] ?? null,
      section: caseMatch?.[2] ?? null,
    };
  }, [location.pathname]);

  const assistantScope = useMemo(
    () => resolveAssistantScope(user?.role, routeContext),
    [user?.role, routeContext],
  );

  const value = useMemo(
    () => ({ caseData, openAssistant, routeContext, assistantScope, status, openPanel, minimizePanel, closePanel, panelPrefill }),
    [caseData, openAssistant, routeContext, assistantScope, status, openPanel, minimizePanel, closePanel, panelPrefill],
  );

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
}

export function useChatPanel(): ChatPanelContextValue {
  const context = useContext(ChatPanelContext);
  if (!context) throw new Error("useChatPanel must be used within a ChatPanelProvider");
  return context;
}
