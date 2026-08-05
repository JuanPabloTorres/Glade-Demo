from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

DataProvenance = Literal["declared", "extracted", "calculated", "inference", "review_question"]
"""
Master instruction §7.7: every piece of information the assistant surfaces
must be distinguishable as one of these. `declared` = typed directly by the
client/attorney; `extracted` = read from a document (FinancialEvidenceExtractor,
Block 10); `calculated` = derived by BankruptcyAnalysisService's pandas math;
`inference` = a pattern the rule-based/model provider noticed but didn't
compute directly; `review_question` = something the assistant is asking the
human to confirm, not asserting. Used by FinancialEvidenceExtractor to tag
extracted values (see document_pipeline.py).
"""

_ELIGIBILITY_CLAIM = re.compile(
    r"(usted|tú|el cliente)\s+(califica|es elegible|cumple con los requisitos)",
    re.IGNORECASE,
)
_BEST_OPTION_CLAIM = re.compile(
    r"(chapter|cap[ií]tulo)\s*(7|13)\s*(es|ser[ií]a)\s+(la mejor opci[oó]n|lo mejor|la mejor alternativa|el mejor camino)",
    re.IGNORECASE,
)
_DEFINITIVE_ADVICE = re.compile(
    r"\b(debe|debes|tiene que|hay que)\s+(presentar|declararse en quiebra|elegir\s+(chapter|cap[ií]tulo))",
    re.IGNORECASE,
)

_REVIEW_CAVEAT = (
    "Esto requiere confirmación de un abogado autorizado antes de considerarse definitivo."
)


@dataclass
class GuardrailResult:
    message: str
    triggered: list[str] = field(default_factory=list)
    requires_attorney_review: bool = False


class ResponseGuardrails:
    """
    Applied to every provider's output before it reaches the client — master
    instruction §7.7. Three triggers, each independently detectable and
    tested (backend/tests/test_guardrails.py):

    1. Eligibility claims ("usted califica...") — never asserted, this app
       does not determine eligibility (product boundary, §1/§7.7).
    2. Chapter "best option" claims — chapter selection is never an
       automatic conclusion (§1).
    3. Definitive legal-advice imperatives ("debe presentar...") — organizing
       questions/information is the product; directives are not.

    Any trigger softens the offending phrase in place (not just appends a
    disclaimer — the plan explicitly calls for "reject/soften", and leaving
    the original absolute phrasing intact while merely appending a caveat
    elsewhere in the message would still read as a firm claim) and forces
    `requires_attorney_review = True`, regardless of the provider's own
    assessment.
    """

    def review(self, message: str) -> GuardrailResult:
        result = GuardrailResult(message=message)

        softened, count = _ELIGIBILITY_CLAIM.subn(
            "esto podría relacionarse con los requisitos aplicables (sujeto a revisión del abogado)",
            result.message,
        )
        if count:
            result.message = softened
            result.triggered.append("eligibility_claim")

        softened, count = _BEST_OPTION_CLAIM.subn(
            r"\1 \2 es una de las alternativas a evaluar con el abogado",
            result.message,
        )
        if count:
            result.message = softened
            result.triggered.append("chapter_best_option_claim")

        softened, count = _DEFINITIVE_ADVICE.subn(
            "conviene conversar con el abogado sobre",
            result.message,
        )
        if count:
            result.message = softened
            result.triggered.append("definitive_advice")

        if result.triggered:
            result.requires_attorney_review = True
            if _REVIEW_CAVEAT not in result.message:
                result.message = f"{result.message} {_REVIEW_CAVEAT}"

        return result
