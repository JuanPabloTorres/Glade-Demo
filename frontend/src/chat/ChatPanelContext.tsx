import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { ASSISTANT_CASE_PARAM } from "../config/routes";
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
  /**
   * Opens the assistant, optionally seeding the composer.
   *
   * An alias of `openPanel`, kept as its own name because the call sites read
   * as intent ("ask the assistant about expenses") rather than as panel
   * mechanics. It used to navigate to `/assistant`, which took the user away
   * from the very section they were asking about.
   */
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
 * The assistant is a panel over the current page, and `status` here is what
 * holds it open. It spent a release as a route (`/assistant`) to gain a URL,
 * and the cost outweighed it: opening the assistant meant leaving the screen
 * you wanted to ask about, and the route existing alongside the panel gave the
 * product two entry points that behaved differently. `/assistant` now
 * redirects into the panel, so the links that were worth having still work.
 */
export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const workspace = useBankruptcyWorkspace();
  const location = useLocation();

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

  const [status, setStatus] = useState<AssistantStatus>("closed");
  const [panelPrefill, setPanelPrefill] = useState("");

  const openPanel = useCallback((prefill?: string) => {
    if (prefill) setPanelPrefill(prefill);
    setStatus("open");
  }, []);

  // The same thing, under the name the call sites already use. Opening the
  // assistant no longer moves the user: a section card that asks "which
  // documents am I missing?" now gets its answer beside the section it asked
  // about, instead of navigating to a page that had to be told which case and
  // which section it had come from.
  const openAssistant = openPanel;
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
