from __future__ import annotations

from functools import lru_cache

from app.ai.providers.base import BaseAIProvider
from app.ai.providers.ollama_provider import OllamaProvider
from app.ai.providers.rule_based import RuleBasedProvider
from app.ai.providers.transformers_provider import TransformersProvider
from app.core.config import Settings


@lru_cache
def get_provider(
    provider: str,
    ollama_base_url: str,
    ollama_model: str,
    ai_model_id: str,
    ai_max_new_tokens: int,
) -> BaseAIProvider:
    """
    Provider selection per `AI_PROVIDER` (master instruction §7.2). Never
    raises on a misconfigured/unreachable model — every non-rule_based
    provider wraps RuleBasedProvider and only ever changes phrasing, so the
    app degrades safely rather than failing the request.
    """
    normalized = provider.strip().lower()
    if normalized == "ollama":
        return OllamaProvider(base_url=ollama_base_url, model=ollama_model)
    if normalized == "transformers":
        return TransformersProvider(model_id=ai_model_id, max_new_tokens=ai_max_new_tokens)
    return RuleBasedProvider()


def get_provider_for_settings(settings: Settings) -> BaseAIProvider:
    return get_provider(
        settings.ai_provider,
        settings.ollama_base_url,
        settings.ollama_model,
        settings.ai_model_id,
        settings.ai_max_new_tokens,
    )
