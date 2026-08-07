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

# The two questions this product exists to route to a lawyer — "do I qualify?"
# and "should I file?" — were recognized only when the message happened to name
# a chapter number. Every other phrasing fell through to `_detect_topic` and,
# finding no content keyword, to the generic status default: a client in
# distress asking "¿Debo declararme en bancarrota?" was answered "El próximo
# paso es completar documentos de respaldo", with `requires_attorney_review`
# left false. Found by `tests/evals`, which recorded it as three known gaps
# before this fix; see changes/ai-eval-harness.md for the measurements.
#
# The guardrails could not have caught it. They inspect the *answer*, and that
# answer made no prohibited claim — it was merely about something else. This is
# intent recognition, and it belongs here.
_ELIGIBILITY_KEYWORDS = (
    "califico",
    "calificaría",
    "calificaria",
    "calificar para",
    "soy elegible",
    "seré elegible",
    "sere elegible",
    "elegibilidad",
    "cumplo con los requisitos",
    "do i qualify",
    "would i qualify",
    "am i eligible",
    "qualify for bankruptcy",
    "eligible for bankruptcy",
    "eligibility",
)

# Phrased as multi-word spans rather than single verbs on purpose. "debo
# presentar" alone would fire on "¿debo presentar los documentos esta semana?",
# which is a documents question and already answered well by that topic.
_FILING_DECISION_KEYWORDS = (
    "debo declararme",
    "debería declararme",
    "deberia declararme",
    "me conviene declararme",
    "vale la pena declararme",
    "debo radicar",
    "debo presentar la petición",
    "debo presentar la peticion",
    "debo presentar quiebra",
    "debo presentar la quiebra",
    "debo presentar bancarrota",
    "me conviene presentar",
    "should i file",
    "should i declare bankruptcy",
    "should i go bankrupt",
    "is it worth filing",
    "do i need to file",
)

# "Which chapter is best?" without naming a number. The numbered variants are
# handled by the two chapter branches above, which are more specific and stay
# ahead of this one.
_CHAPTER_UNSPECIFIED_KEYWORDS = (
    "cuál capítulo",
    "cual capitulo",
    "qué capítulo",
    "que capitulo",
    "mejor capítulo",
    "mejor capitulo",
    "which chapter",
    "what chapter",
    "best chapter",
)

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

# Phrases that genuinely continue the previous turn, and nothing else.
#
# This used to be a length test — four words or fewer counted as a follow-up —
# which meant *any* short unrecognized message inherited the last topic. A live
# transcript caught it: "2+2" was answered with "No hay documentos pendientes en
# este expediente por ahora", because the previous turn had been about
# documents. So did "gracias" and "asdfgh". Answering a question nobody asked,
# confidently, is worse than admitting the message was not understood.
#
# Length is still required on top of this: "sí, pero ¿qué pasa con mi carro?"
# opens a new subject and should not inherit either.
_FOLLOWUP_MARKERS = (
    "y ahora",
    "y luego",
    "y después",
    "y despues",
    "otra vez",
    "de nuevo",
    "continúa",
    "continua",
    "sigue",
    "más",
    "mas",
    "y eso",
    "por qué",
    "por que",
    "and now",
    "what about",
    "go on",
    "continue",
    "again",
    "more",
    "why",
)
"""Checked as substrings, like every other keyword set in this module."""

