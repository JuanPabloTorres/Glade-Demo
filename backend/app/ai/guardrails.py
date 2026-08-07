from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

from app.core.i18n import Language

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

# -- claims that must be softened -------------------------------------------
#
# Each pattern matches both languages. Until 4.2.0 they were Spanish-only, so
# an English session had no eligibility guard and no advice guard at all: the
# product boundary held for `es` and was simply absent for `en`. The live agent
# run surfaced this indirectly — the model answers in whatever language it is
# asked in, and nothing downstream was reading English.

_ELIGIBILITY_CLAIM = re.compile(
    r"(usted|t[uú]|el cliente)\s+(califica|es elegible|cumple con los requisitos)"
    r"|(you|the client)\s+(qualify|qualifies|are eligible|is eligible|meet the requirements|meets the requirements)",
    re.IGNORECASE,
)
_BEST_OPTION_CLAIM = re.compile(
    r"(chapter|cap[ií]tulo)\s*(7|13)\s*"
    r"(?:(?:es|ser[ií]a)\s+(?:la mejor opci[oó]n|lo mejor|la mejor alternativa|el mejor camino)"
    r"|(?:is|would be)\s+(?:the best option|best|the best alternative|the best path))",
    re.IGNORECASE,
)
_DEFINITIVE_ADVICE = re.compile(
    r"\b(?:debe|debes|tiene que|hay que)\s+(?:presentar|declararse en quiebra|elegir\s+(?:chapter|cap[ií]tulo))"
    r"|\b(?:you\s+(?:should|must|need to)|you\s+have to)\s+(?:file|declare bankruptcy|choose\s+(?:chapter|cap[ií]tulo))",
    re.IGNORECASE,
)

_SOFTENED_ELIGIBILITY: dict[Language, str] = {
    "es": "esto podría relacionarse con los requisitos aplicables (sujeto a revisión del abogado)",
    "en": "this may relate to the applicable requirements (subject to attorney review)",
}
_SOFTENED_BEST_OPTION: dict[Language, str] = {
    "es": r"\1 \2 es una de las alternativas a evaluar con el abogado",
    "en": r"\1 \2 is one of the alternatives to weigh with the attorney",
}
_SOFTENED_ADVICE: dict[Language, str] = {
    "es": "conviene conversar con el abogado sobre",
    "en": "it is worth discussing with the attorney whether to",
}

# -- answers that decline to advise ------------------------------------------
#
# These are not softened. The message is already the *right* answer — it
# declines and routes to a professional. What was wrong is that it came back
# with `requires_attorney_review: false`, which is exactly backwards: an answer
# that says "I cannot tell you, ask your lawyer" is the clearest possible signal
# that a lawyer has to look. The live run produced one verbatim: "No podemos
# determinar si debes declararte en bancarrota o no. Por favor, habla con tu
# abogado."
#
# Deliberately narrow. Matching the bare word "abogado"/"attorney" would fire on
# nearly every answer this product gives, since routing questions to the
# attorney is its whole purpose. Only a *declination* or a direct *referral
# imperative* counts.

_DECLINES_TO_ANSWER = re.compile(
    r"\bno\s+(?:podemos|puedo|es posible)\s+(?:determinar|decidir|confirmar|establecer)"
    r"|\bno\s+(?:me\s+)?corresponde\s+(?:determinar|decidir)"
    r"|\b(?:we|i)\s+(?:can(?:'|no)?t|cannot|are unable to|am unable to)\s+(?:determine|decide|confirm|establish|tell you)",
    re.IGNORECASE,
)
_REFERS_TO_ATTORNEY = re.compile(
    r"\b(?:habla|hable|consulta|consulte|comun[ií]cate|comun[ií]quese)\s+"
    r"(?:con\s+)?(?:tu|su|un|una|el|la)?\s*(?:abogad[oa]|representante legal)"
    r"|\b(?:talk|speak|consult|check)\s+(?:to|with)?\s*(?:your|an|a|the)?\s*(?:attorney|lawyer|legal counsel)",
    re.IGNORECASE,
)

_REVIEW_CAVEAT: dict[Language, str] = {
    "es": "Esto requiere confirmación de un abogado autorizado antes de considerarse definitivo.",
    "en": "This requires confirmation from a licensed attorney before it can be considered final.",
}


@dataclass
class GuardrailResult:
    message: str
    triggered: list[str] = field(default_factory=list)
    requires_attorney_review: bool = False


class ResponseGuardrails:
    """
    Applied to every provider's output before it reaches the client — master
    instruction §7.7. Two families of trigger, and the difference between them
    is the point:

    **Softening triggers** rewrite the offending phrase in place and force
    `requires_attorney_review`:

    1. Eligibility claims ("usted califica…" / "you qualify…") — never
       asserted; this app does not determine eligibility (§1/§7.7).
    2. Chapter "best option" claims — chapter selection is never an automatic
       conclusion (§1).
    3. Definitive legal-advice imperatives ("debe presentar…" / "you must
       file…") — organizing questions and information is the product;
       directives are not.

    The phrase is rewritten rather than merely annotated: the plan calls for
    "reject/soften", and leaving an absolute claim intact while appending a
    caveat elsewhere still reads as a firm claim.

    **Review triggers** change nothing about the message and only raise
    `requires_attorney_review`:

    4. An answer that declines to determine something, or refers the user to
       their attorney. Such an answer is already correct — it is also, by
       definition, one a human has to pick up, and it previously came back
       flagged `false`.

    Every user-visible string is chosen by `language`, so an English session
    stops receiving Spanish caveats and Spanish replacement clauses.
    """

    def review(self, message: str, *, language: Language = "es") -> GuardrailResult:
        result = GuardrailResult(message=message)

        softened, count = _ELIGIBILITY_CLAIM.subn(
            _SOFTENED_ELIGIBILITY[language],
            result.message,
        )
        if count:
            result.message = softened
            result.triggered.append("eligibility_claim")

        softened, count = _BEST_OPTION_CLAIM.subn(
            _SOFTENED_BEST_OPTION[language],
            result.message,
        )
        if count:
            result.message = softened
            result.triggered.append("chapter_best_option_claim")

        softened, count = _DEFINITIVE_ADVICE.subn(
            _SOFTENED_ADVICE[language],
            result.message,
        )
        if count:
            result.message = softened
            result.triggered.append("definitive_advice")

        if result.triggered:
            result.requires_attorney_review = True
            caveat = _REVIEW_CAVEAT[language]
            if caveat not in result.message:
                result.message = f"{result.message} {caveat}"

        # Checked against the original message, not the softened one, so a
        # replacement clause that happens to mention the attorney cannot
        # trigger this by itself.
        if _DECLINES_TO_ANSWER.search(message):
            result.triggered.append("declines_to_answer")
            result.requires_attorney_review = True
        if _REFERS_TO_ATTORNEY.search(message):
            result.triggered.append("refers_to_attorney")
            result.requires_attorney_review = True

        return result
