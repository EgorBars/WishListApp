import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.email import send_password_reset_email
from core.rate_limit import register_forgot_attempt
from core.security import (
    create_access_token,
    create_reset_password_token,
    decode_reset_token,
    get_password_hash,
    verify_password,
)
from db.session import get_db
from models.user import User
from schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    Token,
    UserCreate,
    UserRead,
)

logger = logging.getLogger("wishlist_app")
router = APIRouter(prefix="/auth", tags=["auth"])

FORGOT_SUCCESS_MSG = "Если пользователь с таким email существует, ссылка для сброса пароля отправлена"
RESET_SUCCESS_MSG = "Пароль успешно изменен. Теперь вы можете войти с новым паролем."


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> UserRead:
    existing_stmt = select(User).where(User.email == user_in.email)
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> Token:
    stmt = select(User).where(User.email == str(body.username))
    res = await db.execute(stmt)
    user: User | None = res.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
        body: ForgotPasswordRequest,
        db: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    email_key = body.email.lower()

    if not register_forgot_attempt(email_key):
        logger.warning(f"Rate limit exceeded for forgot-password: {email_key}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )

    logger.info(f"Password reset requested for email: {email_key}")

    stmt = select(User).where(User.email == body.email)
    res = await db.execute(stmt)
    user: User | None = res.scalar_one_or_none()

    if user is not None:
        token_str = create_reset_password_token(user.id)
        now = datetime.now(timezone.utc)

        user.reset_password_token = token_str
        user.reset_password_expires = now + timedelta(hours=get_settings().reset_token_expire_hours)

        await db.commit()
        send_password_reset_email(user.email, token_str)
        logger.info(f"Reset token generated and email sent to user_id: {user.id}")

    return ForgotPasswordResponse(message=FORGOT_SUCCESS_MSG)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
        body: ResetPasswordRequest,
        db: AsyncSession = Depends(get_db),
) -> ResetPasswordResponse:
    payload = decode_reset_token(body.token)

    error_400 = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset token",
    )

    if payload is None:
        logger.error("Reset password failed: Invalid JWT payload or signature")
        raise error_400

    try:
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError):
        logger.error("Reset password failed: Invalid user_id in token")
        raise error_400

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user: User | None = res.scalar_one_or_none()

    if user is None:
        logger.error(f"Reset password failed: User {user_id} not found")
        raise error_400

    if user.reset_password_token != body.token:
        logger.error(f"Reset password failed: Token mismatch for user {user_id}")
        raise error_400

    if user.reset_password_expires is None or user.reset_password_expires < datetime.now(timezone.utc):
        logger.error(f"Reset password failed: Token expired in DB for user {user_id}")
        raise error_400

    user.hashed_password = get_password_hash(body.new_password)

    user.reset_password_token = None
    user.reset_password_expires = None

    await db.commit()
    logger.info(f"Password successfully reset for user_id: {user_id}")

    return ResetPasswordResponse(message=RESET_SUCCESS_MSG)
