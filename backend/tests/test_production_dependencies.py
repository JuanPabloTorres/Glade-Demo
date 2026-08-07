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
)

# Deliberately NOT in the list above, though it was until 4.5.0: the Strands
# SDK and its OpenAI client. The original reasoning was that the function ran
# `rule_based` anyway, so the SDK was dead weight in a size-constrained
# runtime. The first half stopped being true when this deployment was asked to
# run the agent, and the second half was never measured: installing
# `strands-agents[openai]` on top of the rest of this file takes a clean
# environment from 101 MB to 163 MB, against Vercel's 250 MB unzipped limit.
#
# The heavy ML packages above stay banned — those are hundreds of megabytes and
# nothing in this deployment path imports them.
AGENT_SDK = "strands-agents"


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


def test_vercel_runtime_includes_the_agent_sdk() -> None:
    """The agent has to be able to run on the deployed demo, not only locally.

    Ollama needs a local model server and a serverless function has none, so
    the OpenAI extra is the only route to a working agent on this target. With
    it absent, `AgentRuntime` catches the ImportError and every answer comes
    back from the deterministic fallback marked `degraded` — which is a fine
    fallback and a poor demo of the thing 4.0.0 was built for.
    """
    assert AGENT_SDK in _requirements_text()


def test_the_agent_sdk_is_pinned_to_a_major_version() -> None:
    """An unpinned SDK is a deployment that changes behaviour on a redeploy
    nobody made. The runtime degrades rather than 500s on an incompatibility,
    so the failure mode is silent."""
    requirements = _requirements_text()
    agent_line = next(line for line in requirements.splitlines() if line.startswith(AGENT_SDK))
    assert "<" in agent_line, f"{agent_line!r} has no upper bound"
