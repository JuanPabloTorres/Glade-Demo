"""Deterministic providers for bankruptcy guidance — see docs/architecture/AI-PROVIDER-ARCHITECTURE.md.

`OllamaProvider` was removed in 4.0.0 (ADR 0002). Reaching a local Ollama
model is now the Strands orchestration layer's job
(`app.ai.model_factory` with `AI_PROVIDER=ollama`), not a hand-rolled
`urllib` rewrite step. What remains here is the deterministic floor: the
rule-based provider `AgentRuntime` always computes and falls back to, plus
the local `transformers` rewrite path.
"""

from app.ai.providers.base import BaseAIProvider, GuidanceDraft
from app.ai.providers.factory import get_provider, get_provider_for_settings
from app.ai.providers.rule_based import RuleBasedProvider
from app.ai.providers.transformers_provider import TransformersProvider

__all__ = [
    "BaseAIProvider",
    "GuidanceDraft",
    "RuleBasedProvider",
    "TransformersProvider",
    "get_provider",
    "get_provider_for_settings",
]
