from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers import activities, conflicts, documents, health, matters, readiness
from app.core.config import get_settings
from app.core.database import engine
from app.core.errors import DomainError, NotFoundError, ValidationError
from app.core.version import APP_VERSION
from app.domain.base import Base


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version=APP_VERSION, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization"],
)

for router in (
    health.router,
    matters.router,
    documents.router,
    conflicts.router,
    readiness.router,
    activities.router,
):
    app.include_router(router)


@app.exception_handler(DomainError)
def handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
    status_code = 404 if isinstance(exc, NotFoundError) else 400
    if isinstance(exc, ValidationError):
        status_code = 422
    return JSONResponse(status_code=status_code, content={"detail": str(exc)})
