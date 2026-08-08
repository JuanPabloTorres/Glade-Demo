import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { bankruptcyApi } from "../../api/bankruptcyApi";
import type { BankruptcyCase, CaseAnalysis } from "../../types/bankruptcy";
import { localCompletion } from "../../workspace/caseMetrics";

export interface CaseAnalysisState {
  analysis: CaseAnalysis | null;
  error: string | null;
  /** Server score when the call succeeded, local estimate otherwise. */
  completion: number;
  requiredEvidence: string[];
  missingEvidenceCount: number;
  /**
   * Whether a given free-text requirement is already covered by an attached
   * document. Exposed as well as counted because the documents stage renders a
   * per-requirement tick, and re-deriving the same match in the page would make
   * the list and the count able to disagree.
   */
  requiredEvidencePresent: (requirement: string) => boolean;
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

  // `required_evidence` is free-text guidance from the backend ("Talones de pago
  // de los últimos 60 días"), while `evidence.evidenceType` stores the canonical
  // slug ("pay-stubs"). The comparison therefore runs against the *translated
  // label*, not the slug — matching the slug makes every requirement read as
  // missing. Words of five characters or fewer are skipped so that articles and
  // prepositions cannot produce a match on their own.
  const requiredEvidencePresent = (requirement: string) =>
    Boolean(
      caseData?.evidence.some((item) => {
        const label = t(`workspace:entryModal.evidenceTypes.${item.evidenceType}`).toLowerCase();
        return requirement
          .toLowerCase()
          .split(" ")
          .some((word) => word.length > 5 && label.includes(word));
      }),
    );

  const requiredEvidence = analysis?.required_evidence ?? [];

  return {
    analysis,
    error,
    completion: analysis?.completion_score ?? (caseData ? localCompletion(caseData) : 0),
    requiredEvidence,
    missingEvidenceCount: requiredEvidence.filter((item) => !requiredEvidencePresent(item)).length,
    requiredEvidencePresent,
  };
}
