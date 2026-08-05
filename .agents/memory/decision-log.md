# Decision Log

- Use FastAPI + SQLAlchemy 2 + Pydantic v2 for explicit DTO boundaries.
- Use a synchronous unit of work for a small demo; interfaces allow later async replacement.
- Use a deterministic rules provider by default so the deployed demo works without a paid AI key.
- Keep an AI provider factory so an LLM adapter can be added without changing services.
- Use Vite + React + TypeScript + Flowbite React.
- Generate frontend endpoint metadata from the shared API contract JSON.
