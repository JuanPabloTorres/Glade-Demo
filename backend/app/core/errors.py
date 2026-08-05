class DomainError(Exception):
    """Base exception for expected domain failures."""


class NotFoundError(DomainError):
    pass


class ValidationError(DomainError):
    pass
