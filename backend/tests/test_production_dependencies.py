from pathlib import Path

# Heavy AI/ML dependencies must never leak into the lightweight Vercel
# function's requirements.txt (audit finding: nothing previously guarded
# this). They belong only in backend/requirements-ai.txt and the `ai`/
# `documents` pyproject optional-dependency groups.
HEAVY_AI_DEPENDENCIES = (
    "torch",
    "transformers",
    "sentence-transformers",
    "accelerate",
    "docling",
    "faiss",
    "chromadb",
    "pymupdf",
    "python-docx",
    "openpyxl",
    "pytesseract",
    "unstructured",
    # Strands orchestration layer (ADR 0002) and its model-provider extras.
    # Same reasoning as the ML packages above: the Vercel function runs with
    # AI_PROVIDER=rule_based and answers deterministically, so shipping the
    # agent SDK (plus the openai/ollama clients it pulls) there would be dead
    # weight in a size-constrained runtime.
    "strands-agents",
    "openai",
    "ollama",
)


def _requirements_text() -> str:
    return (
        (Path(__file__).resolve().parents[2] / "requirements.txt")
        .read_text(encoding="utf-8")
        .lower()
    )


def test_vercel_runtime_includes_authentication_dependencies() -> None:
    requirements = _requirements_text()
    assert "pyjwt" in requirements
    assert "pwdlib[argon2]" in requirements


def test_vercel_runtime_excludes_heavy_ai_dependencies() -> None:
    requirements = _requirements_text()
    leaked = [name for name in HEAVY_AI_DEPENDENCIES if name in requirements]
    assert not leaked, (
        f"Heavy AI dependencies leaked into requirements.txt (would break the "
        f"Vercel function): {leaked}. Move them to backend/requirements-ai.txt "
        f"or a pyproject optional-dependency group instead."
    )
