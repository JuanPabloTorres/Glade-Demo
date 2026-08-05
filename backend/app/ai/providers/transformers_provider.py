from __future__ import annotations

import importlib
import logging
from typing import TYPE_CHECKING, Any

from app.ai.providers.base import GuidanceDraft
from app.ai.providers.rule_based import RuleBasedProvider

if TYPE_CHECKING:
    from app.schemas.bankruptcy import CaseAnalysisDto, GuidanceRequestDto

logger = logging.getLogger(__name__)


class TransformersProvider:
    """
    Rewrites the RuleBasedProvider's deterministic draft via a local
    `transformers` pipeline — same "facts stay rule-based, only phrasing
    changes" contract as OllamaProvider. `torch`/`transformers` are
    lazy-imported so this module (and the app) imports cleanly even where
    those optional dependencies aren't installed (the trimmed Vercel
    function). Unlike the pre-refactor `TransformersTextGenerator`, a
    failed load/generate is logged, not silently swallowed (audit finding).
    """

    def __init__(self, model_id: str, max_new_tokens: int) -> None:
        self._model_id = model_id
        self._max_new_tokens = max_new_tokens
        self._pipeline: Any | None = None
        self._torch: Any | None = None
        self._fallback = RuleBasedProvider()

    def is_available(self) -> bool:
        try:
            importlib.import_module("torch")
            importlib.import_module("transformers")
            return True
        except (ImportError, ModuleNotFoundError):
            return False

    def _load(self) -> tuple[Any, Any]:
        if self._pipeline is None or self._torch is None:
            torch = importlib.import_module("torch")
            transformers = importlib.import_module("transformers")
            self._pipeline = transformers.pipeline(
                "text-generation",
                model=self._model_id,
                device_map="auto",
                torch_dtype="auto",
            )
            self._torch = torch
        return self._pipeline, self._torch

    def generate(self, *, request: GuidanceRequestDto, analysis: CaseAnalysisDto) -> GuidanceDraft:
        draft = self._fallback.generate(request=request, analysis=analysis)
        rewritten = self._rewrite(locale=request.locale, draft_message=draft.message)
        if rewritten:
            draft.message = rewritten
        return draft

    def _rewrite(self, *, locale: str, draft_message: str) -> str | None:
        try:
            pipeline, torch = self._load()
            prompt = (
                "You rewrite a draft response for a bankruptcy-preparation assistant into concise, "
                "plain language. Do not add facts, legal advice, promises, or hidden assumptions. "
                f"Reply in locale {locale}.\n\nDraft:\n{draft_message}\n\nRewrite:"
            )
            with torch.inference_mode():
                result = pipeline(
                    prompt,
                    max_new_tokens=self._max_new_tokens,
                    do_sample=False,
                    return_full_text=False,
                )
            generated = result[0].get("generated_text", "") if result else ""
            text = str(generated).strip()
            return text or None
        except (ImportError, ModuleNotFoundError, RuntimeError, ValueError, OSError) as exc:
            logger.warning("Transformers rewrite unavailable, using deterministic draft: %s", exc)
            return None
