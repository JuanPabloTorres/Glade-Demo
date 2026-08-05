"""Export the current FastAPI OpenAPI document for review and contract diffing."""

from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from app.main import app  # noqa: E402

OUTPUT = ROOT / "docs" / "openapi.json"
OUTPUT.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
print(f"Wrote {OUTPUT}")
