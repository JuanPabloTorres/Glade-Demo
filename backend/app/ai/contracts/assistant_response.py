"""
Assistant wire contract for the Strands orchestration layer (ADR 0002).

Two models live here and the split matters:

* `AgentAnswer` is what the *model* is allowed to produce. It carries only
  phrasing and presentation (message, cards, actions, which specialist
  handled it). It deliberately has no `disclaimer` and no
  `requires_attorney_review` field — those are server-owned verdicts, not
  model output, and a model that could set them could talk itself out of the
  legal-review requirement the product is built around.
* `AssistantResponse` is what the *server* returns. `AgentRuntime` composes
  it from a validated `AgentAnswer` plus guardrail results and the
  deterministic draft, and it is the only thing the router ever serializes.

This replaces the 3.x `AssistantResponse` (message/intent/suggested_actions/
focus_section/disclaimer). Breaking change — see RELEASE_NOTES 4.0.0.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from app.schemas.common import ApiModel


class AssistantActionType(StrEnum):
    """
    Read-only action vocabulary (phase 1 of the Strands rollout).

    Write actions (create/update/delete) are intentionally absent. They are
    phase 2 in the adopted plan and they require the signed server-side
    confirmation flow; until that exists, emitting a write action type the
    backend cannot honour would be dead surface the frontend still has to
    branch on. `AssistantAction.requires_confirmation` is already carried so
    phase 2 is additive rather than another breaking change.
    """

    OPEN_PAGE = "open_page"
    SHOW_DETAILS = "show_details"
    UPLOAD_DOCUMENT = "upload_document"
    REQUEST_DOCUMENT = "request_document"
    ASK = "ask"


ALLOWED_ACTION_RESOURCES: frozenset[str] = frozenset(
    {
        "overview",
        "household",
        "income-expenses",
        "debts-assets",
        "evidence",
        "timeline",
        "review",
        "chapter-comparison",
        "attorney-review",
    }
)
"""
Server-side allow-list of navigable case-workspace sections. Enforced in
`AgentRuntime` against every action the model emits — an action naming
anything else is dropped, not rendered. The frontend re-checks the same list
(`frontend/src/api/assistantActions.ts`) so neither side is the only guard.

These are the same section identifiers `RuleBasedProvider` already produces
as `focus_section`, so the deterministic and agent paths address the same
workspace surface.
"""


class AssistantAction(ApiModel):
    """One actionable suggestion rendered as a Flowbite Button + icon."""

    id: str
    action_type: AssistantActionType
    resource: str
    resource_id: str | None = None
    label: str
    icon: str = "chat"
    payload: dict[str, Any] = Field(default_factory=dict)
    requires_confirmation: bool = False


class AssistantCard(ApiModel):
    """A structured panel the chat renders instead of burying figures in prose."""

    card_type: str
    title: str
    description: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)


class AgentAnswer(ApiModel):
    """
    The structured output contract handed to `Agent.invoke_async(
    structured_output_model=...)`. Kept deliberately small: every field here
    is something a model may legitimately decide (how to say it, what to
    show, what to offer next). Anything with legal or authorization weight is
    composed around it by `AgentRuntime`, never inside it.
    """

    message: str
    handled_by: str = "orchestrator"
    actions: list[AssistantAction] = Field(default_factory=list)
    cards: list[AssistantCard] = Field(default_factory=list)


class AssistantResponse(ApiModel):
    """
    Public response for `bankruptcy.guide`.

    `disclaimer` stays mandatory and server-generated (AGENTS.md: never
    present automated legal advice), and `requires_attorney_review` is the
    OR of the deterministic draft's verdict and the guardrail verdict — the
    model cannot lower either one.
    """

    language: str
    message: str
    handled_by: str
    actions: list[AssistantAction] = Field(default_factory=list)
    cards: list[AssistantCard] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    requires_attorney_review: bool = False
    degraded: bool = False
    """True when the answer came from the deterministic fallback rather than
    the agent layer (model unavailable, timeout, invalid structured output).
    Surfaced rather than hidden so the UI can say so and QA can assert on it."""
    disclaimer: str
