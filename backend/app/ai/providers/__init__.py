"""Pluggable AI providers for bankruptcy guidance — see docs/architecture/AI-PROVIDER-ARCHITECTURE.md."""

from app.ai.providers.base import BaseAIProvider, GuidanceDraft
from app.ai.providers.factory import get_provider, get_provider_for_settings
from app.ai.providers.ollama_provider import OllamaProvider
from app.ai.providers.rule_based import RuleBasedProvider
from app.ai.providers.transformers_provider import TransformersProvider

__all__ = [
    "BaseAIProvider",
    "GuidanceDraft",
    "OllamaProvider",
    "RuleBasedProvider",
    "TransformersProvider",
    "get_provider",
    "get_provider_for_settings",
]
