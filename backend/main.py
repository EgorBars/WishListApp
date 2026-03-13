import logging
from typing import Sequence

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.session import Base, engine
from routers import auth, users


logger = logging.getLogger("wishlist_app")


app = FastAPI(title="WishListApp API")

# CORS: разрешаем запросы с фронтенда
origins: Sequence[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured (create_all).")


app.include_router(auth.router)
app.include_router(users.router)

