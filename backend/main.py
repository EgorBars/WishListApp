import logging
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
# ДОБАВЛЕН РОУТЕР PUBLIC
from routers import auth, users, wishlists, items, public

logger = logging.getLogger("wishlist_app")
settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth.router)
api_v1.include_router(users.router)
api_v1.include_router(wishlists.router)
api_v1.include_router(items.router)
# ПОДКЛЮЧАЕМ НОВЫЙ РОУТЕР
api_v1.include_router(public.router)

app.include_router(api_v1)
