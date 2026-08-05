from __future__ import annotations

from typing import TYPE_CHECKING

from app.ai.providers.base import GuidanceDraft

if TYPE_CHECKING:
    from app.schemas.assistant import CaseContextDto


class RuleBasedProvider:
    """
    Deterministic provider — no network, no model weights, always
    available. Operates only on the reduced `CaseContextDto`, not the raw
    case (see BaseAIProvider). Default provider (`AI_PROVIDER` unset or
    `rule_based`) and the safe fallback every other provider wraps.
    """

    def is_available(self) -> bool:
        return True

    def generate(self, *, context: CaseContextDto, message: str) -> GuidanceDraft:
        folded = message.casefold()

        if "capítulo 7" in folded or "chapter 7" in folded:
            return GuidanceDraft(
                message=(
                    "Chapter 7 suele enfocarse en liquidación y descarga de deudas elegibles, pero "
                    "requiere revisar means test, bienes, exenciones y transacciones recientes con "
                    "un abogado."
                ),
                intent="chapter_comparison",
                suggested_actions=context.chapter_7_questions[:3],
                focus_section="chapter-comparison",
                requires_attorney_review=True,
            )
        if "capítulo 13" in folded or "chapter 13" in folded:
            return GuidanceDraft(
                message=(
                    "Chapter 13 permite proponer un plan de pagos de tres a cinco años para una "
                    "persona con ingreso regular. La viabilidad depende de datos completos y "
                    "revisión legal."
                ),
                intent="chapter_comparison",
                suggested_actions=context.chapter_13_questions[:3],
                focus_section="chapter-comparison",
                requires_attorney_review=True,
            )

        if context.role == "attorney":
            if context.warnings:
                return GuidanceDraft(
                    message=(
                        f"El expediente tiene {len(context.warnings)} alerta(s) prioritaria(s). "
                        "Revise evidencia, urgencias de cobro y consistencia financiera antes de la "
                        "consulta."
                    ),
                    intent="attorney_summary",
                    suggested_actions=context.warnings[:3],
                    focus_section="attorney-review",
                    warnings=context.warnings,
                    requires_attorney_review=True,
                )
            return GuidanceDraft(
                message=(
                    "El expediente está organizado para revisión profesional. Confirme formularios, "
                    "means test vigente, exenciones y preguntas pendientes antes de definir "
                    "estrategia."
                ),
                intent="attorney_summary",
                suggested_actions=context.discussion_points[:3],
                focus_section="attorney-review",
                requires_attorney_review=True,
            )

        if context.missing_items:
            first = context.missing_items[0]
            return GuidanceDraft(
                message=(
                    f"El próximo paso es completar {first.lower()}. Después vincularemos evidencia y "
                    "actualizaremos el resumen financiero automáticamente."
                ),
                intent="next_step",
                suggested_actions=context.next_steps,
                focus_section=_section_for_missing(first),
                requested_fields=[first],
            )

        if context.status in {"draft", "collecting_information"}:
            return GuidanceDraft(
                message=(
                    "La plantilla financiera está completa. Revise acreedores, bienes y documentos "
                    "antes de enviar la solicitud al abogado."
                ),
                intent="pre_submission_review",
                suggested_actions=context.next_steps,
                focus_section="review",
            )

        return GuidanceDraft(
            message=(
                "La solicitud está en revisión. Mantenga los documentos disponibles y use esta "
                "sección para preparar preguntas para la consulta."
            ),
            intent="status_update",
            suggested_actions=context.next_steps,
            focus_section="timeline",
            requested_documents=context.pending_documents,
        )


def _section_for_missing(missing: str) -> str:
    lowered = missing.casefold()
    if "ingreso" in lowered:
        return "income-expenses"
    if "gasto" in lowered:
        return "income-expenses"
    if "deuda" in lowered or "acreedor" in lowered:
        return "debts-assets"
    if "bien" in lowered or "activo" in lowered:
        return "debts-assets"
    if "document" in lowered:
        return "evidence"
    if "hogar" in lowered or "vivienda" in lowered:
        return "household"
    return "overview"
