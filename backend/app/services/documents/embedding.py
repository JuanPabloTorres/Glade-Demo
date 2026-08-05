from __future__ import annotations

import hashlib
import json
import logging
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

_CONNECT_TIMEOUT_SECONDS = 2.0
_FALLBACK_DIMENSIONS = 64


class EmbeddingService:
    """
    Master instruction §7.6: "Sentence Transformers u Ollama embeddings."
    Tries Ollama's embeddings endpoint (`OLLAMA_EMBEDDING_MODEL`) when
    configured; on any failure/unavailability, falls back to a
    deterministic, dependency-free hash embedding — same safe-degrade
    pattern as the AI providers (Block 8).

    The hash fallback carries **no real semantic meaning** — it exists so
    CaseDocumentIndex's retrieval/isolation plumbing is deterministic and
    testable entirely offline (backend/tests/test_document_pipeline.py).
    Real retrieval quality requires OLLAMA_EMBEDDING_MODEL configured
    against a running Ollama instance, or a future sentence-transformers-
    backed implementation behind this same interface.
    """

    def __init__(self, ollama_base_url: str | None = None, ollama_embedding_model: str | None = None) -> None:
        self._ollama_base_url = ollama_base_url.rstrip("/") if ollama_base_url else None
        self._ollama_embedding_model = ollama_embedding_model

    def embed(self, text: str) -> list[float]:
        vector = self._try_ollama(text)
        return vector if vector is not None else self._deterministic_fallback(text)

    def _try_ollama(self, text: str) -> list[float] | None:
        if not self._ollama_base_url or not self._ollama_embedding_model:
            return None
        payload = json.dumps({"model": self._ollama_embedding_model, "prompt": text}).encode("utf-8")
        try:
            request = urllib.request.Request(
                f"{self._ollama_base_url}/api/embeddings",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=_CONNECT_TIMEOUT_SECONDS) as response:
                body = json.loads(response.read().decode("utf-8"))
            embedding = body.get("embedding")
            if isinstance(embedding, list) and embedding:
                return [float(value) for value in embedding]
            return None
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as exc:
            logger.warning("Ollama embeddings unavailable, using deterministic fallback: %s", exc)
            return None

    def _deterministic_fallback(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        repeats = (_FALLBACK_DIMENSIONS // len(digest)) + 1
        raw = (digest * repeats)[:_FALLBACK_DIMENSIONS]
        return [(byte / 127.5) - 1.0 for byte in raw]
