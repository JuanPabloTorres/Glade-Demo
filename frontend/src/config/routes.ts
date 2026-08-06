/**
 * Single source of truth for route paths. Sidebar nav, header links, and
 * router.tsx all read from here instead of inlining path strings, per the
 * "no magic strings for routes" constraint (AGENTS.md).
 */
export const ROUTES = {
  home: "/",
  about: "/about",
  login: "/login",
  case: (caseId: string) => `/case/${caseId}`,
} as const;

/**
 * Deep-link focus sections understood by CaseWorkspacePage's `?focus=`
 * query param (see FOCUS_PARAM_TO_STAGE in CaseWorkspacePage.tsx). Kept
 * here so the sidebar can link straight to a stage without duplicating the
 * raw string keys.
 */
export const CASE_FOCUS_SECTION = {
  evidence: "evidence",
  review: "review",
  timeline: "timeline",
} as const;

export function caseFocusUrl(caseId: string, focus: keyof typeof CASE_FOCUS_SECTION): string {
  return `${ROUTES.case(caseId)}?focus=${CASE_FOCUS_SECTION[focus]}`;
}
