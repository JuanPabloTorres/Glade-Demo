import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routers import admin, ai, auth, bankruptcy, documents, health
from app.core.config import get_settings
from app.core.errors import DomainError, NotFoundError, ValidationError
from app.core.i18n import localize_message, resolve_locale
from app.core.version import APP_VERSION
from app.repositories.database import init_db
from app.repositories.seed import seed_demo_data_if_absent

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Demo-convenience schema bootstrap — see app.repositories.database.init_db
    # docstring for why this coexists with Alembic instead of replacing it.
    init_db(settings)

    # Off by default: populating a database on boot is the wrong behaviour
    # everywhere except a target whose storage is per-instance and ephemeral,
    # where every cold start otherwise answers a login with an empty
    # workspace. `seed_demo_data_if_absent` writes only into a database that
    # has none, so leaving this on after the deployment gains real rows
    # degrades to a no-op instead of wiping them.
    if settings.seed_demo_data_on_startup:
        if seed_demo_data_if_absent(settings):
            logger.info("Seeded synthetic demo data into an empty database.")
        else:
            logger.info("SEED_DEMO_DATA_ON_STARTUP is set but the database already has rows.")
    yield


app = FastAPI(title=settings.app_name, version=APP_VERSION, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health.router)
app.include_router(ai.router)
app.include_router(auth.router)
app.include_router(bankruptcy.router)
app.include_router(documents.router)
app.include_router(admin.router)


@app.exception_handler(DomainError)
def handle_domain_error(request: Request, exc: DomainError) -> JSONResponse:
    status_code = 404 if isinstance(exc, NotFoundError) else 400
    if isinstance(exc, ValidationError):
        status_code = 422
    locale = resolve_locale(request.headers.get("Accept-Language"))
    trace_id = str(uuid4())
    message = localize_message(exc.message_key, locale, exc.parameters)
    return JSONResponse(
        status_code=status_code,
        content={
            "code": exc.code,
            "messageKey": exc.message_key,
            "message": message,
            "parameters": exc.parameters,
            "traceId": trace_id,
        },
    )


@app.exception_handler(HTTPException)
def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
    locale = resolve_locale(request.headers.get("Accept-Language"))
    trace_id = str(uuid4())
    status_to_error = {
        401: ("UNAUTHORIZED", "errors.codes.UNAUTHORIZED"),
        403: ("FORBIDDEN", "errors.codes.FORBIDDEN"),
        404: ("RESOURCE_NOT_FOUND", "errors.codes.RESOURCE_NOT_FOUND"),
        409: ("CONFLICT", "errors.codes.CONFLICT"),
        422: ("VALIDATION_ERROR", "errors.codes.VALIDATION_ERROR"),
        # Login rate limiting (audit finding #2) raises this from
        # app.api.routers.auth.login; routed through the same translatable
        # {code, messageKey, message, parameters, traceId} DTO as every
        # other error response.
        429: ("RATE_LIMITED", "errors.codes.RATE_LIMITED"),
    }
    code, message_key = status_to_error.get(
        exc.status_code, ("INTERNAL_ERROR", "errors.codes.INTERNAL_ERROR")
    )
    message = localize_message(message_key, locale)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": code,
            "messageKey": message_key,
            "message": message,
            "parameters": {},
            "traceId": trace_id,
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
def handle_request_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    locale = resolve_locale(request.headers.get("Accept-Language"))
    trace_id = str(uuid4())
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "messageKey": "errors.codes.VALIDATION_ERROR",
            "message": localize_message("errors.codes.VALIDATION_ERROR", locale),
            "parameters": {"errors": exc.errors()},
            "traceId": trace_id,
        },
    )
