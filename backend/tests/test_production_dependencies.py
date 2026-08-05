from pathlib import Path


def test_vercel_runtime_includes_authentication_dependencies() -> None:
    requirements = (
        Path(__file__).resolve().parents[2] / "requirements.txt"
    ).read_text(encoding="utf-8").lower()

    assert "pyjwt" in requirements
    assert "pwdlib[argon2]" in requirements
