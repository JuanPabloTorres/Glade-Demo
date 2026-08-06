from __future__ import annotations

from app.ai.providers.factory import get_provider_for_settings
from app.core.config import Settings
from app.schemas.common import AIHealthDto


class AIHealthService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def get_health(self) -> AIHealthDto:
        provider = get_provider_for_settings(self._settings)
        selected_provider = self._settings.ai_provider.strip().lower() or "rule_based"
        model = self._settings.ollama_model if selected_provider == "ollama" else self._settings.ai_model_id
        return AIHealthDto(
            status="ok",
            provider=selected_provider,
            model=model,
            available=provider.is_available(),
        )
