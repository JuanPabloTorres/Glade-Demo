"""
One structured record per assistant turn.

The runtime had no observability at all: tool execution was visible only as the
Strands SDK's own stdout, and nothing recorded which provider answered, how long
it took, or why a turn degraded. "The agent is running" was a claim that could
only be checked by reading the SDK's output by eye.

What this deliberately does **not** capture is the model's reasoning. Operational
traceability and chain-of-thought are different things: the first says which
tools ran and whether the turn degraded, the second is the model's private
deliberation, and exposing it would put unreviewed generated text — about a
person's finances — into logs. The fields below are all facts about the
*execution*, never about its content.

Also absent by construction: secrets, prompts, and case figures. A trace carries
counts and identifiers, so a log aggregator never becomes a second copy of
client financial data.
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

TRACE_LOGGER_NAME = "app.ai.trace"
"""Its own logger so a deployment can route or silence traces without touching
the rest of the AI logging."""

_trace_logger = logging.getLogger(TRACE_LOGGER_NAME)


@dataclass
class ToolCall:
    name: str
    status: str
    duration_ms: int = 0


@dataclass
class AgentExecutionTrace:
    """Accumulates what happened during one turn, then emits it once.

    Built as a mutable accumulator rather than assembled at the end because the
    interesting facts are discovered at different depths — the provider at the
    top, the tools in the middle, the fallback reason at the bottom — and
    threading them back up as return values would change every signature between
    here and there.
    """

    correlation_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    provider: str = "unknown"
    model: str = ""
    runtime_mode: str = "deterministic"
    role: str = ""
    language: str = ""
    agent: str = ""
    specialist: str = ""
    tools: list[ToolCall] = field(default_factory=list)
    degraded: bool = True
    fallback_reason: str = ""
    handled_by: str = ""
    _started: float = field(default_factory=time.perf_counter)

    def record_tool(self, name: str, status: str, duration_ms: int = 0) -> None:
        self.tools.append(ToolCall(name=name, status=status, duration_ms=duration_ms))

    def mark_agentic(self, handled_by: str) -> None:
        self.runtime_mode = "agentic"
        self.degraded = False
        self.handled_by = handled_by
        self.specialist = handled_by

    def mark_degraded(self, reason: str) -> None:
        """`reason` is a short, enumerated cause — never an exception message.

        A raw exception string can carry a URL, a key fragment or a provider's
        echo of the request, and this record is written to logs that are not
        reviewed line by line.
        """
        self.runtime_mode = "deterministic"
        self.degraded = True
        self.fallback_reason = reason
        self.handled_by = "deterministic"

    @property
    def duration_ms(self) -> int:
        return int((time.perf_counter() - self._started) * 1000)

    def as_dict(self) -> dict[str, Any]:
        return {
            "correlation_id": self.correlation_id,
            "provider": self.provider,
            "model": self.model,
            "runtime_mode": self.runtime_mode,
            "role": self.role,
            "language": self.language,
            "agent": self.agent,
            "specialist": self.specialist,
            "tools_invoked": [tool.name for tool in self.tools],
            "tool_status": {tool.name: tool.status for tool in self.tools},
            "duration_ms": self.duration_ms,
            "degraded": self.degraded,
            "fallback_reason": self.fallback_reason,
            "handled_by": self.handled_by,
        }

    def emit(self) -> dict[str, Any]:
        """Log the trace and return it, so callers and tests read the same value.

        Returned rather than only logged because a test that asserts on a log
        string is asserting on formatting; this way the assertion is on the
        record.
        """
        payload = self.as_dict()
        _trace_logger.info(
            "ai.turn provider=%s mode=%s handled_by=%s tools=%s degraded=%s duration_ms=%s id=%s",
            payload["provider"],
            payload["runtime_mode"],
            payload["handled_by"],
            ",".join(payload["tools_invoked"]) or "-",
            payload["degraded"],
            payload["duration_ms"],
            payload["correlation_id"],
            extra={"ai_trace": payload},
        )
        return payload


class FallbackReason:
    """The enumerated causes a turn can degrade for.

    A closed vocabulary rather than free text: these values are what an operator
    filters and counts on, and "model exploded: <stack>" is neither filterable
    nor safe to log.
    """

    PROVIDER_NOT_AGENTIC = "provider_not_agentic"
    PROVIDER_CANNOT_FORCE_STRUCTURE = "provider_cannot_force_structured_output"
    AGENTS_EXTRA_MISSING = "agents_extra_missing"
    MODEL_UNAVAILABLE = "model_unavailable"
    NO_STRUCTURED_OUTPUT = "no_structured_output"
    AGENT_RAISED = "agent_raised"
