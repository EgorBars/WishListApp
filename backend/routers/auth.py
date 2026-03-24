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

router = APIRouter(prefix="/auth", tags=["auth"])

FORGOT_SUCCESS_MESSAGE = (
    "If an account exists for this email, a password reset link has been sent."
)


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
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )

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

    return ForgotPasswordResponse(message=FORGOT_SUCCESS_MESSAGE)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ResetPasswordResponse:
    payload = decode_reset_token(body.token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    try:
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user: User | None = res.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if user.reset_password_token != body.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if user.reset_password_expires is None or user.reset_password_expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user.hashed_password = get_password_hash(body.new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    await db.commit()

    return ResetPasswordResponse(message="Пароль успешно изменен")
