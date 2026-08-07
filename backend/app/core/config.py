import logging
from functools import lru_cache
from typing import ClassVar

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Security audit finding #3 (docs/audits/GLADE-DEMO-GROUNDED-STATE-
    # 2026-08-06.md §5): this literal must stay a named constant, not just an
    # inline default, so `_reject_default_jwt_secret_in_production` below can
    # compare against the exact same value without duplicating the string.
    DEFAULT_JWT_SECRET: ClassVar[str] = "freshstart-public-demo-signing-key-change-before-real-data"
    DEFAULT_CORS_ORIGINS: ClassVar[str] = "http://localhost:5173"

    app_name: str = "FreshStart Bankruptcy Guide"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = DEFAULT_CORS_ORIGINS

    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 45
    jwt_issuer: str = "freshstart-guide"
    jwt_audience: str = "freshstart-web"

    # Login brute-force throttling (audit finding #2: "no rate limiting on
    # login... no lockout, no delay, no attempt counter"). Enforced by the
    # in-memory sliding-window limiter in app.core.security, keyed by
    # (client IP, attempted email) so unrelated users/IPs never share a
    # counter. Configurable here rather than hardcoded so a real deployment
    # can tune it without a code change; the defaults (5 attempts / 5
    # minutes) match OWASP's typical login-throttling guidance for a demo
    # of this size.
    login_rate_limit_max_attempts: int = 5
    login_rate_limit_window_seconds: int = 300

    demo_client_id: str = "client-demo"
    demo_client_email: str = "client@freshstart.demo"
    demo_client_password: str = "FreshStart!2026"
    demo_client_name: str = "Elena Rivera"

    demo_attorney_id: str = "attorney-demo"
    demo_attorney_email: str = "attorney@freshstart.demo"
    demo_attorney_password: str = "Counsel!2026"
    demo_attorney_name: str = "Lic. Andrea Morales"

    # Persistence (docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §3: this
    # field previously did not exist on Settings at all, so `DATABASE_URL`
    # set by api/index.py's Vercel entrypoint was silently dropped by
    # `extra="ignore"` — dead config, no real connection. It is read for
    # real now by app.repositories.database.
    #
    # SQLite (file-based) is intentionally the only backend wired up for
    # this demo: zero infra to stand up, trivial to reset (see
    # backend/scripts/seed_demo_data.py), good enough for the case volumes a
    # demo ever sees. Upgrade path to Postgres: swap this URL to a
    # `postgresql+psycopg://` DSN (add `psycopg[binary]` to pyproject
    # dependencies), then run `alembic upgrade head` against it — every
    # model in app/repositories/orm_models.py uses portable SQLAlchemy
    # column types (no SQLite-only features), so no schema changes are
    # required, only the connection string and driver.
    database_url: str = "sqlite:///./data/freshstart.db"

    # Populate an *empty* database with the synthetic demo case at boot.
    #
    # Off by default, and deliberately not inferred from `environment`: the
    # one deployment that needs it (a serverless function whose SQLite file
    # lives in a per-instance `/tmp`) also runs with ENVIRONMENT=production,
    # so an environment-based rule would either miss it or arm itself on a
    # real production database. An explicit opt-in is the only honest signal.
    #
    # `seed_demo_data_if_absent` still refuses to write over existing rows, so
    # the worst case of leaving this on is a no-op, never data loss.
    seed_demo_data_on_startup: bool = False

    # AI provider selection (ADR 0002). Four values:
    #   rule_based   — default. Deterministic, no network, no model. Always
    #                  available and always the fallback for the others.
    #   openai       — Strands orchestration against OpenAI. Requires
    #                  OPENAI_API_KEY; sends reduced case context off-host.
    #   ollama       — Strands orchestration against a local Ollama server.
    #                  No egress. This replaces the removed OllamaProvider,
    #                  which only ever rephrased a deterministic draft.
    #   transformers — local rephrase-only provider, unchanged.
    # Never hardcode a model id here beyond these defaults — override via env.
    ai_provider: str = "rule_based"
    ai_model_id: str = "Qwen/Qwen3-0.6B"
    ai_max_new_tokens: int = 180
    # Shared by both Strands model providers (ModelFactory). Temperature is
    # low by default because this assistant reports figures it was handed and
    # must not embellish them.
    ai_temperature: float = 0.2
    ai_max_output_tokens: int = 1500
    openai_api_key: SecretStr | None = None
    # OpenAI's own model id, mirroring `ollama_model` below.
    #
    # It is not `ai_model_id`: that one defaults to a HuggingFace repo id for
    # the transformers provider, and handing `Qwen/Qwen3-0.6B` to OpenAI makes
    # every call fail — which the runtime turns into a silent degrade, so the
    # symptom is "the agent never answers" with nothing in the response saying
    # why. Each provider names its own model.
    openai_model: str = "gpt-4o-mini"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:4b"
    ollama_embedding_model: str = "nomic-embed-text"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @model_validator(mode="after")
    def _reject_default_jwt_secret_in_production(self) -> "Settings":
        # Security audit finding #3: refuse to boot rather than silently
        # sign production tokens with a publicly-known demo secret. Fires
        # the moment Settings() is constructed, which is at import time for
        # the real app (see `settings = get_settings()` in app.main) — not
        # just in some narrower, skippable "startup check" path.
        if self.environment == "production" and self.jwt_secret == self.DEFAULT_JWT_SECRET:
            raise ValueError(
                "JWT_SECRET must be overridden before running with ENVIRONMENT=production. "
                "Refusing to boot with the public demo signing key "
                f"({self.DEFAULT_JWT_SECRET!r})."
            )
        return self

    @model_validator(mode="after")
    def _warn_default_cors_origin_in_production(self) -> "Settings":
        # QA release gate finding: no production CORS origin is committed
        # anywhere in the repo (render.yaml deliberately leaves CORS_ORIGINS
        # unsynced/manual; Vercel's api/index.py never sets it, relying on
        # vercel.json's same-origin rewrite instead). Unlike the JWT secret
        # above, a stale default here does not automatically mean the app is
        # broken or insecure in every deployment topology — a same-origin
        # deployment (frontend and API behind one Vercel domain, per
        # vercel.json's rewrite) never triggers the browser's CORS checks at
        # all. So this is a loud, non-fatal warning rather than a boot
        # refusal: it would be wrong to crash a working same-origin
        # deployment that simply never needed to set CORS_ORIGINS, but any
        # deployment that DOES split frontend/API across origins (e.g. the
        # Render backend) needs to see this before assuming CORS is handled.
        if self.environment == "production" and self.cors_origins == self.DEFAULT_CORS_ORIGINS:
            logger.warning(
                "CORS_ORIGINS is still the localhost default (%r) while "
                "ENVIRONMENT=production. This is fine for a same-origin "
                "deployment (frontend and API on one domain) but will "
                "silently break any cross-origin frontend. Set CORS_ORIGINS "
                "explicitly if the frontend is served from a different "
                "origin than this API.",
                self.DEFAULT_CORS_ORIGINS,
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
