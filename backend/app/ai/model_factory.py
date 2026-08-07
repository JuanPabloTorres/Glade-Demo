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
        module = importlib.import_module("strands.models.openai_responses")
        return module.OpenAIResponsesModel(
            client_args={"api_key": api_key.get_secret_value()},
            model_id=self._settings.ai_model_id,
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

    def _create_ollama(self) -> Any:
        module = importlib.import_module("strands.models.ollama")
        return module.OllamaModel(
            self._settings.ollama_base_url,
            model_id=self._settings.ollama_model,
            temperature=self._settings.ai_temperature,
            max_tokens=self._settings.ai_max_output_tokens,
        )
