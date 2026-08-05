from functools import lru_cache
from pathlib import Path


@lru_cache
def get_app_version() -> str:
    candidates = [
        Path(__file__).resolve().parents[3] / "VERSION",
        Path.cwd() / "VERSION",
        Path.cwd().parent / "VERSION",
    ]
    source = next((path for path in candidates if path.exists()), None)
    if source is None:
        raise RuntimeError("VERSION file was not found")
    return source.read_text(encoding="utf-8").strip()


APP_VERSION = get_app_version()
