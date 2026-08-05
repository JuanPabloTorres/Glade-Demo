"""
Provider-architecture tests (master instruction §7.2 acceptance criteria):
rule-based always succeeds; Ollama unavailable falls back to the
deterministic draft; transformers import error falls back to the
deterministic draft. No real network or model calls happen here — Ollama
and transformers are exercised entirely through monkeypatched stand-ins.
"""

from __future__ import annotations

import urllib.error

import pytest

from app.ai.providers.factory import get_provider
from app.ai.providers.ollama_provider import OllamaProvider
from app.ai.providers.rule_based import RuleBasedProvider
from app.ai.providers.transformers_provider import TransformersProvider
from app.schemas.bankruptcy import BankruptcyCaseDto, CaseAnalysisDto, GuidanceRequestDto
from app.services.bankruptcy_service import BankruptcyAnalysisService


def _request(message: str = "¿Qué me falta?", role: str = "client") -> GuidanceRequestDto:
    case = BankruptcyCaseDto(
        id="case-provider-test",
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
        status="collecting_information",
    )
    return GuidanceRequestDto(case=case, message=message, role=role, locale="es")


def _analysis(request: GuidanceRequestDto) -> CaseAnalysisDto:
    return BankruptcyAnalysisService().analyze(request.case)


class TestRuleBasedProvider:
    def test_always_available(self) -> None:
        assert RuleBasedProvider().is_available() is True

    def test_generates_a_draft_for_every_branch(self) -> None:
        provider = RuleBasedProvider()
        for message, role in [
            ("¿qué me falta?", "client"),
            ("tengo dudas sobre chapter 7", "client"),
            ("dudas sobre chapter 13", "client"),
            ("resumen del caso", "attorney"),
        ]:
            request = _request(message=message, role=role)
            draft = provider.generate(request=request, analysis=_analysis(request))
            assert draft.message
            assert draft.intent
            assert draft.focus_section


class TestOllamaProvider:
    def test_unavailable_falls_back_to_deterministic_draft(self, monkeypatch: pytest.MonkeyPatch) -> None:
        provider = OllamaProvider(base_url="http://localhost:11434", model="qwen3:4b")

        def raise_connection_error(*_args: object, **_kwargs: object) -> None:
            raise urllib.error.URLError("connection refused")

        monkeypatch.setattr("urllib.request.urlopen", raise_connection_error)

        request = _request()
        analysis = _analysis(request)
        baseline = RuleBasedProvider().generate(request=request, analysis=analysis)
        draft = provider.generate(request=request, analysis=analysis)

        assert draft.message == baseline.message
        assert draft.focus_section == baseline.focus_section
        assert provider.is_available() is False

    def test_rewrite_replaces_message_when_ollama_responds(self, monkeypatch: pytest.MonkeyPatch) -> None:
        provider = OllamaProvider(base_url="http://localhost:11434", model="qwen3:4b")

        class FakeResponse:
            def __enter__(self) -> FakeResponse:
                return self

            def __exit__(self, *_exc_info: object) -> None:
                return None

            def read(self) -> bytes:
                return b'{"response": "Texto reescrito por el modelo."}'

        monkeypatch.setattr("urllib.request.urlopen", lambda *_a, **_k: FakeResponse())

        request = _request()
        draft = provider.generate(request=request, analysis=_analysis(request))
        assert draft.message == "Texto reescrito por el modelo."


class TestTransformersProvider:
    def test_import_error_falls_back_to_deterministic_draft(self, monkeypatch: pytest.MonkeyPatch) -> None:
        provider = TransformersProvider(model_id="Qwen/Qwen3-0.6B", max_new_tokens=180)

        def raise_import_error(_name: str) -> None:
            raise ModuleNotFoundError("torch is not installed")

        monkeypatch.setattr("importlib.import_module", raise_import_error)

        request = _request()
        analysis = _analysis(request)
        baseline = RuleBasedProvider().generate(request=request, analysis=analysis)
        draft = provider.generate(request=request, analysis=analysis)

        assert draft.message == baseline.message
        assert provider.is_available() is False


class TestProviderFactory:
    def test_defaults_to_rule_based(self) -> None:
        provider = get_provider("rule_based", "http://localhost:11434", "qwen3:4b", "model", 180)
        assert isinstance(provider, RuleBasedProvider)

    def test_unknown_provider_name_defaults_to_rule_based(self) -> None:
        provider = get_provider("something-unrecognized", "http://localhost:11434", "qwen3:4b", "model", 180)
        assert isinstance(provider, RuleBasedProvider)

    def test_selects_ollama(self) -> None:
        provider = get_provider("ollama", "http://localhost:11434", "qwen3:4b", "model", 180)
        assert isinstance(provider, OllamaProvider)

    def test_selects_transformers(self) -> None:
        provider = get_provider("transformers", "http://localhost:11434", "qwen3:4b", "model", 180)
        assert isinstance(provider, TransformersProvider)
