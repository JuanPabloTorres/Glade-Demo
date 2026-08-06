from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from app.schemas.assistant import CaseContextDto


@dataclass
class GuidanceDraft:
    """
    Provider-agnostic result of a single guidance turn. `BankruptcyGuidanceService`
    maps this to the public `AssistantResponse` contract (app/schemas/assistant.py),
    turning `suggested_actions` (bare strings here) into structured
    `AssistantAction` objects with id/icon/action_type.
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

    `generate` takes a `CaseContextDto` — the reduced, audited context from
    `CaseContextBuilder` — and the raw user message. A provider never
    receives the full case object, so it structurally cannot leak or act on
    data outside what CaseContextBuilder chose to include (master
    instruction §6.2).
    """

    def generate(self, *, context: CaseContextDto, message: str) -> GuidanceDraft: ...

    def is_available(self) -> bool:
        """Cheap, synchronous check used for logging/tests — never required before generate()."""
        ...
