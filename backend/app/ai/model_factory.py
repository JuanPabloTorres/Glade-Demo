"""
Strands model-provider factory (ADR 0002).

Replaces the hand-rolled `urllib` call in the deleted `OllamaProvider`: model
transport, retries and structured-output coercion are the SDK's job now, and
this module only decides *which* model object to build from `Settings`.

Nothing here is imported at app start — `strands` lives in the optional
`agents` extra (see backend/pyproject.toml) and `create()` is only reached
from `AgentRuntime` after it has confirmed the extra is installed.
"""

from __future__ import annotations

import importlib
import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)

OPENAI = "openai"
OLLAMA = "ollama"
AGENT_PROVIDERS: frozenset[str] = frozenset({OPENAI, OLLAMA})
"""Providers that route through Strands. Anything else (`rule_based`,
`transformers`) never reaches this factory — `AgentRuntime` answers
deterministically instead."""


class UnsupportedAIProviderError(ValueError):
    pass


class MissingModelCredentialsError(ValueError):
    """Raised when the selected provider is configured but unusable — e.g.
    `AI_PROVIDER=openai` with no `OPENAI_API_KEY`. Callers treat this as
    "degrade to the deterministic answer", never as a 500: a missing key is a
    deployment state, not a request error."""


class ModelFactory:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def create(self) -> Any:
        provider = self._settings.ai_provider.strip().lower()
        if provider == OPENAI:
            return self._create_openai()
        if provider == OLLAMA:
            return self._create_ollama()
        raise UnsupportedAIProviderError(
            f"{provider!r} is not a Strands model provider. "
            f"Expected one of {sorted(AGENT_PROVIDERS)}."
        )

    def _create_openai(self) -> Any:
        api_key = self._settings.openai_api_key
        if not api_key or not api_key.get_secret_value().strip():
            raise MissingModelCredentialsError(
                "AI_PROVIDER=openai requires OPENAI_API_KEY. Set it, or switch "
                "AI_PROVIDER to 'ollama' (local) or 'rule_based' (deterministic)."
            )

        base_url = (self._settings.openai_base_url or "").strip()
        if base_url:
            return self._create_openai_compatible(api_key.get_secret_value(), base_url)

        module = importlib.import_module("strands.models.openai_responses")
        return module.OpenAIResponsesModel(
            client_args={"api_key": api_key.get_secret_value()},
            model_id=self._settings.openai_model,
            params={
                "temperature": self._settings.ai_temperature,
                "max_output_tokens": self._settings.ai_max_output_tokens,
            },
            # Conversation history is ours, not the provider's: it lives in
            # the `ai_conversations` table behind AIConversationRepository so
            # it stays case-scoped, auditable and deletable with the case.
            # A server-side thread on the provider would be a second,
            # unreachable copy of client financial data.
            stateful=False,
        )

    def _create_openai_compatible(self, api_key: str, base_url: str) -> Any:
        """Any provider that speaks OpenAI's Chat Completions API.

        A different class, not just a different URL. The branch above uses the
        *Responses* API, which as of today only OpenAI itself implements —
        pointing it at Groq, Cerebras, OpenRouter or Gemini's compatibility
        endpoint fails every call, and `AgentRuntime` turns a failed call into
        a silent degrade. Chat Completions is the interface those providers
        actually expose, so `OPENAI_BASE_URL` selects both the endpoint and the
        protocol that matches it.

        This is what makes a free-tier provider usable here: OpenAI has no
        meaningful free tier, and the agent is the part of this product worth
        demonstrating.

        `max_tokens` rather than `max_output_tokens`: the two APIs name the
        same limit differently, and sending the Responses spelling to a Chat
        Completions endpoint is rejected as an unknown parameter by some
        providers and silently ignored by others — either way the cap would not
        be applied.
        """
        module = importlib.import_module("strands.models.openai")
        logger.info("Using the OpenAI-compatible Chat Completions API at %s", base_url)
        return module.OpenAIModel(
            client_args={"api_key": api_key, "base_url": base_url},
            model_id=self._settings.openai_model,
            params={
                "temperature": self._settings.ai_temperature,
                "max_tokens": self._settings.ai_max_output_tokens,
            },
        )

    def _create_ollama(self) -> Any:
        module = importlib.import_module("strands.models.ollama")
        return module.OllamaModel(
            self._settings.ollama_base_url,
            model_id=self._settings.ollama_model,
            temperature=self._settings.ai_temperature,
            max_tokens=self._settings.ai_max_output_tokens,
        )
