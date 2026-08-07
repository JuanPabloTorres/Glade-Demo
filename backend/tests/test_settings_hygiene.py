"""
Environment values arrive dirty, and one of them took down the agent.

Piping a value into `vercel env add` stored the pipeline's trailing newline as
part of it. Production then ran with `OPENAI_MODEL="llama-3.3-70b-versatile\\r\\n"`
and an API key carrying the same tail — so every model call was rejected,
`AgentRuntime` caught the failure, and the assistant answered from the
deterministic draft. Nothing in the response said why; the only symptom was an
agent that never engaged.

A stray newline in a dashboard-entered variable is invisible, easy to produce,
and fails silently here. These pin that it cannot.
"""

from __future__ import annotations

import pytest

from app.core.config import Settings


class TestWhitespaceInEnvironmentValues:
    @pytest.mark.parametrize("tail", ["\r\n", "\n", " ", "\t", "  \r\n  "])
    def test_the_model_id_survives_a_trailing_newline(self, tail: str) -> None:
        assert Settings(openai_model=f"llama-3.3-70b-versatile{tail}").openai_model == (
            "llama-3.3-70b-versatile"
        )

    def test_the_base_url_survives_one(self) -> None:
        # The failure this caused is worth naming: a base URL with a trailing
        # newline builds request paths like `.../v1\r\n/chat/completions`.
        settings = Settings(openai_base_url="https://api.groq.com/openai/v1\r\n")
        assert settings.openai_base_url == "https://api.groq.com/openai/v1"

    def test_the_api_key_survives_one(self) -> None:
        settings = Settings(openai_api_key="gsk_example_key\r\n")
        assert settings.openai_api_key is not None
        assert settings.openai_api_key.get_secret_value() == "gsk_example_key"

    def test_the_database_url_survives_one(self) -> None:
        assert Settings(database_url="  sqlite:///./x.db\n").database_url == "sqlite:///./x.db"

    def test_the_jwt_secret_survives_one(self) -> None:
        # Matters twice over: a padded secret signs tokens that a differently
        # padded process cannot verify.
        assert Settings(jwt_secret="a-real-secret\r\n").jwt_secret == "a-real-secret"

    def test_non_string_settings_are_untouched(self) -> None:
        settings = Settings(ai_temperature=0.7, jwt_expiration_minutes=30)
        assert settings.ai_temperature == 0.7
        assert settings.jwt_expiration_minutes == 30

    def test_interior_whitespace_is_preserved(self) -> None:
        # Only the surrounding whitespace goes. A value that legitimately
        # contains spaces keeps them.
        assert Settings(app_name="  FreshStart Bankruptcy Guide  ").app_name == (
            "FreshStart Bankruptcy Guide"
        )

    def test_a_padded_default_jwt_secret_is_still_rejected_in_production(self) -> None:
        # The guard compares against an exact literal, so trimming has to
        # happen first or a trailing newline would smuggle the public demo key
        # into a production deployment.
        with pytest.raises(ValueError, match="JWT_SECRET"):
            Settings(environment="production", jwt_secret=f"{Settings.DEFAULT_JWT_SECRET}\r\n")
