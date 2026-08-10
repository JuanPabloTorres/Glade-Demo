"""Application-layer dependency rules that must stay mechanically enforced."""

from __future__ import annotations

import ast
from pathlib import Path

SERVICES_ROOT = Path(__file__).resolve().parents[1] / "app" / "services"


def test_services_do_not_import_concrete_sqlalchemy_repositories() -> None:
    """Services depend on repository protocols, never ORM implementations."""
    violations: list[str] = []

    for service_path in SERVICES_ROOT.rglob("*.py"):
        tree = ast.parse(service_path.read_text(encoding="utf-8"), filename=str(service_path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom):
                continue
            if not (node.module or "").startswith("app.repositories"):
                continue
            for imported in node.names:
                if imported.name.startswith("SqlAlchemy"):
                    relative_path = service_path.relative_to(SERVICES_ROOT.parent.parent)
                    violations.append(f"{relative_path}:{node.lineno} imports {imported.name}")

    assert violations == [], (
        "Services must type-depend on repository protocols, not concrete SQLAlchemy classes:\n"
        + "\n".join(violations)
    )
