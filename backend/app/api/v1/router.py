from fastapi import APIRouter

from app.api.v1 import assistant, auth, cases, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(cases.router)
api_router.include_router(assistant.router)
