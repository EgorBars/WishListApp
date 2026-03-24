import pytest

from core.config import get_settings


@pytest.fixture(autouse=True)
def secret_key_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_KEY", "k" * 32)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
