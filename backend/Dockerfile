FROM python:3.13-slim AS runtime
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY backend/pyproject.toml ./
RUN uv sync --no-dev --no-install-project
COPY backend/app ./app
COPY contracts /contracts
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
