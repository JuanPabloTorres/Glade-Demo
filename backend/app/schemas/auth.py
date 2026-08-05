from typing import Literal

from pydantic import Field, field_validator

from app.schemas.common import ApiModel

UserRole = Literal["client", "attorney"]


class LoginDto(ApiModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=200)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthUserDto(ApiModel):
    id: str
    email: str
    name: str
    role: UserRole


class AuthTokenDto(ApiModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUserDto
