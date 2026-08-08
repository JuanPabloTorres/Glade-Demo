"""
A model at the provider boundary, and nothing else faked.

The agentic path could not be tested without a credential: Ollama cannot be
forced to return structured output, and no key exists. So this replaces the one
component that talks to a third party — the Strands `Model` — and leaves every
other layer real: the orchestrator, specialist selection, the tool registry,
`CaseTools`, `PortfolioTools`, authorization, the context builder, schema
validation and the guardrails all run exactly as they do in production.

**It reacts rather than replays.** A scripted queue of responses would pass
whatever the runtime did, including doing nothing: if Strands stopped invoking
tools, a queue would still hand back the final answer and the test would stay
green. This fake instead reads the `tool_specs` it is offered and calls the first
one it is told to prefer, so a tool that stops being registered means the call
cannot happen and the test fails.

That is the property the whole exercise depends on: **the fake cannot produce the
final answer unless the real tool ran first.** `structured_output` refuses to
emit one until it has seen a tool result.
"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator, AsyncIterable
from typing import Any, TypeVar

from strands.models.model import Model

T = TypeVar("T")


def _text_of(messages: list[Any]) -> str:
    """Flatten a Strands message list to the text a model would actually read.

    Used to assert what reached the prompt — notably whether a follow-up turn
    was given the earlier turns it needs to resolve its own pronouns.
    """
    parts: list[str] = []
    for message in messages or []:
        content = message.get("content", []) if isinstance(message, dict) else []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(str(block["text"]))
    return "\n".join(parts)


class ToolNeverInvokedError(AssertionError):
    """Raised when a final answer is requested before any tool ran.

    A test that reaches this has proved the opposite of what it set out to: the
    runtime produced an answer without consulting the case, which is exactly the
    failure the agentic path exists to avoid.
    """


class FakeProviderModel(Model):
    """Drives the real runtime by choosing from the tools it is actually offered.

    `prefers` is an ordered list of tool names. On each turn the fake calls the
    first preference that appears in `tool_specs`; when none do, it answers with
    text. Specialist agents are themselves tools on the orchestrator, so one list
    like `["portfolio_agent", "list_cases_needing_attention"]` walks the whole
    delegation chain — orchestrator picks the specialist, specialist picks the
    data tool — without the fake knowing anything about the hierarchy.
    """

    def __init__(
        self,
        prefers: list[str],
        answer: str = "Respuesta del agente.",
        structured_tool: str = "AgentAnswer",
    ) -> None:
        self._prefers = prefers
        self._answer = answer
        self._structured_tool = structured_tool
        self.invoked_tools: list[str] = []
        self.offered_tools: list[list[str]] = []
        self.prompts: list[str] = []

    @property
    def data_tools_invoked(self) -> list[str]:
        """Tools that read the case, excluding the schema tool and specialists."""
        return [
            name
            for name in self.invoked_tools
            if name != self._structured_tool and not name.endswith("_agent")
        ]

    # -- Model interface --------------------------------------------------

    def get_config(self) -> dict[str, Any]:
        return {"model_id": "fake-provider-model"}

    def update_config(self, **_kwargs: Any) -> None:
        return None

    async def stream(
        self,
        messages: list[Any],
        tool_specs: list[Any] | None = None,
        system_prompt: str | None = None,
        **_kwargs: Any,
    ) -> AsyncIterable[dict[str, Any]]:
        available = [spec["name"] for spec in (tool_specs or [])]
        self.offered_tools.append(available)
        self.prompts.append(_text_of(messages))

        target = next(
            (
                name
                for name in self._prefers
                if name in available and name not in self.invoked_tools
            ),
            None,
        )

        # Structured output is not `Model.structured_output` — Strands presents
        # the schema as a synthetic tool and forces a call to it, which is
        # precisely the mechanism Ollama's adapter ignores and OpenAI's honours.
        # Taken only once every preference is exhausted, so the schema tool can
        # never pre-empt the data tools this fake exists to drive.
        if target is None and self._structured_tool in available:
            if not self.data_tools_invoked:
                raise ToolNeverInvokedError(
                    "the schema tool was offered before any data tool ran; "
                    f"tools offered across turns: {self.offered_tools}"
                )
            self.invoked_tools.append(self._structured_tool)
            async for event in self._tool_turn(
                self._structured_tool,
                arguments={
                    "message": self._answer,
                    "handled_by": self.data_tools_invoked[0],
                    "actions": [],
                    "cards": [],
                },
            ):
                yield event
            return

        if target is None:
            async for event in self._text_turn(self._answer):
                yield event
            return

        self.invoked_tools.append(target)
        async for event in self._tool_turn(target):
            yield event

    async def structured_output(
        self,
        output_model: type[T],
        prompt: list[Any],
        system_prompt: str | None = None,
        **_kwargs: Any,
    ) -> AsyncGenerator[dict[str, Any]]:
        """Present for interface completeness; the runtime does not reach it.

        Strands forces the schema through a synthetic tool call instead — see
        `stream`. Implemented rather than left to raise so that a future SDK
        version taking this path fails on the same guard, not on a missing
        method.
        """
        if not self.data_tools_invoked:
            raise ToolNeverInvokedError(
                "structured output was requested before any data tool ran; "
                f"tools offered across turns: {self.offered_tools}"
            )
        yield {"output": output_model(message=self._answer, handled_by=self.data_tools_invoked[0])}

    # -- event shaping ----------------------------------------------------

    async def _text_turn(self, text: str) -> AsyncIterable[dict[str, Any]]:
        yield {"messageStart": {"role": "assistant"}}
        yield {"contentBlockDelta": {"contentBlockIndex": 0, "delta": {"text": text}}}
        yield {"contentBlockStop": {"contentBlockIndex": 0}}
        yield {"messageStop": {"stopReason": "end_turn"}}

    async def _tool_turn(
        self, name: str, arguments: dict[str, Any] | None = None
    ) -> AsyncIterable[dict[str, Any]]:
        # Every case/portfolio tool takes no arguments except
        # `search_case_documents`, whose single `query` is supplied below. The
        # empty object is what a model sends for a no-argument tool.
        if arguments is None:
            arguments = {"query": "evidencia"} if name == "search_case_documents" else {}
        yield {"messageStart": {"role": "assistant"}}
        yield {
            "contentBlockStart": {
                "contentBlockIndex": 0,
                "start": {"toolUse": {"toolUseId": f"call-{name}", "name": name}},
            }
        }
        yield {
            "contentBlockDelta": {
                "contentBlockIndex": 0,
                "delta": {"toolUse": {"input": json.dumps(arguments)}},
            }
        }
        yield {"contentBlockStop": {"contentBlockIndex": 0}}
        yield {"messageStop": {"stopReason": "tool_use"}}
