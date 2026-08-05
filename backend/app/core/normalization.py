import re


def normalize_value(value: str) -> str:
    """Normalize human-entered values for deterministic equality checks."""

    return re.sub(r"[^a-z0-9]", "", value.casefold())
