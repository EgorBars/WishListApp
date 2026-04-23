from time import time
from collections import defaultdict

# Лимиты для восстановления пароля
_forgot_attempts: dict[str, list[float]] = defaultdict(list)
FORGOT_WINDOW_SEC = 3600
FORGOT_MAX_PER_WINDOW = 3

def register_forgot_attempt(email: str) -> bool:
    now = time()
    window_start = now - FORGOT_WINDOW_SEC
    attempts = _forgot_attempts[email.lower()]
    attempts[:] = [t for t in attempts if t > window_start]
    if len(attempts) >= FORGOT_MAX_PER_WINDOW:
        return False
    attempts.append(now)
    return True

# Лимиты для парсинга ссылок
_parse_attempts: dict[str, list[float]] = defaultdict(list)
PARSE_WINDOW_SEC = 60
PARSE_MAX_PER_WINDOW = 10

def register_parse_attempt(user_id: str) -> bool:
    now = time()
    window_start = now - PARSE_WINDOW_SEC
    attempts = _parse_attempts[user_id]
    attempts[:] = [t for t in attempts if t > window_start]
    if len(attempts) >= PARSE_MAX_PER_WINDOW:
        return False
    attempts.append(now)
    return True

# --- НОВОЕ ДЛЯ SPRINT 4 ---

# Лимиты для просмотра публичных списков (30 в минуту)
_public_view_attempts: dict[str, list[float]] = defaultdict(list)
PUBLIC_VIEW_WINDOW = 60
PUBLIC_VIEW_MAX = 30

def register_public_view_attempt(ip: str) -> bool:
    now = time()
    window_start = now - PUBLIC_VIEW_WINDOW
    attempts = _public_view_attempts[ip]
    attempts[:] = [t for t in attempts if t > window_start]
    if len(attempts) >= PUBLIC_VIEW_MAX:
        return False
    attempts.append(now)
    return True

# Лимиты для бронирования гостями (5 в минуту)
_reservation_attempts: dict[str, list[float]] = defaultdict(list)
RESERVE_WINDOW = 60
RESERVE_MAX = 5

def register_reservation_attempt(ip: str) -> bool:
    now = time()
    window_start = now - RESERVE_WINDOW
    attempts = _reservation_attempts[ip]
    attempts[:] = [t for t in attempts if t > window_start]
    if len(attempts) >= RESERVE_MAX:
        return False
    attempts.append(now)
    return True