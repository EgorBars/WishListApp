import logging
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
# ДОБАВЛЕН РОУТЕР PUBLIC
from routers import auth, users, wishlists, items, public

logger = logging.getLogger("wishlist_app")
settings = get_settings()

app = FastAPI(title=settings.app_name)

origins = [settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"]
if "localhost:3000" not in settings.frontend_url:
    origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(origins)),
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