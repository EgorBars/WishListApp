from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import get_settings
from schemas.user import TokenData

BCRYPT_ROUNDS = 12

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password, rounds=BCRYPT_ROUNDS)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {
        "sub": data["sub"],
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_reset_password_token(user_id: UUID) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=settings.reset_token_expire_hours)
    payload = {
        "sub": str(user_id),
        "type": "reset_password",
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> TokenData:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        subject: str | None = payload.get("sub")
        token_type = payload.get("type")
        if subject is None:
            return TokenData(sub=None, token_type=token_type)
        return TokenData(sub=subject, token_type=token_type)
    except JWTError:
        return TokenData(sub=None, token_type=None)


def decode_reset_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "reset_password":
            return None
        return payload
    except JWTError:
        return None
