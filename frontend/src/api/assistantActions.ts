import type { AssistantAction } from "../types/bankruptcy";

/**
 * Client-side allow-list for assistant actions (ADR 0002).
 *
 * The backend already drops actions naming an unknown resource
 * (`AgentRuntime._allowed_actions`). This is the same check on the other
 * side of the wire, deliberately duplicated: neither end should be the only
 * thing standing between a model-authored string and a navigation target.
 *
 * Keep in sync with `ALLOWED_ACTION_RESOURCES` in
 * `backend/app/ai/contracts/assistant_response.py`.
 */
export const ASSISTANT_ACTION_RESOURCES = [
  "overview",
  "household",
  "income-expenses",
  "debts-assets",
  "evidence",
  "timeline",
  "review",
  "chapter-comparison",
  "attorney-review",
] as const;

export type AssistantActionResource = (typeof ASSISTANT_ACTION_RESOURCES)[number];

const RESOURCES = new Set<string>(ASSISTANT_ACTION_RESOURCES);

export function isAllowedAssistantAction(action: AssistantAction): boolean {
  return RESOURCES.has(action.resource);
}

/**
 * Drop anything the model invented before it reaches the UI.
 *
 * Dropped, never coerced to a default: an action with an invented target has
 * not established what the user wants, and silently rewriting it to
 * "overview" would render a button that goes somewhere nobody asked for.
 */
export function allowedAssistantActions(actions: AssistantAction[]): AssistantAction[] {
  return actions.filter(isAllowedAssistantAction);
}

/**
 * Build the workspace link for an action.
 *
 * Returns null rather than a partial URL for a disallowed resource, so a
 * caller cannot accidentally navigate with an unvalidated string. The
 * assistant never supplies a path — only a section name from the list above —
 * so there is no way for it to emit an arbitrary route.
 */
export function assistantActionHref(caseId: string, action: AssistantAction): string | null {
  if (!isAllowedAssistantAction(action)) return null;
  return `/case/${encodeURIComponent(caseId)}?focus=${encodeURIComponent(action.resource)}`;
}
