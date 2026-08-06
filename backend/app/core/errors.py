class DomainError(Exception):
    """Base exception for expected domain failures."""

    code: str = "INTERNAL_ERROR"
    message_key: str = "errors.codes.INTERNAL_ERROR"

    def __init__(self, message: str = "", parameters: dict[str, object] | None = None) -> None:
        super().__init__(message)
        self.parameters = parameters or {}


class NotFoundError(DomainError):
    code = "RESOURCE_NOT_FOUND"
    message_key = "errors.codes.RESOURCE_NOT_FOUND"


class ValidationError(DomainError):
    code = "VALIDATION_ERROR"
    message_key = "errors.codes.VALIDATION_ERROR"
