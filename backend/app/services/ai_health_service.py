from __future__ import annotations

import importlib.util
import logging

from app.ai.model_factory import AGENT_PROVIDERS, OLLAMA, ModelFactory
from app.ai.providers.factory import get_provider_for_settings
from app.core.config import Settings
from app.schemas.common import AIHealthDto

logger = logging.getLogger(__name__)


class AIHealthService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def get_health(self) -> AIHealthDto:
        selected_provider = self._settings.ai_provider.strip().lower() or "rule_based"
        if selected_provider in AGENT_PROVIDERS:
            return AIHealthDto(
                status="ok",
                provider=selected_provider,
                model=self._agent_model_id(selected_provider),
                available=self._agent_layer_available(),
            )
        provider = get_provider_for_settings(self._settings)
        return AIHealthDto(
            status="ok",
            provider=selected_provider,
            model=self._settings.ai_model_id,
            available=provider.is_available(),
        )

    def _agent_model_id(self, selected_provider: str) -> str:
        """The model actually in use, per provider.

        The OpenAI branch used to report `ai_model_id`, which belongs to the
        transformers provider and defaults to a HuggingFace repo id. A live run
        against Groq answered with `llama-3.3-70b-versatile` while this
        endpoint said `Qwen/Qwen3-0.6B` — and the chat header renders this
        value, so the screen contradicted the answer underneath it.
        """
        if selected_provider == OLLAMA:
            return self._settings.ollama_model
        return self._settings.openai_model

    def _agent_layer_available(self) -> bool:
        """Report whether the agent layer could actually answer.

        Deliberately not "did the deterministic fallback construct" — that is
        always true and would report `available: true` for
        `AI_PROVIDER=openai` with no API key, which is exactly the
        misconfiguration this endpoint exists to surface. Checks that the
        optional `agents` extra is installed and that the configured provider
        has what it needs to build a model; it does not make a network call,
        so a reachable-but-down model still reports available (the runtime
        degrades at request time either way).
        """
        if importlib.util.find_spec("strands") is None:
            return False
        try:
            ModelFactory(self._settings).create()
        except Exception:  # noqa: BLE001 - health must never raise
            logger.warning("Agent model could not be constructed for health check", exc_info=True)
            return False
        return True
