"""
Guardrail tests (master instruction §7.7 acceptance criteria): legal-advice
phrasing rejected/softened, chapter-preference phrasing rejected/softened,
eligibility claims rejected/softened, and a clean message passes through
untouched.
"""

from __future__ import annotations

from app.ai.guardrails import ResponseGuardrails


def test_eligibility_claim_is_softened_and_flagged() -> None:
    result = ResponseGuardrails().review("Usted califica para Chapter 7 según sus ingresos.")
    assert "califica" not in result.message.casefold()
    assert "eligibility_claim" in result.triggered
    assert result.requires_attorney_review is True


def test_chapter_best_option_claim_is_softened_and_flagged() -> None:
    result = ResponseGuardrails().review("Chapter 7 es la mejor opción para su situación.")
    assert "es la mejor opción" not in result.message.casefold()
    assert "chapter_best_option_claim" in result.triggered
    assert result.requires_attorney_review is True


def test_definitive_legal_advice_is_softened_and_flagged() -> None:
    result = ResponseGuardrails().review("Usted debe presentar la petición esta semana.")
    assert "debe presentar" not in result.message.casefold()
    assert "definitive_advice" in result.triggered
    assert result.requires_attorney_review is True


def test_clean_message_passes_through_untouched() -> None:
    original = "El próximo paso es completar la lista de acreedores."
    result = ResponseGuardrails().review(original)
    assert result.message == original
    assert result.triggered == []
    assert result.requires_attorney_review is False


def test_triggered_message_includes_review_caveat_once() -> None:
    result = ResponseGuardrails().review("Usted califica para el descargo de deudas.")
    assert result.message.count("confirmación de un abogado autorizado") == 1
