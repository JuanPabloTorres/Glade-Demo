from __future__ import annotations

from typing import TYPE_CHECKING

from app.ai.providers.base import GuidanceDraft

if TYPE_CHECKING:
    from app.schemas.assistant import CaseContextDto, ConversationTurnDto

# Keyword sets are intentionally simple substring checks on the casefolded
# message — same style as the pre-existing `_section_for_missing` helper
# below. This is a rule-based provider: every branch must stay auditable by
# reading the keyword list next to it, never a scored/learned classifier.
# Keywords were chosen to avoid short, common words that would false-positive
# on ordinary conversational Spanish (e.g. "bien" as in "está bien" is
# deliberately excluded from the assets topic — only the more specific
# "bienes"/"activo"/"propiedad" trigger it).
_CHAPTER_7_KEYWORDS = ("capítulo 7", "capitulo 7", "chapter 7")
_CHAPTER_13_KEYWORDS = ("capítulo 13", "capitulo 13", "chapter 13")

_TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    # Generic "what's missing" catch-all — see `_TOPIC_PRIORITY` for why
    # this is checked *after* the more specific content topics.
    "missing_status": ("qué me falta", "que me falta", "falta", "missing", "falta algo"),
    "documents": (
        "documento",
        "document",
        "evidencia",
        "evidence",
        "adjuntar",
        "subir archivo",
        "upload",
    ),
    "debts": ("deuda", "debt", "acreedor", "creditor"),
    "assets": ("bienes", "activo", "activos", "propiedad", "propiedades", "asset", "property"),
    "income_expenses": (
        "ingreso",
        "income",
        "gasto",
        "expense",
        "presupuesto",
        "budget",
        "flujo de caja",
        "cash flow",
    ),
    "household": (
        "hogar",
        "household",
        "vivienda",
        "housing",
        "dependiente",
        "dependent",
        "estado civil",
        "marital",
    ),
    "alerts": ("alerta", "alert", "urgente", "urgency", "urgencia"),
    "progress_status": (
        "avance",
        "progreso",
        "progress",
        "cómo va",
        "como va",
        "estado del caso",
        "case status",
        "completion",
        "completado",
    ),
    "greeting": (
        "hola",
        "buenos días",
        "buenos dias",
        "buenas tardes",
        "buenas noches",
        "hello",
        "hi ",
        "hey",
    ),
}

# Priority order for `_TOPIC_KEYWORDS` when a message matches more than one
# set. Specific content topics (documents/debts/assets/income/household/
# alerts) are checked before the generic "missing_status" topic on purpose:
# "¿qué documentos faltan?" contains both "documento" and "falta", and the
# more specific question — which document(s) — is the more useful answer
# than a generic "here's what's missing overall" reply. "missing_status"
# still catches genuinely generic questions ("¿qué me falta?") because it
# comes right before the catch-all "greeting" topic, so nothing more
# specific ever outranks it by accident.
_TOPIC_PRIORITY = (
    "documents",
    "debts",
    "assets",
    "income_expenses",
    "household",
    "alerts",
    "progress_status",
    "missing_status",
    "greeting",
)

# A message this short (word count, not character count) is treated as a
# conversational follow-up ("¿y ahora?", "sí", "otra vez") rather than a
# fresh topic — see `_detect_topic`'s docstring.
_FOLLOWUP_WORD_LIMIT = 4


def _match_topic(folded_text: str) -> str | None:
    for topic in _TOPIC_PRIORITY:
        if any(keyword in folded_text for keyword in _TOPIC_KEYWORDS[topic]):
            return topic
    return None


