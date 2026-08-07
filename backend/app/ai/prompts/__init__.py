"""
Locale-aware prompt loading.

System prompts live as Markdown next to this module (`es/`, `en/`) instead of
as string literals inside the agent factories, so prompt wording can be
reviewed as prose in a diff and translated without touching Python. The
shared rules every agent inherits live in `_common.md` and are prepended to
each specialist prompt, which is what keeps the non-negotiables (no
eligibility, no chapter choice, tools are the only source of facts) from
drifting apart across six files.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_PROMPT_ROOT = Path(__file__).resolve().parent
_DEFAULT_LANGUAGE = "es"
_COMMON = "_common"


class PromptNotFoundError(FileNotFoundError):
    pass


@lru_cache(maxsize=64)
def load_prompt(name: str, language: str) -> str:
    """Return the shared rules followed by the named agent prompt.

    Falls back to the default language rather than raising, so adding an
    agent in Spanish only degrades to a Spanish system prompt (the model is
    still told which language to answer in by the runtime) instead of
    failing the request.
    """
    common = _read(_COMMON, language)
    body = _read(name, language)
    return f"{common}\n\n{body}"


def _read(name: str, language: str) -> str:
    for candidate in (language, _DEFAULT_LANGUAGE):
        path = _PROMPT_ROOT / candidate / f"{name}.md"
        if path.is_file():
            return path.read_text(encoding="utf-8").strip()
    raise PromptNotFoundError(f"No prompt {name!r} for language {language!r} or {_DEFAULT_LANGUAGE!r}.")
