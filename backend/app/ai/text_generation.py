from __future__ import annotations

import importlib
from functools import lru_cache
from typing import Any, Protocol


class TextGenerator(Protocol):
    def compose(self, *, locale: str, context: str, fallback: str) -> str: ...


class TemplateTextGenerator:
    def compose(self, *, locale: str, context: str, fallback: str) -> str:
        del locale, context
        return fallback


class TransformersTextGenerator:
    def __init__(self, model_id: str, max_new_tokens: int) -> None:
        self._model_id = model_id
        self._max_new_tokens = max_new_tokens
        self._pipeline: Any | None = None
        self._torch: Any | None = None

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

    def compose(self, *, locale: str, context: str, fallback: str) -> str:
        try:
            pipeline, torch = self._load()
            prompt = (
                "You are MatterReady, a professional intake copilot. Rewrite the draft response "
                "in concise, plain language. Do not add facts, legal advice, promises, or hidden "
                f"assumptions. Reply in locale {locale}.\n\nContext:\n{context}\n\n"
                f"Draft response:\n{fallback}\n\nFinal response:"
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
            return text or fallback
        except (ImportError, ModuleNotFoundError, RuntimeError, ValueError, OSError):
            return fallback


@lru_cache
def get_text_generator(provider: str, model_id: str, max_new_tokens: int) -> TextGenerator:
    if provider.strip().lower() == "transformers":
        return TransformersTextGenerator(model_id=model_id, max_new_tokens=max_new_tokens)
    return TemplateTextGenerator()