_FOLLOWUP_EXACT = frozenset(
    {"sí", "si", "no", "ok", "okay", "vale", "claro", "yes", "sure", "y?", "¿y?"}
)
"""Bare acknowledgements. Matched whole, not as substrings — "si" inside
"situación" is not an acknowledgement."""

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

    A direct keyword match in the current message always wins. Failing that,
    a message that is *explicitly* a continuation — "¿y ahora?", "otra vez",
    "sí" — inherits the topic of the most recent user turn, so a follow-up
    keeps discussing what was being discussed.

    Inheritance requires an explicit marker, not merely a short message. The
    length-only rule this replaces meant "2+2" was answered with "No hay
    documentos pendientes", because the turn before it had been about
    documents. This is the only use `recent_conversation` gets here — still
    substring matching, never sent anywhere as "memory" beyond this lookup.
    """
    topic = _match_topic(folded_message)
    if topic is not None:
        return topic
    if not _is_followup(folded_message):
        return None
    for turn in reversed(recent_conversation):
        if turn.role == "user":
            return _match_topic(turn.message.casefold())
    return None


def _is_followup(folded_message: str) -> bool:
    """Whether this message continues the previous turn rather than opening a
    subject of its own."""
    stripped = folded_message.strip().strip("¿?¡!.,;: ")
    if not stripped:
        return False
    if stripped in _FOLLOWUP_EXACT:
        return True
    # Length is required on top of the marker: "sí, pero ¿qué pasa con mi
    # carro?" carries a marker and is plainly a new subject.
    if len(stripped.split()) > _FOLLOWUP_WORD_LIMIT:
        return False
    return any(marker in stripped for marker in _FOLLOWUP_MARKERS)


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

        # Checked before `_detect_topic` because these questions frequently
        # carry a content keyword too — "¿Califico para declararme en quiebra
        # con estas deudas?" contains "deuda" and would otherwise be answered
        # with a debt total, which is not what was asked.
        if any(
            keyword in folded
            for group in (
                _ELIGIBILITY_KEYWORDS,
                _FILING_DECISION_KEYWORDS,
                _CHAPTER_UNSPECIFIED_KEYWORDS,
            )
            for keyword in group
        ):
            return self._eligibility_question_draft(context, en)

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

    def _eligibility_question_draft(self, context: CaseContextDto, en: bool) -> GuidanceDraft:
        """Answer "do I qualify / should I file / which chapter" without answering it.

        Three things this deliberately does, none of which the generic default did:

        1. **Declines explicitly, and names what the determination actually
           depends on.** "The next step is to complete supporting documents" is
           not a refusal, it is a non-sequitur — the client cannot tell they
           asked something the product will not answer, so they ask again.
        2. **Grounds the reply in this case's own figures**, read straight off
           `CaseContextDto`. Nothing is computed or inferred here; a generic
           reply is what made the assistant feel like it was not reasoning about
           the case in front of it.
        3. **Raises `requires_attorney_review` at the source.** The guardrails
           will also raise it, because the wording matches their declination
           pattern, and that redundancy is deliberate: the flag must not depend
           on a regex over prose that a future copy edit could break.

        The suggested actions are the case's own chapter questions, so the turn
        ends with something to take to the consultation rather than a closed
        door.
        """
        questions = (context.chapter_7_questions + context.chapter_13_questions)[:3]
        figures = (
            f"registered debt ${context.total_debt:,.2f}, "
            f"assets ${context.total_asset_value:,.2f}, "
            f"monthly cash flow ${context.monthly_cash_flow:,.2f}, "
            f"case completeness {context.completion_score}%"
            if en
            else f"deuda registrada ${context.total_debt:,.2f}, "
            f"bienes ${context.total_asset_value:,.2f}, "
            f"flujo mensual ${context.monthly_cash_flow:,.2f}, "
            f"completitud del expediente {context.completion_score}%"
        )
        message = (
            (
                # Phrased as "your eligibility", never "whether you qualify":
                # `ResponseGuardrails._ELIGIBILITY_CLAIM` matches the literal
                # span "you qualify" and rewrote this sentence into "I cannot
                # determine whether this may relate to the applicable
                # requirements (subject to attorney review)" — a guardrail
                # firing on a declination and turning it into gibberish. The
                # pattern requires whitespace after "you", so the possessive
                # form is both clearer and outside it.
                "I cannot determine your eligibility, and I cannot recommend a "
                "chapter. That determination depends on the official means test, "
                "your income over the last six months, how your debts are "
                "classified, and which exemptions apply — and a licensed attorney "
                f"makes it. What your case records so far: {figures}. The most "
                "useful thing now is to take those figures, complete, into the "
                "consultation along with the questions below."
            )
            if en
            else (
                "No puedo determinar si calificas ni recomendarte un capítulo. Esa "
                "determinación depende del means test oficial, de tus ingresos de "
                "los últimos seis meses, de cómo se clasifican tus deudas y de las "
                "exenciones que apliquen — y la hace un abogado autorizado. Lo que "
                f"tu expediente registra hasta ahora: {figures}. Lo más útil ahora "
                "es llevar esas cifras completas a la consulta, junto con las "
                "preguntas de abajo."
            )
        )
        return GuidanceDraft(
            message=message,
            intent="eligibility_question",
            suggested_actions=questions or context.next_steps[:3],
            focus_section="chapter-comparison",
            requires_attorney_review=True,
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
    """Which workspace section a missing item belongs to.

    Matched on the item's own text, in both languages. The English keywords are
    not decoration: `BankruptcyAnalysisService` produces these items in the
    session's language since 4.2.0, so a Spanish-only list would have quietly
    routed every English session to "overview" — a working-looking link that
    always went to the wrong place.
    """
    lowered = missing.casefold()
    if "ingreso" in lowered or "income" in lowered:
        return "income-expenses"
    if "gasto" in lowered or "expense" in lowered:
        return "income-expenses"
    if "deuda" in lowered or "acreedor" in lowered or "debt" in lowered or "creditor" in lowered:
        return "debts-assets"
    if "bien" in lowered or "activo" in lowered or "asset" in lowered or "property" in lowered:
        return "debts-assets"
    if "document" in lowered or "evidence" in lowered:
        return "evidence"
    if (
        "hogar" in lowered
        or "vivienda" in lowered
        or "household" in lowered
        or "housing" in lowered
        or "marital" in lowered
    ):
        return "household"
    return "overview"
