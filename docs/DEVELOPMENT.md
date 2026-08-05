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