def _detect_topic(folded_message: str, recent_conversation: list[ConversationTurnDto]) -> str | None:
    """
    Message-content intent detection (keyword matching, not a model) — the
    core of "different questions get different, relevant replies" instead of
    the same status-derived boilerplate for every message.

    A direct keyword match in the current message always wins. When the
    message itself is too short/generic to carry a topic (a follow-up like
    "¿y ahora?" or "otra vez"), the most recent *user* turn in
    `recent_conversation` is checked instead, so a short follow-up inherits
    the topic actually being discussed rather than falling back to generic
    status text. This is the only use `recent_conversation` gets here —
    still simple substring matching, never sent anywhere as "memory" beyond
    this one lookup.
    """
    topic = _match_topic(folded_message)
    if topic is not None:
        return topic
    if len(folded_message.split()) > _FOLLOWUP_WORD_LIMIT:
        return None
    for turn in reversed(recent_conversation):
        if turn.role == "user":
            return _match_topic(turn.message.casefold())
    return None


class RuleBasedProvider:
    """
    Deterministic provider — no network, no model weights, always
    available. Operates only on the reduced `CaseContextDto`, not the raw
    case (see BaseAIProvider). Default provider (`AI_PROVIDER` unset or
    `rule_based`) and the safe fallback every other provider wraps.

    Branching happens on two independent axes, in priority order:
      1. Chapter comparison keywords in the message (highest priority,
         unchanged from before this branching rework).
      2. The message's *content topic* (`_detect_topic`) — documents, debts,
         assets, income/expenses, household, alerts, progress, missing
         items, or a greeting. This is what makes two different questions
         against the same case state produce two different replies, instead
         of every message collapsing onto the same status/role-derived text.
      3. Only when no topic is recognized at all does it fall back to the
         original status/role-derived defaults (unchanged text/behavior),
         so every previously-passing case still produces the same reply it
         did before this topic layer was added.

    Every fact referenced in a topic reply (a total, a count, a status, a
    household summary) is read directly off `CaseContextDto` — never
    invented — matching the provider's existing contract.
    """

    def is_available(self) -> bool:
        return True

    def generate(self, *, context: CaseContextDto, message: str) -> GuidanceDraft:
        folded = message.casefold()
        en = context.language == "en"
        is_attorney = context.role == "attorney"

        if any(keyword in folded for keyword in _CHAPTER_7_KEYWORDS):
            return GuidanceDraft(
                message=(
                    "Chapter 7 usually focuses on liquidation and discharge of eligible debts, but it requires reviewing the means test, assets, exemptions, and recent transfers with an attorney."
                    if en
                    else "Chapter 7 suele enfocarse en liquidación y descarga de deudas elegibles, pero requiere revisar means test, bienes, exenciones y transacciones recientes con un abogado."
                ),
                intent="chapter_comparison",
                suggested_actions=context.chapter_7_questions[:3],
                focus_section="chapter-comparison",
                requires_attorney_review=True,
            )
        if any(keyword in folded for keyword in _CHAPTER_13_KEYWORDS):
            return GuidanceDraft(
                message=(
                    "Chapter 13 allows proposing a three-to-five-year payment plan for someone with regular income. Feasibility depends on complete data and legal review."
                    if en
                    else "Chapter 13 permite proponer un plan de pagos de tres a cinco años para una persona con ingreso regular. La viabilidad depende de datos completos y revisión legal."
                ),
                intent="chapter_comparison",
                suggested_actions=context.chapter_13_questions[:3],
                focus_section="chapter-comparison",
                requires_attorney_review=True,
            )

        topic = _detect_topic(folded, context.recent_conversation)
        if topic is not None:
            draft = self._topic_draft(topic, context, en, is_attorney)
            if draft is not None:
                return draft

        if is_attorney:
            return self._attorney_default_draft(context, en)
        if context.missing_items:
            return self._missing_items_draft(context, en, context.missing_items[0], is_attorney)
        if context.status in {"draft", "collecting_information"}:
            return GuidanceDraft(
                message=(
                    "The financial template is complete. Review creditors, assets, and documents before sending the request to the attorney."
                    if en
                    else "La plantilla financiera está completa. Revise acreedores, bienes y documentos antes de enviar la solicitud al abogado."
                ),
                intent="pre_submission_review",
                suggested_actions=context.next_steps,
                focus_section="review",
            )

        return GuidanceDraft(
            message=(
                "The request is under review. Keep your documents available and use this section to prepare consultation questions."
                if en
                else "La solicitud está en revisión. Mantenga los documentos disponibles y use esta sección para preparar preguntas para la consulta."
            ),
            intent="status_update",
            suggested_actions=context.next_steps,
            focus_section="timeline",
            requested_documents=context.pending_documents,
        )

    def _topic_draft(
        self, topic: str, context: CaseContextDto, en: bool, is_attorney: bool
    ) -> GuidanceDraft | None:
        if topic == "missing_status":
            if context.missing_items:
                return self._missing_items_draft(
                    context, en, context.missing_items[0], is_attorney
                )
            return GuidanceDraft(
                message=(
                    "Nothing is missing right now — the intake information for this case looks complete. Review the summary before moving forward."
                    if en
                    else "No falta nada por ahora — la información del expediente está completa. Revise el resumen antes de continuar."
                ),
                intent="missing_status_clear",
                suggested_actions=context.next_steps[:3],
                focus_section="review",
                requires_attorney_review=is_attorney,
                warnings=context.warnings if is_attorney else [],
            )

        if topic == "documents":
            pending = context.pending_documents
            if pending:
                message = (
                    f"There are {len(pending)} document(s) still pending: {', '.join(pending[:3])}."
                    if en
                    else f"Hay {len(pending)} documento(s) pendiente(s): {', '.join(pending[:3])}."
                )
            else:
                message = (
                    "No documents are pending on this case right now."
                    if en
                    else "No hay documentos pendientes en este expediente por ahora."
                )
            return GuidanceDraft(
                message=message,
                intent="documents_status",
                suggested_actions=pending[:3] or context.next_steps[:3],
                focus_section="evidence",
                requested_documents=pending,
                requires_attorney_review=is_attorney,
                warnings=context.warnings if is_attorney else [],
            )

        if topic == "debts":
            message = (
                f"Total registered debt for this case is ${context.total_debt:,.2f}."
                if en
                else f"La deuda total registrada en este expediente es ${context.total_debt:,.2f}."
            )
            return GuidanceDraft(
                message=message,
                intent="debts_summary",
                suggested_actions=context.discussion_points[:3] or context.next_steps[:3],
                focus_section="debts-assets",
                requires_attorney_review=is_attorney,
                warnings=context.warnings if is_attorney else [],
            )

        if topic == "assets":
            message = (
                f"Total registered asset value for this case is ${context.total_asset_value:,.2f}."
                if en
                else f"El valor total de bienes registrado en este expediente es ${context.total_asset_value:,.2f}."
            )
            return GuidanceDraft(
                message=message,
                intent="assets_summary",
                suggested_actions=context.discussion_points[:3] or context.next_steps[:3],
                focus_section="debts-assets",
                requires_attorney_review=is_attorney,
                warnings=context.warnings if is_attorney else [],
            )

        if topic == "income_expenses":
            message = (
                f"Monthly net income is ${context.monthly_net_income:,.2f} against "
                f"${context.monthly_expenses:,.2f} in monthly expenses, leaving a cash flow of "
                f"${context.monthly_cash_flow:,.2f}."
                if en
                else f"El ingreso neto mensual es ${context.monthly_net_income:,.2f} frente a "
                f"${context.monthly_expenses:,.2f} en gastos mensuales, dejando un flujo de caja de "
                f"${context.monthly_cash_flow:,.2f}."
            )
            return GuidanceDraft(
                message=message,
                intent="income_expenses_summary",
                suggested_actions=context.next_steps[:3],
                focus_section="income-expenses",
                requires_attorney_review=is_attorney,
                warnings=context.warnings if is_attorney else [],
            )

        if topic == "household":
            message = (
                f"Household on file: {context.household_summary}"
                if en
                else f"Hogar registrado: {context.household_summary}"
            )
            return GuidanceDraft(
                message=message,
                intent="household_summary",
                suggested_actions=context.next_steps[:3],
                focus_section="household",
                requires_attorney_review=is_attorney,
                warnings=context.warnings if is_attorney else [],
            )

        if topic == "alerts":
            if context.warnings:
                message = (
                    f"This case has {len(context.warnings)} active alert(s): {'; '.join(context.warnings[:3])}."
                    if en
                    else f"Este expediente tiene {len(context.warnings)} alerta(s) activa(s): {'; '.join(context.warnings[:3])}."
                )
            else:
                message = (
                    "There are no active alerts on this case right now."
                    if en
                    else "No hay alertas activas en este expediente por ahora."
                )
            return GuidanceDraft(
                message=message,
                intent="alerts_summary",
                suggested_actions=context.warnings[:3] or context.next_steps[:3],
                focus_section="attorney-review" if is_attorney else "review",
                warnings=context.warnings,
                requires_attorney_review=bool(context.warnings) or is_attorney,
            )

        if topic == "progress_status":
            message = (
                f"This case is {context.completion_score}% complete with an evidence score of "
                f"{context.evidence_score}%. Current status: {context.status}."
                if en
                else f"Este expediente está {context.completion_score}% completo con un puntaje de "
                f"evidencia de {context.evidence_score}%. Estado actual: {context.status}."
            )
            return GuidanceDraft(
                message=message,
                intent="progress_status",
                suggested_actions=context.next_steps[:3],
                focus_section="overview",
                requires_attorney_review=is_attorney,
                warnings=context.warnings if is_attorney else [],
            )

        if topic == "greeting":
            first_name = _first_name(context.client_name)
            message = (
                f"Hello, {first_name}. This case is at status "
                f"'{context.status}' and {context.completion_score}% complete. How can I help?"
                if en
                else f"Hola, {first_name}. Este expediente está en estado "
                f"'{context.status}' y {context.completion_score}% completo. ¿En qué puedo ayudar?"
            )
            return GuidanceDraft(
                message=message,
                intent="greeting",
                suggested_actions=context.next_steps[:3],
                focus_section="overview",
                requires_attorney_review=is_attorney,
                warnings=context.warnings if is_attorney else [],
            )

        return None

    def _missing_items_draft(
        self, context: CaseContextDto, en: bool, first: str, is_attorney: bool
    ) -> GuidanceDraft:
        return GuidanceDraft(
            message=(
                f"The next step is to complete {first.lower()}. Then we will link supporting evidence and automatically refresh your financial summary."
                if en
                else f"El próximo paso es completar {first.lower()}. Después vincularemos evidencia y actualizaremos el resumen financiero automáticamente."
            ),
            intent="next_step",
            suggested_actions=context.next_steps,
            focus_section=_section_for_missing(first),
            requested_fields=[first],
            requires_attorney_review=is_attorney,
            warnings=context.warnings if is_attorney else [],
        )

    def _attorney_default_draft(self, context: CaseContextDto, en: bool) -> GuidanceDraft:
        if context.warnings:
            return GuidanceDraft(
                message=(
                    f"The case has {len(context.warnings)} high-priority alert(s). Review evidence, collection urgency, and financial consistency before consultation."
                    if en
                    else f"El expediente tiene {len(context.warnings)} alerta(s) prioritaria(s). Revise evidencia, urgencias de cobro y consistencia financiera antes de la consulta."
                ),
                intent="attorney_summary",
                suggested_actions=context.warnings[:3],
                focus_section="attorney-review",
                warnings=context.warnings,
                requires_attorney_review=True,
            )
        return GuidanceDraft(
            message=(
                "The case is organized for professional review. Confirm forms, current means test inputs, exemptions, and pending questions before defining strategy."
                if en
                else "El expediente está organizado para revisión profesional. Confirme formularios, means test vigente, exenciones y preguntas pendientes antes de definir estrategia."
            ),
            intent="attorney_summary",
            suggested_actions=context.discussion_points[:3],
            focus_section="attorney-review",
            requires_attorney_review=True,
        )


def _first_name(client_name: str) -> str:
    parts = client_name.strip().split()
    return parts[0] if parts else client_name


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
