import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { bankruptcyApi } from "../../api/bankruptcyApi";
import type { BankruptcyCase, CaseAnalysis, EvidenceRequirement } from "../../types/bankruptcy";
import { localCompletion } from "../../workspace/caseMetrics";

export interface CaseAnalysisState {
  analysis: CaseAnalysis | null;
  error: string | null;
  /** Server score when the call succeeded, local estimate otherwise. */
  completion: number;
  /**
   * The evidence checklist with each line's tick already decided server-side.
   * The documents stage renders these and nothing else derives the same answer
   * a second time, so the ticks, the count and `evidence_score` agree by
   * construction.
   */
  evidenceRequirements: EvidenceRequirement[];
  missingEvidenceCount: number;
}

/**
 * The backend's read of the case, plus the two things the page derives from it.
 *
 * Kept as one hook rather than three because `completion` and the evidence
 * counts are not independent facts — they are different readings of the same
 * response, and splitting them would mean either fetching twice or threading
 * the response back out to be re-derived.
 *
 * The request cancels on unmount and on a case change through the `active`
 * flag: without it a slow response for the previous case can land after the
 * user has already opened another one and overwrite it.
 */
export function useCaseAnalysis(caseData: BankruptcyCase | undefined): CaseAnalysisState {
  const { t } = useTranslation(["workspace"]);
  const [analysis, setAnalysis] = useState<CaseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseData) return;
    let active = true;
    setError(null);
    bankruptcyApi
      .analyze(caseData)
      .then((result) => active && setAnalysis(result))
      .catch(() => active && setError(t("workspace:header.analysisError")));
    return () => {
      active = false;
    };
  }, [caseData, t]);

  // Which document type satisfies which requirement is a business rule, and it
  // lives on the server (`EVIDENCE_REQUIREMENT_TYPES`). This used to intersect
  // the requirement's words with the evidence type's translated label, which
  // disagreed with the server's own matching in Spanish and stopped working
  // altogether once the requirements were translated — an English requirement
  // shares no words with a Spanish label.
  //
  // `required_evidence` is the fallback for a backend older than 4.11.0: the
  // lines still render, with no tick, rather than the checklist disappearing.
  const evidenceRequirements: EvidenceRequirement[] =
    analysis?.evidence_requirements ??
    (analysis?.required_evidence ?? []).map((label) => ({ key: label, label, satisfied: false }));

  return {
    analysis,
    error,
    completion: analysis?.completion_score ?? (caseData ? localCompletion(caseData) : 0),
    evidenceRequirements,
    missingEvidenceCount: evidenceRequirements.filter((item) => !item.satisfied).length,
  };
}
