"""What the deterministic answer offers next, and what it shows.

Two problems this module exists to fix, both visible in a real transcript.

**The chips were not questions.** `AgentRuntime._draft_as_answer` turned
`GuidanceDraft.suggested_actions` into `ask` actions, and an `ask` action's
label is sent verbatim as the user's next message. But those lists hold
`next_steps`, `warnings` and `discussion_points` — imperatives aimed at the
user and statements about the case. Clicking one made the user "say"
*"Solicitar los documentos faltantes antes de discutir una estrategia."*, which
is not something a person would ever type, and which the assistant then had to
interpret as a question. Chips now come from questions written to be asked.

**The panel showed nothing but prose.** The deterministic path emitted no
cards, so a client reading an answer about their debts saw no figures beside
it — even though every figure was already in `CaseContextDto`. The agent path
could emit cards and the fallback could not, which is backwards: the fallback
is what every default deployment actually runs.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.i18n import Language

if TYPE_CHECKING:
    from app.schemas.assistant import CaseContextDto

# Follow-up questions per intent, in the user's voice. Three at most: a row of
# chips is a suggestion, and a wall of them is a menu nobody reads.
_QUESTIONS: dict[str, dict[Language, tuple[str, ...]]] = {
    "documents_status": {
        "es": (
            "¿Qué documentos debo conseguir primero?",
            "¿Para qué sirve cada documento?",
            "¿Qué pasa si no consigo alguno?",
        ),
        "en": (
            "Which documents should I get first?",
            "What is each document for?",
            "What happens if I cannot get one?",
        ),
    },
    "debts_summary": {
        "es": (
            "¿Cómo se reparten mis deudas?",
            "¿Qué deudas son prioritarias?",
            "¿Qué pasa con las deudas garantizadas?",
        ),
        "en": (
            "How are my debts distributed?",
            "Which debts are priority debts?",
            "What happens to secured debts?",
        ),
    },
    "assets_summary": {
        "es": (
            "¿Qué bienes están en riesgo?",
            "¿Qué son las exenciones?",
            "¿Debo declarar transferencias recientes?",
        ),
        "en": (
            "Which assets are at risk?",
            "What are exemptions?",
            "Do I have to disclose recent transfers?",
        ),
    },
    "income_expenses_summary": {
        "es": (
            "¿Cómo se calcula mi flujo mensual?",
            "¿Qué gastos cuentan?",
            "¿Qué documentos respaldan mi ingreso?",
        ),
        "en": (
            "How is my monthly cash flow calculated?",
            "Which expenses count?",
            "Which documents back up my income?",
        ),
    },
    "household_summary": {
        "es": (
            "¿Por qué importa el tamaño del hogar?",
            "¿Debo incluir a mi cónyuge?",
            "¿Cómo afecta mi vivienda?",
        ),
        "en": (
            "Why does household size matter?",
            "Should I include my spouse?",
            "How does my housing situation affect this?",
        ),
    },
    "alerts_summary": {
        "es": (
            "¿Qué debo atender primero?",
            "¿Qué significa cada alerta?",
            "¿Esto retrasa mi caso?",
        ),
        "en": (
            "What should I address first?",
            "What does each alert mean?",
            "Does this delay my case?",
        ),
    },
    "progress_status": {
        "es": (
            "¿Qué me falta para terminar?",
            "¿Qué sigue después de esto?",
            "¿Cuándo lo revisa el abogado?",
        ),
        "en": (
            "What is left before I finish?",
            "What comes after this?",
            "When does the attorney review it?",
        ),
    },
    "chapter_comparison": {
        "es": (
            "¿Qué preguntas debo llevar al abogado?",
            "¿Qué información falta para decidir?",
            "¿Qué documentos necesita el abogado?",
        ),
        "en": (
            "What questions should I bring to the attorney?",
            "What information is missing to decide?",
            "Which documents does the attorney need?",
        ),
    },
}

# Used when the intent has no list of its own — a greeting, a status update, a
# message that matched nothing. Deliberately the three things a person opening
# this product most often wants to know.
_DEFAULT_QUESTIONS: dict[Language, tuple[str, ...]] = {
    "es": (
        "¿Qué me falta por completar?",
        "¿Cómo va mi expediente?",
        "¿Qué preguntas debo llevar al abogado?",
    ),
    "en": (
        "What do I still need to complete?",
        "How is my case coming along?",
        "What questions should I bring to the attorney?",
    ),
}

_SUMMARY_LABELS: dict[Language, dict[str, str]] = {
    "es": {
        "title": "Resumen del expediente",
        "cash_flow": "Flujo mensual",
        "total_debt": "Deuda total",
        "assets": "Bienes",
        "completion": "Información completa",
        "evidence": "Evidencia",
        "pending_documents": "Documentos pendientes",
        "missing": "Secciones por completar",
    },
    "en": {
        "title": "Case summary",
        "cash_flow": "Monthly cash flow",
        "total_debt": "Total debt",
        "assets": "Assets",
        "completion": "Information complete",
        "evidence": "Evidence",
        "pending_documents": "Pending documents",
        "missing": "Sections left",
    },
}


def follow_up_questions(intent: str, language: Language) -> tuple[str, ...]:
    """Three questions a person might actually ask next, given this answer."""
    return _QUESTIONS.get(intent, {}).get(language) or _DEFAULT_QUESTIONS[language]


def summary_card_data(context: CaseContextDto, language: Language) -> tuple[str, dict[str, str]]:
    """The case's headline figures, as a card title and a label→value map.

    Every value is read off the already-authorized `CaseContextDto` — nothing
    here is computed, inferred, or rounded differently from what the workspace
    shows, so the card cannot disagree with the page behind it.

    Money is formatted here rather than in the frontend because a card's `data`
    is an open map the renderer stringifies as-is; a raw `308.33` would arrive
    without a currency and read as a count.
    """
    labels = _SUMMARY_LABELS[language]
    data = {
        labels["cash_flow"]: f"${context.monthly_cash_flow:,.2f}",
        labels["total_debt"]: f"${context.total_debt:,.2f}",
        labels["assets"]: f"${context.total_asset_value:,.2f}",
        labels["completion"]: f"{context.completion_score}%",
        labels["evidence"]: f"{context.evidence_score}%",
    }
    if context.pending_documents:
        data[labels["pending_documents"]] = str(len(context.pending_documents))
    if context.missing_items:
        data[labels["missing"]] = str(len(context.missing_items))
    return labels["title"], data
