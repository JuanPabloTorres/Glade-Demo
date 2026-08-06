from __future__ import annotations

import math
from dataclasses import dataclass

from app.services.documents.embedding import EmbeddingService


@dataclass
class _IndexedChunk:
    text: str
    vector: list[float]


class CaseDocumentIndex:
    """
    In-memory vector index, one bucket per case id — master instruction
    §7.6: "Nunca mezclar información entre clientes." `search()` only ever
    scans the requested case's own bucket; there is no code path that reads
    another case's vectors, by construction (a plain dict keyed by case_id,
    not a shared flat list with a post-hoc filter that could be forgotten).

    FAISS/Chroma (the optional `rag` dependency group) can back a future,
    larger-scale implementation of this same interface — for the case-count
    and document-count this demo ever needs, a plain Python dict + cosine
    similarity is simpler and has nothing extra to misconfigure.
    """

    def __init__(self, embedding_service: EmbeddingService | None = None) -> None:
        self._embedding_service = embedding_service or EmbeddingService()
        self._buckets: dict[str, list[_IndexedChunk]] = {}

    def add_document(self, case_id: str, chunks: list[str]) -> None:
        bucket = self._buckets.setdefault(case_id, [])
        for chunk in chunks:
            bucket.append(_IndexedChunk(text=chunk, vector=self._embedding_service.embed(chunk)))

    def search(self, case_id: str, query: str, top_k: int = 3) -> list[str]:
        bucket = self._buckets.get(case_id, [])
        if not bucket:
            return []
        query_vector = self._embedding_service.embed(query)
        scored = sorted(
            bucket,
            key=lambda item: _cosine_similarity(query_vector, item.vector),
            reverse=True,
        )
        return [item.text for item in scored[:top_k]]

    def document_count(self, case_id: str) -> int:
        return len(self._buckets.get(case_id, []))


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
