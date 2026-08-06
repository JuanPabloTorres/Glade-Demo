from __future__ import annotations


class DocumentChunker:
    """
    Splits extracted text into bounded, overlapping chunks for embedding —
    a fixed-size sliding window over paragraphs. Simple by design: chunk
    quality matters far less than the case-isolation guarantee
    CaseDocumentIndex enforces on top of these chunks.
    """

    def __init__(self, max_chars: int = 800, overlap_chars: int = 80) -> None:
        if max_chars <= overlap_chars:
            raise ValueError("max_chars must be greater than overlap_chars")
        self._max_chars = max_chars
        self._overlap_chars = overlap_chars

    def chunk(self, text: str) -> list[str]:
        normalized = " ".join(text.split())
        if not normalized:
            return []
        if len(normalized) <= self._max_chars:
            return [normalized]

        chunks: list[str] = []
        start = 0
        step = self._max_chars - self._overlap_chars
        while start < len(normalized):
            chunks.append(normalized[start : start + self._max_chars])
            start += step
        return chunks
