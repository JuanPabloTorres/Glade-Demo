.PHONY: install dev backend frontend test lint format verify contracts hooks

install:
	cd backend && uv sync --all-groups
	cd frontend && npm install

backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test:
	cd backend && uv run pytest
	cd frontend && npm test -- --run

lint:
	cd backend && uv run ruff check .
	cd backend && uv run mypy app
	cd frontend && npm run lint

format:
	cd backend && uv run ruff format .
	cd frontend && npm run format

contracts:
	cd frontend && npm run contracts:generate
	cd backend && uv run pytest tests/test_api_contracts.py

verify: contracts lint test

hooks:
	bash scripts/install-hooks.sh
