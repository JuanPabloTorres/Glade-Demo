from __future__ import annotations

from app.schemas.copilot import CaseProfileDto
from app.services.copilot_service import (
    EMAIL_PATTERN,
    FIELD_ORDER,
    LOCATION_PATTERNS,
    NAME_PATTERNS,
    PHONE_PATTERN,
    CopilotService,
    _clean,
    _detect_case_type,
)


class IntakeCopilotService(CopilotService):
    """Copilot service with turn-aware profile extraction.

    The field expected before processing the message controls plain-text fallback assignment.
    This prevents a phone answer from being reused as the next missing location.
    """

    def _update_profile(self, profile: CaseProfileDto, message: str) -> CaseProfileDto:
        data = profile.model_dump()
        missing_before = [field for field in FIELD_ORDER if not data.get(field)]
        current = missing_before[0] if missing_before else None

        if not data["goal"]:
            data["goal"] = message
        detected_case_type = _detect_case_type(message)
        if detected_case_type:
            data["case_type"] = detected_case_type
        email = EMAIL_PATTERN.search(message)
        if email:
            data["email"] = _clean(email.group(0))
        phone = PHONE_PATTERN.search(message)
        if phone:
            data["phone"] = _clean(phone.group(0))
        for pattern in NAME_PATTERNS:
            match = pattern.search(message)
            if match:
                data["client_name"] = _clean(match.group(1))
                break
        for pattern in LOCATION_PATTERNS:
            match = pattern.search(message)
            if match:
                data["location"] = _clean(match.group(1))
                break

        if current == "client_name" and not data["client_name"]:
            if (
                len(message.split()) <= 6
                and not EMAIL_PATTERN.search(message)
                and not PHONE_PATTERN.search(message)
            ):
                data["client_name"] = message
        elif current == "location" and not data["location"]:
            data["location"] = message
        return CaseProfileDto(**data)
