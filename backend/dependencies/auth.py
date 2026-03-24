from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import decode_access_token
from db.session import get_db
from models.user import User

security = HTTPBearer(auto_error=False)


async def get_token_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str | None:
    if credentials is None:
        return None
    if credentials.scheme.lower() != "bearer":
        return None
    return credentials.credentials


async def get_current_user(
    token: str | None = Depends(get_token_optional),
    db: AsyncSession = Depends(get_db),
) -> User:
    not_authenticated = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token is None:
        raise not_authenticated

    token_data = decode_access_token(token)
    if token_data.sub is None or token_data.token_type != "access":
        raise invalid_credentials

    try:
        user_id = UUID(token_data.sub)
    except ValueError:
        raise invalid_credentials

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise invalid_credentials
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    return user
