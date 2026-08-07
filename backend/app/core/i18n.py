from __future__ import annotations

from collections.abc import Mapping
from typing import Literal

Language = Literal["es", "en"]
"""The two languages the product speaks.

Named here rather than repeated as a bare `Literal` at each use site, because
several DTOs and every localized catalogue are keyed by it — `CaseContextDto.
language` among them, which is why `resolve_language` returns this and not
`str`.
"""

DEFAULT_LOCALE = "es-PR"
SUPPORTED_PREFIX_TO_LOCALE = {
    "es": "es-PR",
    "en": "en-US",
}

ERROR_MESSAGES: dict[str, dict[str, str]] = {
    "errors.codes.VALIDATION_ERROR": {
        "es": "Error de validación.",
        "en": "Validation error.",
    },
    "errors.codes.UNAUTHORIZED": {
        "es": "Tu sesión no es válida o expiró.",
        "en": "Your session is invalid or expired.",
    },
    "errors.codes.FORBIDDEN": {
        "es": "No tienes permisos para realizar esta acción.",
        "en": "You do not have permission to perform this action.",
    },
    "errors.codes.RESOURCE_NOT_FOUND": {
        "es": "No se encontró el recurso solicitado.",
        "en": "The requested resource was not found.",
    },
    "errors.codes.CONFLICT": {
        "es": "Existe un conflicto con el estado actual.",
        "en": "There is a conflict with the current state.",
    },
    "errors.codes.OLLAMA_UNAVAILABLE": {
        "es": "El servicio de inteligencia artificial no está disponible.",
        "en": "The artificial intelligence service is unavailable.",
    },
    "errors.codes.RATE_LIMITED": {
        "es": "Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.",
        "en": "Too many login attempts. Try again in a few minutes.",
    },
    "errors.codes.INTERNAL_ERROR": {
        "es": "Ocurrió un error interno inesperado.",
        "en": "An unexpected internal error occurred.",
    },
}


def resolve_locale(accept_language: str | None) -> str:
    if not accept_language:
        return DEFAULT_LOCALE
    for section in accept_language.split(","):
        token = section.split(";")[0].strip().lower()
        if token.startswith("es"):
            return "es-PR"
        if token.startswith("en"):
            return "en-US"
    return DEFAULT_LOCALE


def resolve_language(locale: str) -> Language:
    lowered = locale.lower()
    if lowered.startswith("en"):
        return "en"
    return "es"


def localize_message(
    message_key: str, locale: str, parameters: Mapping[str, object] | None = None
) -> str:
    language = resolve_language(locale)
    template = ERROR_MESSAGES.get(message_key, {}).get(language)
    if not template:
        template = ERROR_MESSAGES.get(message_key, {}).get("es", message_key)
    if parameters:
        output = template
        for key, value in parameters.items():
            output = output.replace(f"{{{{{key}}}}}", str(value))
        return output
    return template
