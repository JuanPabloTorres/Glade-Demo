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


class TestDeclinationRaisesReview:
    """
    The defect the live agent run recorded (`changes/chat-modal-centered.md`
    §3, defect 2): the assistant answered "No podemos determinar si debes
    declararte en bancarrota o no. Por favor, habla con tu abogado" and
    returned `requires_attorney_review: false`.

    An answer that declines to advise and routes to a lawyer is precisely the
    one a lawyer has to see. Unlike the softening triggers, the message is left
    exactly as written — it is already correct.
    """

    def test_the_verbatim_live_run_answer_now_requires_review(self) -> None:
        message = (
            "No podemos determinar si debes declararte en bancarrota o no. "
            "Por favor, habla con tu abogado."
        )
        result = ResponseGuardrails().review(message)

        assert result.requires_attorney_review is True
        assert result.message == message, "a declination is correct as written; do not rewrite it"

    def test_english_declination_is_caught_too(self) -> None:
        result = ResponseGuardrails().review(
            "We cannot determine whether you should file. Please talk to your attorney.",
            language="en",
        )
        assert result.requires_attorney_review is True
        assert "declines_to_answer" in result.triggered
        assert "refers_to_attorney" in result.triggered

    def test_merely_naming_the_attorney_is_not_a_declination(self) -> None:
        # Routing work to the attorney is what this product does; almost every
        # answer mentions them. Only a declination or a direct referral counts,
        # otherwise the flag would be permanently on and mean nothing.
        result = ResponseGuardrails().review(
            "El abogado revisará las alertas del expediente cuando envíes la solicitud."
        )
        assert result.requires_attorney_review is False
        assert result.triggered == []


class TestGuardrailsSpeakTheSessionLanguage:
    """
    Until 4.2.0 every pattern and every replacement was Spanish, so an English
    session had no eligibility guard and no advice guard at all — the product
    boundary held for `es` and was simply absent for `en`.
    """

    def test_english_eligibility_claim_is_softened_and_flagged(self) -> None:
        result = ResponseGuardrails().review(
            "You qualify for Chapter 7 based on your income.", language="en"
        )
        assert result.requires_attorney_review is True
        assert "eligibility_claim" in result.triggered
        assert "You qualify" not in result.message

    def test_english_definitive_advice_is_softened_and_flagged(self) -> None:
        result = ResponseGuardrails().review(
            "You must file the petition this week.", language="en"
        )
        assert result.requires_attorney_review is True
        assert "definitive_advice" in result.triggered

    def test_the_caveat_is_in_the_session_language(self) -> None:
        english = ResponseGuardrails().review("You qualify for a discharge.", language="en")
        spanish = ResponseGuardrails().review("Usted califica para un descargo.")

        assert "licensed attorney" in english.message
        assert "abogado autorizado" not in english.message
        assert "abogado autorizado" in spanish.message
