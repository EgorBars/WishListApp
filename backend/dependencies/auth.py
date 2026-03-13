from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import decode_access_token
from db.session import get_db
from models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data = decode_access_token(token)
    if token_data.sub is None:
        raise credentials_exception

    stmt = select(User).where(User.id == token_data.sub)
    result = await db.execute(stmt)
    user: User | None = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception

    return user

