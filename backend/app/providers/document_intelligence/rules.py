import re

from app.domain.enums import CanonicalField
from app.providers.document_intelligence.base import ExtractedValue


class RulesDocumentIntelligenceProvider:
    _patterns: dict[CanonicalField, tuple[re.Pattern[str], ...]] = {
        CanonicalField.DISPLAY_NAME: (
            re.compile(r"(?:full\s+name|name)\s*:\s*(.+)", re.IGNORECASE),
        ),
        CanonicalField.EMAIL: (
            re.compile(r"(?:email)\s*:\s*([^\s]+@[^\s]+)", re.IGNORECASE),
            re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
        ),
        CanonicalField.PHONE: (
            re.compile(r"(?:phone|telephone)\s*:\s*([+()\-\d\s]{7,})", re.IGNORECASE),
        ),
        CanonicalField.ADDRESS: (
            re.compile(r"(?:address)\s*:\s*(.+)", re.IGNORECASE),
        ),
        CanonicalField.DATE_OF_BIRTH: (
            re.compile(r"(?:dob|date\s+of\s+birth)\s*:\s*([\w\-/]+)", re.IGNORECASE),
        ),
    }

    def extract(self, content: str) -> list[ExtractedValue]:
        values: list[ExtractedValue] = []
        for field, patterns in self._patterns.items():
            for pattern in patterns:
                match = pattern.search(content)
                if match:
                    raw_value = match.group(1) if match.lastindex else match.group(0)
                    value = raw_value.strip().rstrip(".,;")
                    if value:
                        values.append(ExtractedValue(field_name=field.value, value=value))
                        break
        return values
