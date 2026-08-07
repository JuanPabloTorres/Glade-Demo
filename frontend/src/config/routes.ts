/**
 * Single source of truth for route paths. Sidebar nav, header links, and
 * router.tsx all read from here instead of inlining path strings, per the
 * "no magic strings for routes" constraint (AGENTS.md).
 */
export const ROUTES = {
  home: "/",
  about: "/about",
  help: "/help",
  login: "/login",
  case: (caseId: string) => `/case/${caseId}`,
} as const;

/**
 * Case sections a navigation entry can link straight to, as the `?focus=`
 * query param CaseWorkspacePage reads (see STAGE_QUERY_PARAM there).
 *
 * These are the canonical `CaseStage` keys, so a URL reads as the section it
 * opens — `/case/x?focus=documents` rather than the older `?focus=evidence`.
 * The page still resolves the legacy backend aliases (`evidence`, `timeline`,
 * `overview`, …) through FOCUS_PARAM_TO_STAGE, so links the assistant already
 * produced and any bookmarked URL keep working.
 */
export const CASE_FOCUS_SECTION = {
  documents: "documents",
  review: "review",
  tracking: "tracking",
} as const;

export function caseFocusUrl(caseId: string, focus: keyof typeof CASE_FOCUS_SECTION): string {
  return `${ROUTES.case(caseId)}?focus=${CASE_FOCUS_SECTION[focus]}`;
}
