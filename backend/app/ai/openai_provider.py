from typing import Any


class OpenAIAssistantProvider:
    """Optional provider loaded only when OpenAI is explicitly configured."""

    def __init__(self, api_key: str, model: str) -> None:
        try:
            from openai import AsyncOpenAI
        except ImportError as exc:
            raise RuntimeError(
                "The openai package is required when AI_PROVIDER=openai."
            ) from exc
        self.client: Any = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def generate(self, *, instructions: str, message: str) -> str:
        response = await self.client.responses.create(
            model=self.model,
            instructions=instructions,
            input=message,
        )
        return response.output_text
