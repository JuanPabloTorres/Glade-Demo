class DemoAssistantProvider:
    """Deterministic provider so the demo remains functional without external credentials."""

    async def generate(self, *, instructions: str, message: str) -> str:
        return message
