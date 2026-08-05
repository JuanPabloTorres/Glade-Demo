from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from app.schemas.bankruptcy import CaseAnalysisDto, GuidanceRequestDto


@dataclass
class GuidanceDraft:
    """
    Provider-agnostic result of a single guidance turn.

    This is the internal representation every provider produces. Fields
    beyond `message`/`suggested_actions`/`focus_section` (intent,
    requested_fields, requested_documents, requires_attorney_review,
    confidence) are populated here but not yet surfaced through the public
    API — Block 9 upgrades `GuidanceResponseDto` to expose them and adds the
    `CaseContextBuilder` that feeds providers a reduced, audited context
    instead of the raw case object.
    """

    message: str
    intent: str
    suggested_actions: list[str] = field(default_factory=list)
    focus_section: str = "overview"
    requested_fields: list[str] = field(default_factory=list)
    requested_documents: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    requires_attorney_review: bool = False
    confidence: float | None = None


class BaseAIProvider(Protocol):
    """
    Provider contract. Services depend on this Protocol, never on a
    concrete provider (AGENTS.md rule: services depend on protocols, not
    concrete implementations) — see `app.ai.providers.factory.get_provider`.
    """

    def generate(self, *, request: GuidanceRequestDto, analysis: CaseAnalysisDto) -> GuidanceDraft: ...

    def is_available(self) -> bool:
        """Cheap, synchronous check used for logging/tests — never required before generate()."""
        ...
