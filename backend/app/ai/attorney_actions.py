"""What the attorney's case toolbar can do, in the assistant's vocabulary.

The attorney asks the assistant "what should I do next on this case", and the
assistant was answering without knowing what this product actually lets them
do — so it produced generic advice ("contact the client", "gather more
information") while the control that does exactly that sat two clicks away in
`CaseActionBar`. Naming the real actions is the difference between guidance and
filler.

**This is capability vocabulary, not authorization.** The assistant may say an
action exists and explain what it is for. It cannot perform one: there is no
write action type in `AssistantActionType`, and every entry here is executed by
a person pressing the button. Adding an action to this list grants nothing.

Kept beside the agent layer rather than derived from the frontend, because the
frontend's list is React state and this one has to be a stable, bilingual,
testable contract. `test_attorney_actions.py` pins the two lists against each
other so the assistant cannot start describing a control that was removed.
"""

from __future__ import annotations

from app.core.i18n import Language
from app.schemas.assistant import AttorneyActionDto

_ATTORNEY_ACTIONS: tuple[tuple[str, dict[Language, tuple[str, str]]], ...] = (
    (
        "request-document",
        {
            "es": (
                "Solicitar documento",
                "Pide un documento concreto al cliente. Aparece como evidencia "
                "pendiente en su expediente hasta que lo suba.",
            ),
            "en": (
                "Request document",
                "Ask the client for a specific document. It appears as pending "
                "evidence in their case file until they upload it.",
            ),
        },
    ),
    (
        "request-clarification",
        {
            "es": (
                "Solicitar aclaración",
                "Pide al cliente que explique o corrija una cifra o un dato ya "
                "registrado. Queda anotado en el expediente.",
            ),
            "en": (
                "Request clarification",
                "Ask the client to explain or correct a figure already on file. "
                "It is recorded as a note on the case.",
            ),
        },
    ),
    (
        "add-note",
        {
            "es": (
                "Añadir nota",
                "Guarda una nota profesional privada en el expediente. El cliente "
                "no la ve.",
            ),
            "en": (
                "Add note",
                "Save a private professional note on the case. The client does "
                "not see it.",
            ),
        },
    ),
    (
        "schedule-consultation",
        {
            "es": (
                "Programar consulta",
                "Registra la fecha propuesta de consulta y la refleja en el "
                "seguimiento del caso.",
            ),
            "en": (
                "Schedule consultation",
                "Record the proposed consultation date and reflect it on the "
                "case timeline.",
            ),
        },
    ),
    (
        "assign-attorney",
        {
            "es": ("Asignar abogado", "Deja constancia de qué abogado atiende el expediente."),
            "en": ("Assign attorney", "Record which attorney is handling the case."),
        },
    ),
    (
        "generate-summary",
        {
            "es": (
                "Generar resumen",
                "Redacta un borrador del resumen del caso a partir de los datos "
                "registrados, para revisarlo y guardarlo en notas.",
            ),
            "en": (
                "Generate summary",
                "Draft a case summary from the recorded data, to review and save "
                "into the notes.",
            ),
        },
    ),
    (
        "message-client",
        {
            "es": (
                "Mensaje al cliente",
                "Envía un mensaje que el cliente ve en su asistente de preparación.",
            ),
            "en": (
                "Message client",
                "Send a message the client sees in their preparation assistant.",
            ),
        },
    ),
    (
        "urgency",
        {
            "es": (
                "Marcar urgencia",
                "Activa o desactiva la marca de cobro urgente, que sube el caso "
                "en la bandeja.",
            ),
            "en": (
                "Flag urgency",
                "Turn the urgent-collection flag on or off, which raises the case "
                "in the inbox.",
            ),
        },
    ),
    (
        "change-status",
        {
            "es": (
                "Cambiar estado",
                "Mueve el expediente de etapa (revisión, consulta programada, "
                "decisión pendiente, preparación, cerrado).",
            ),
            "en": (
                "Change status",
                "Move the case between stages (review, consultation scheduled, "
                "decision pending, filing preparation, closed).",
            ),
        },
    ),
)

ATTORNEY_ACTION_IDS: frozenset[str] = frozenset(action_id for action_id, _ in _ATTORNEY_ACTIONS)


def attorney_actions(language: Language) -> list[AttorneyActionDto]:
    """The toolbar's vocabulary, in the session's language.

    Bilingual because the assistant names these controls to the attorney, and a
    Spanish session being told to press "Request document" is the same defect
    the interface spent a release removing.
    """
    return [
        AttorneyActionDto(action_id=action_id, label=copy[language][0], description=copy[language][1])
        for action_id, copy in _ATTORNEY_ACTIONS
    ]
