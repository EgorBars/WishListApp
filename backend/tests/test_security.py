from datetime import timedelta

from core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    raw = "password123"
    hashed = get_password_hash(raw)
    assert verify_password(raw, hashed)
    assert not verify_password("other", hashed)


def test_jwt_access_roundtrip() -> None:
    token = create_access_token(
        data={"sub": "550e8400-e29b-41d4-a716-446655440000"},
        expires_delta=timedelta(minutes=5),
    )
    data = decode_access_token(token)
    assert data.sub == "550e8400-e29b-41d4-a716-446655440000"
    assert data.token_type == "access"
