import logging

from fastapi import FastAPI

from db.session import Base, engine
from routers import auth, users


logger = logging.getLogger("wishlist_app")


app = FastAPI(title="WishListApp API")


@app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured (create_all).")


app.include_router(auth.router)
app.include_router(users.router)

