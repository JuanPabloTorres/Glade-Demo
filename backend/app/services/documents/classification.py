from __future__ import annotations

# Mirrors frontend/src/config/bankruptcyOptions.ts's EVIDENCE_TYPES so a
# classified document maps onto the same evidence-type vocabulary the
# client/attorney UI already uses.
_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Identificación vigente": ("licencia", "pasaporte", "identificación", "cédula", "driver license"),
    "Talones de pago": ("talón de pago", "nómina", "salario bruto", "payroll", "earnings statement", "pay stub"),
    "Estado bancario": ("estado de cuenta", "bank statement", "balance disponible", "cuenta corriente"),
    "Planilla o transcripción contributiva": ("planilla", "hacienda", "irs", "tax return", "w-2", "1099"),
    "Estado de cuenta de acreedor": ("acreedor", "creditor statement", "balance adeudado"),
    "Contrato de arrendamiento": ("arrendamiento", "lease agreement", "contrato de alquiler"),
    "Estado hipotecario": ("hipoteca", "mortgage statement", "préstamo hipotecario"),
    "Estado de préstamo de vehículo": ("préstamo de vehículo", "auto loan", "financiamiento de vehículo"),
    "Demanda, embargo o notificación de cobro": ("demanda", "embargo", "collection notice", "lawsuit"),
    "Documento de propiedad o valoración": ("escritura", "tasación", "property deed", "appraisal"),
    "Certificado de orientación crediticia": ("orientación crediticia", "credit counseling certificate"),
}

_DEFAULT_LABEL = "Otro documento"


class DocumentClassifier:
    """
    Deterministic keyword classifier — no model, no network. Real semantic
    classification (via embeddings) is possible once EmbeddingService is
    backed by a real provider, but a keyword baseline is a reasonable,
    always-available default that never blocks ingestion.
    """

    def classify(self, text: str) -> str:
        folded = text.casefold()
        scores = {
            label: sum(1 for keyword in keywords if keyword in folded)
            for label, keywords in _KEYWORDS.items()
        }
        best_label = max(scores, key=lambda label: scores[label])
        return best_label if scores[best_label] > 0 else _DEFAULT_LABEL
