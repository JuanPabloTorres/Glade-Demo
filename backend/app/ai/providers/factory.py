from __future__ import annotations

from functools import lru_cache

from app.ai.providers.base import BaseAIProvider
from app.ai.providers.rule_based import RuleBasedProvider
from app.ai.providers.transformers_provider import TransformersProvider
from app.core.config import Settings


@lru_cache
def get_provider(
    provider: str,
    ai_model_id: str,
    ai_max_new_tokens: int,
) -> BaseAIProvider:
    """
    Deterministic-provider selection. Since 4.0.0 (ADR 0002) this factory only
    covers the non-agent providers: `AI_PROVIDER=openai` and `ollama` are
    handled by `app.ai.model_factory.ModelFactory` inside `AgentRuntime`, and
    both fall back to `RuleBasedProvider` here when the agent layer cannot
    answer. Anything unrecognized is rule-based — never an exception, so the
    app degrades safely rather than failing the request.

    Caching by value is safe here only because every provider this factory
    builds is stateless. Strands `Agent` objects are deliberately NOT built
    here: they hold conversation state and are bound to one authorized case,
    so a process-wide cached instance would be shared memory between users.
    """
    normalized = provider.strip().lower()
    if normalized == "transformers":
        return TransformersProvider(model_id=ai_model_id, max_new_tokens=ai_max_new_tokens)
    return RuleBasedProvider()


def get_provider_for_settings(settings: Settings) -> BaseAIProvider:
    return get_provider(
        settings.ai_provider,
        settings.ai_model_id,
        settings.ai_max_new_tokens,
    )
