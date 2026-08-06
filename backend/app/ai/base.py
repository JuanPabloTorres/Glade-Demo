from typing import Protocol


class AssistantProvider(Protocol):
    async def generate(self, *, instructions: str, message: str) -> str: ...
