import asyncio
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from db.session import Base, get_db
from core.security import create_access_token
from models.user import User
from core.security import get_password_hash

# Используем SQLite в памяти для быстрых тестов
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def test_users(setup_db):
    """Создает двух пользователей для проверки IDOR."""
    async with TestingSessionLocal() as db:
        user_a = User(
            email="user_a@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        user_b = User(
            email="user_b@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        db.add_all([user_a, user_b])
        await db.commit()
        await db.refresh(user_a)
        await db.refresh(user_b)
        return user_a, user_b

@pytest_asyncio.fixture
def token_a(test_users):
    user_a, _ = test_users
    return create_access_token(data={"sub": str(user_a.id)})

@pytest_asyncio.fixture
def token_b(test_users):
    _, user_b = test_users
    return create_access_token(data={"sub": str(user_b.id)})

@pytest_asyncio.fixture
def auth_headers_a(token_a):
    return {"Authorization": f"Bearer {token_a}"}

@pytest_asyncio.fixture
def auth_headers_b(token_b):
    return {"Authorization": f"Bearer {token_b}"}