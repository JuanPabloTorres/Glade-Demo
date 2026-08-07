/**
 * Single source of truth for route paths. Navigation config, page links and
 * router.tsx all read from here instead of inlining path strings, per the
 * "no magic strings for routes" constraint (AGENTS.md).
 */
export const ROUTES = {
  home: "/",
  about: "/about",
  help: "/help",
  assistant: "/assistant",
  login: "/login",
  case: (caseId: string) => `/case/${caseId}`,
  caseSection: (caseId: string, section: CaseSectionSlug) => `/case/${caseId}/${section}`,
} as const;

/**
 * The URL vocabulary for the case workspace's sections.
 *
 * These are real path segments, not query parameters, and that distinction is
 * the entire point. The previous design linked to `/case/:id?focus=evidence`
 * and the workspace page consumed the parameter and immediately deleted it
 * (`setSearchParams(next, { replace: true })`). Three things broke as a result:
 * the entry never held an active state, a reload dropped the user back on the
 * overview, and clicking the same entry twice produced an identical URL — so
 * React Router had no navigation to perform and the app appeared frozen.
 *
 * With a path segment the URL *is* the state: it survives reload, participates
 * in browser back/forward, and can be compared for an active highlight.
 *
 * The slugs are the user-facing vocabulary, deliberately not the internal
 * `CaseStage` keys they resolve to — "tasks" reads better in a URL than the
 * internal "review" stage it opens.
 */
export const CASE_SECTION = {
  overview: "overview",
  household: "household",
  income: "income",
  expenses: "expenses",
  debts: "debts",
  assets: "assets",
  documents: "documents",
  tasks: "tasks",
  submitted: "submitted",
  activity: "activity",
  attorneyReview: "attorney-review",
} as const;

export type CaseSectionSlug = (typeof CASE_SECTION)[keyof typeof CASE_SECTION];

export function isCaseSectionSlug(value: string | undefined): value is CaseSectionSlug {
  return Boolean(value) && (Object.values(CASE_SECTION) as string[]).includes(value as string);
}

/**
 * The backend's `GuidanceResponseDto.focus_section` vocabulary (see
 * backend/app/schemas/assistant.py) predates these slugs and is part of an API
 * contract, so it is translated here rather than changed. Legacy `?focus=`
 * links — including any a user bookmarked — resolve through this map and are
 * redirected to the canonical section path by CaseWorkspacePage.
 */
export const FOCUS_PARAM_TO_SECTION: Record<string, CaseSectionSlug> = {
  overview: CASE_SECTION.overview,
  household: CASE_SECTION.household,
  "income-expenses": CASE_SECTION.income,
  "debts-assets": CASE_SECTION.debts,
  evidence: CASE_SECTION.documents,
  review: CASE_SECTION.tasks,
  timeline: CASE_SECTION.activity,
  "attorney-review": CASE_SECTION.attorneyReview,
  "chapter-comparison": CASE_SECTION.overview,
};

/** Query parameter carrying a pre-filled prompt into the assistant page. */
export const ASSISTANT_PROMPT_PARAM = "prompt";

/**
 * Which case the assistant should reason about. A client always has exactly one
 * and it is resolved from their account, so this is really for the attorney,
 * who works across cases: it keeps the case they had open when they left for
 * the assistant, instead of the assistant silently losing its context the
 * moment the path stops being `/case/:id`.
 */
export const ASSISTANT_CASE_PARAM = "case";

export function assistantUrl(prompt?: string, caseId?: string | null): string {
  const params = new URLSearchParams();
  if (caseId) params.set(ASSISTANT_CASE_PARAM, caseId);
  if (prompt) params.set(ASSISTANT_PROMPT_PARAM, prompt);
  const query = params.toString();
  return query ? `${ROUTES.assistant}?${query}` : ROUTES.assistant;
}

/** Attorney dashboard filter deep-links (`/?view=urgent`). */
export const ATTORNEY_VIEW_PARAM = "view";

export function attorneyViewUrl(view: string): string {
  return `${ROUTES.home}?${ATTORNEY_VIEW_PARAM}=${view}`;
}
