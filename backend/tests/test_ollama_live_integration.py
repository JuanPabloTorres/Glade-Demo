"""
Real-Ollama integration test (QA release gate finding: "Ollama tested
against a real reachable instance — NOT MET, unchanged from baseline").
Every other Ollama test in this suite (`test_ai_providers.py`) exercises
`OllamaProvider` entirely through monkeypatched `urllib.request.urlopen`
stand-ins — genuinely useful for the fallback-safety contract, but it never
proves the provider actually talks to a real model server correctly.

This file is the real thing: it probes `OLLAMA_BASE_URL` for a live daemon
at collection time and skips cleanly (not "erroring", not "silently
passing") when none is reachable — which is the expected state in CI and in
most contributors' sandboxes. Run it locally with an actual `ollama serve`
+ `ollama pull <model>` to get real coverage; that combination was not
available in the environment this test was authored in, so it has not
itself been exercised against a live model — only verified to skip cleanly
when Ollama is absent, which is the failure mode this file exists to close.
"""

from __future__ import annotations

import urllib.error
import urllib.request

import pytest

from app.ai.providers.ollama_provider import OllamaProvider
from app.core.config import get_settings
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto, UserRole
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder


def _ollama_reachable() -> bool:
    settings = get_settings()
    try:
        with urllib.request.urlopen(f"{settings.ollama_base_url}/api/tags", timeout=1.5):
            return True
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


_SKIP_REASON = (
    "No reachable Ollama daemon at settings.ollama_base_url — this is expected "
    "in CI and most sandboxes. Run `ollama serve` (+ `ollama pull <ollama_model>`) "
    "locally to exercise this test for real."
)


def _context(role: UserRole = "client", locale: str = "es-PR") -> CaseContextDto:
    case = BankruptcyCaseDto(
        id="case-ollama-live-test",
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
        status="collecting_information",
    )
    analysis = BankruptcyAnalysisService().analyze(case)
    return CaseContextBuilder().build(case, analysis, role, locale)


def _provider() -> OllamaProvider:
    settings = get_settings()
    return OllamaProvider(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
        timeout_ms=settings.ollama_timeout_ms,
    )


@pytest.mark.skipif(not _ollama_reachable(), reason=_SKIP_REASON)
class TestOllamaLiveIntegration:
    def test_is_available_reports_true_against_a_real_daemon(self) -> None:
        assert _provider().is_available() is True

    def test_generate_rewrites_the_deterministic_draft_via_a_real_model(self) -> None:
        provider = _provider()
        context = _context()
        message = "¿Qué me falta para completar mi caso?"

        # The safety contract (docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md
        # §4): a model-backed provider may only ever change `message` phrasing,
        # never the structured facts the rule-based provider decided.
        baseline = provider._fallback.generate(context=context, message=message)  # noqa: SLF001
        draft = provider.generate(context=context, message=message)

        assert draft.intent == baseline.intent
        assert draft.focus_section == baseline.focus_section
        assert draft.suggested_actions == baseline.suggested_actions
        assert draft.requires_attorney_review == baseline.requires_attorney_review
        # Against a real model, the rewritten message is not guaranteed to
        # differ from the deterministic draft (a well-behaved small model
        # asked to preserve meaning may reproduce it closely) — the
        # contract we can assert unconditionally is that a message exists,
        # not exact equality or inequality with the baseline.
        assert draft.message
        assert isinstance(draft.message, str)
