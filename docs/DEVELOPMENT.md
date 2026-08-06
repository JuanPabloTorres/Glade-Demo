# Local Development

## Requirements
- Python 3.13 and uv
- Node.js 22
- npm

## Start
```bash
cp .env.example .env
make install
make backend
# second terminal
make frontend
```

Open `http://localhost:5173`. API docs are at `http://localhost:8000/docs`.

## Docker
```bash
docker compose up --build
```

## Ollama local setup

Install Ollama for your OS, then run:

```bash
ollama serve
ollama pull llama3.1
ollama run llama3.1
```

Set environment variables in `.env`:

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
OLLAMA_TIMEOUT_MS=60000
```

Check availability:

```bash
curl http://localhost:8000/api/v1/ai/health
```

If hardware is limited, use a lighter model (example: `qwen2.5:1.5b`) and update `OLLAMA_MODEL`.
