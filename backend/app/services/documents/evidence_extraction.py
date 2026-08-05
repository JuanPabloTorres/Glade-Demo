from __future__ import annotations

import re
from dataclasses import dataclass

from app.ai.guardrails import DataProvenance

_AMOUNT_PATTERN = re.compile(r"\$\s?([\d][\d,]*\.?\d{0,2})")


@dataclass
class ExtractedAmount:
    """A dollar amount found in document text — always tagged `extracted`, per §7.7's provenance taxonomy."""

    label: str
    amount: float
    provenance: DataProvenance = "extracted"


class FinancialEvidenceExtractor:
    """
    Finds candidate dollar amounts in extracted document text. Deliberately
    simple (regex over `$1,234.56`-style amounts) — this surfaces candidates
    for a human (client or attorney) to confirm and link to a declared
    figure, it does not assert that a candidate amount is correct or
    complete. Every extracted value carries provenance="extracted" so the
    frontend can visually distinguish it from a declared or calculated
    figure (§7.7).
    """

    def extract_amounts(self, text: str) -> list[ExtractedAmount]:
        amounts: list[ExtractedAmount] = []
        for match in _AMOUNT_PATTERN.finditer(text):
            raw = match.group(1).replace(",", "")
            try:
                value = float(raw)
            except ValueError:
                continue
            amounts.append(ExtractedAmount(label="Monto detectado", amount=round(value, 2)))
        return amounts
