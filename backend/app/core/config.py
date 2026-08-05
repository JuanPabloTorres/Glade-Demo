from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "MatterReady Demo"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./matter_ready.db"
    cors_origins: str = "http://localhost:5173"
    document_intelligence_provider: str = "rules"

    jwt_secret: str = "matterready-public-demo-signing-key-change-before-real-data"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 30
    jwt_issuer: str = "matterready"
    jwt_audience: str = "matterready-web"

    demo_user_email: str = "reviewer@matterready.app"
    demo_user_password: str = "MatterReady!2026"
    demo_user_name: str = "Alex Rivera"
    demo_user_role: str = "Case Reviewer"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
