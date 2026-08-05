import re


def normalize_value(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())
