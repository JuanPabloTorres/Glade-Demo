import { CASE_SECTION, type CaseSectionSlug } from "../../config/routes";

/**
 * The workspace's stage vocabulary.
 *
 * Extracted from `CaseWorkspacePage` unchanged. It lived there because that was
 * the only consumer, but it is not page state: it is the mapping between the
 * URL's section slugs and the stages the workspace renders, and the page, its
 * navigation hook and its tests all need it. A module that owns the vocabulary
 * is what lets the navigation logic be tested without mounting the page.
 */

/**
 * Stable, position-independent identifiers for every stage of the workspace.
 * Nothing anywhere encodes a stage as a positional number: the stepper's
 * displayed index is always *derived* from a stage's position in
 * `BASE_STAGE_ORDER`, so reordering a stage can never desync a shortcut or a
 * deep-link from the stage it is supposed to open.
 */
export type CaseStage =
  | "start"
  | "household"
  | "income"
  | "expenses"
  | "debts"
  | "assets"
  | "documents"
  | "review"
  | "submitted"
  | "tracking"
  | "attorney-review";

/**
 * Order of the always-present stages, matching the stage-content order in the
 * page. "attorney-review" is appended conditionally — see
 * `useCaseStageNavigation`, which is the only place that adds it.
 */
export const BASE_STAGE_ORDER: readonly CaseStage[] = [
  "start",
  "household",
  "income",
  "expenses",
  "debts",
  "assets",
  "documents",
  "review",
  "submitted",
  "tracking",
];

/**
 * Maps the URL's section slug to the internal stage it opens, and back. Two
 * vocabularies on purpose: the URL is user-facing and stable, while `CaseStage`
 * is an implementation detail free to be renamed. "tasks" and "activity" read
 * better in a URL than the "review" and "tracking" stages they resolve to.
 *
 * A name alias, never a position map — nothing here encodes an index, so it
 * cannot go stale when `BASE_STAGE_ORDER` is reordered.
 */
export const SECTION_TO_STAGE: Record<CaseSectionSlug, CaseStage> = {
  [CASE_SECTION.overview]: "start",
  [CASE_SECTION.household]: "household",
  [CASE_SECTION.income]: "income",
  [CASE_SECTION.expenses]: "expenses",
  [CASE_SECTION.debts]: "debts",
  [CASE_SECTION.assets]: "assets",
  [CASE_SECTION.documents]: "documents",
  [CASE_SECTION.tasks]: "review",
  [CASE_SECTION.submitted]: "submitted",
  [CASE_SECTION.activity]: "tracking",
  [CASE_SECTION.attorneyReview]: "attorney-review",
};

export const STAGE_TO_SECTION = Object.fromEntries(
  Object.entries(SECTION_TO_STAGE).map(([section, stage]) => [stage, section as CaseSectionSlug]),
) as Record<CaseStage, CaseSectionSlug>;

/**
 * Every `CaseStage` to its i18n key — the single, stable place associating a
 * stage identity with its display label. Looked up by stage key, not by array
 * position, so it cannot go stale when `BASE_STAGE_ORDER` is reordered. Reuses
 * the existing `workspace:tabs.*` keys rather than introducing new ones for the
 * same ten labels.
 */
export const STAGE_LABEL_KEYS: Record<CaseStage, string> = {
  start: "workspace:tabs.start",
  household: "workspace:tabs.household",
  income: "workspace:tabs.income",
  expenses: "workspace:tabs.expenses",
  debts: "workspace:tabs.debts",
  assets: "workspace:tabs.assets",
  documents: "workspace:tabs.documents",
  review: "workspace:tabs.review",
  submitted: "workspace:tabs.submitted",
  tracking: "workspace:tabs.tracking",
  "attorney-review": "workspace:tabs.attorneyReview",
};
