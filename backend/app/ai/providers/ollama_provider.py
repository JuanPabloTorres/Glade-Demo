from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import TYPE_CHECKING

from app.ai.providers.base import GuidanceDraft, build_untrusted_case_data_block
from app.ai.providers.rule_based import RuleBasedProvider

if TYPE_CHECKING:
    from app.schemas.assistant import CaseContextDto

logger = logging.getLogger(__name__)

_REWRITE_SYSTEM_PROMPT = (
    "You rewrite a draft response for a bankruptcy-preparation assistant into concise, plain "
    "language. Do not add facts, legal advice, promises, eligibility claims, or a chapter "
    "recommendation. Do not invent requirements. Keep the same meaning and the same language as "
    "the draft (the app is Spanish-only today)."
)


class OllamaProvider:
    """
    Rewrites the RuleBasedProvider's deterministic draft via a local Ollama
    model — never generates facts, actions, or the focus section itself
    (those stay rule-based; only `message` phrasing changes). Degrades to
    the untouched deterministic draft on any error, unavailability, or
    timeout, per master instruction §7.2 ("nunca debe bloquear toda la
    aplicación porque el modelo no responde"). Uses stdlib `urllib` instead
    of adding a runtime HTTP dependency — this provider only ever runs in
    local/Docker/VPS environments, never in the trimmed Vercel function.
    """

    def __init__(self, base_url: str, model: str, timeout_ms: int = 60000) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout_seconds = max(1.0, timeout_ms / 1000)
        self._fallback = RuleBasedProvider()

    def is_available(self) -> bool:
        try:
            request = urllib.request.Request(f"{self._base_url}/api/tags", method="GET")
            with urllib.request.urlopen(request, timeout=self._timeout_seconds):
                return True
        except Exception:  # noqa: BLE001 - availability probe must never raise
            return False

    def generate(self, *, context: CaseContextDto, message: str) -> GuidanceDraft:
        draft = self._fallback.generate(context=context, message=message)
        rewritten = self._rewrite(draft_message=draft.message, context=context)
        if rewritten:
            draft.message = rewritten
        return draft

    def _rewrite(self, *, draft_message: str, context: CaseContextDto) -> str | None:
        # Retrieved RAG chunks (context.retrieved_documents) may contain
        # attacker- or client-authored text; build_untrusted_case_data_block
        # frames them as inert reference data, never as instructions, before
        # they ever reach the model (prompt-injection defense — see its
        # docstring). Only `draft.message` phrasing can be influenced this
        # way; intent/actions/focus_section/requires_attorney_review were
        # already decided by RuleBasedProvider above and are untouched here.
        case_data_block = build_untrusted_case_data_block(context)
        prompt = (
            f"{_REWRITE_SYSTEM_PROMPT}\n\n{case_data_block}Draft:\n{draft_message}\n\nRewrite:"
        )
        payload = json.dumps(
            {"model": self._model, "prompt": prompt, "stream": False}
        ).encode("utf-8")
        try:
            http_request = urllib.request.Request(
                f"{self._base_url}/api/generate",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(http_request, timeout=self._timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
            text = str(body.get("response", "")).strip()
            return text or None
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as exc:
            logger.warning("Ollama rewrite unavailable, using deterministic draft: %s", exc)
            return None
