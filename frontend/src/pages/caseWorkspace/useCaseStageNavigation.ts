import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { isCaseSectionSlug, ROUTES } from "../../config/routes";
import {
  BASE_STAGE_ORDER,
  type CaseStage,
  SECTION_TO_STAGE,
  STAGE_TO_SECTION,
} from "./stages";

interface Options {
  caseId: string | undefined;
  /** The `:section` path parameter, exactly as the router produced it. */
  section: string | undefined;
  isAttorney: boolean;
}

export interface CaseStageNavigation {
  /** The stages this role can actually reach, in display order. */
  stageOrder: CaseStage[];
  /** The stage the URL is currently asking for. */
  activeStage: CaseStage;
  /** Every navigation goes through here, and every one changes the URL. */
  navigateToStage: (stage: CaseStage) => void;
}

/**
 * Stage navigation for the case workspace.
 *
 * Lifted out of `CaseWorkspacePage` unchanged in behaviour. Three rules were
 * buried in a 640-line component and are worth being able to test on their own:
 *
 * 1. **The URL is the single source of truth.** There is no `activeStage`
 *    state that could drift from it, so reload, back and forward behave
 *    identically to a click.
 * 2. **An unreachable stage falls back to the overview**, rather than
 *    rendering nothing. That covers an unknown slug and, importantly, a
 *    role-inappropriate one: a client deep-linked to `attorney-review` lands on
 *    the overview instead of an empty page.
 * 3. **`attorney-review` exists only for attorneys**, and this is the one place
 *    that appends it — so the stepper's index always matches what is actually
 *    rendered.
 */
export function useCaseStageNavigation({ caseId, section, isAttorney }: Options): CaseStageNavigation {
  const navigate = useNavigate();

  const stageOrder = useMemo<CaseStage[]>(
    () => (isAttorney ? [...BASE_STAGE_ORDER, "attorney-review"] : [...BASE_STAGE_ORDER]),
    [isAttorney],
  );

  const activeStage = useMemo<CaseStage>(() => {
    if (!isCaseSectionSlug(section)) return "start";
    const stage = SECTION_TO_STAGE[section];
    return stageOrder.includes(stage) ? stage : "start";
  }, [section, stageOrder]);

  const navigateToStage = useCallback(
    (stage: CaseStage) => {
      if (!caseId) return;
      const target = stageOrder.includes(stage) ? stage : "start";
      navigate(ROUTES.caseSection(caseId, STAGE_TO_SECTION[target]));
    },
    [stageOrder, caseId, navigate],
  );

  return { stageOrder, activeStage, navigateToStage };
}
