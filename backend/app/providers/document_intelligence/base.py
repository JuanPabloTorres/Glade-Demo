from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class ExtractedValue:
    field_name: str
    value: str


class DocumentIntelligenceProvider(Protocol):
    def extract(self, content: str) -> list[ExtractedValue]: ...
