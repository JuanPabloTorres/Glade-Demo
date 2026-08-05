from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "FreshStart Bankruptcy Guide"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173"

    jwt_secret: str = "freshstart-public-demo-signing-key-change-before-real-data"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 45
    jwt_issuer: str = "freshstart-guide"
    jwt_audience: str = "freshstart-web"

    demo_client_id: str = "client-demo"
    demo_client_email: str = "client@freshstart.demo"
    demo_client_password: str = "FreshStart!2026"
    demo_client_name: str = "Elena Rivera"

    demo_attorney_id: str = "attorney-demo"
    demo_attorney_email: str = "attorney@freshstart.demo"
    demo_attorney_password: str = "Counsel!2026"
    demo_attorney_name: str = "Lic. Andrea Morales"

    ai_provider: str = "template"
    ai_model_id: str = "Qwen/Qwen3-0.6B"
    ai_max_new_tokens: int = 180

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
