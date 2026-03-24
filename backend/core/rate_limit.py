from time import time
from collections import defaultdict

_forgot_attempts: dict[str, list[float]] = defaultdict(list)
FORGOT_WINDOW_SEC = 3600
FORGOT_MAX_PER_WINDOW = 3


def register_forgot_attempt(email: str) -> bool:
    """Record attempt; return False if rate limit exceeded (4th request in window)."""
    now = time()
    window_start = now - FORGOT_WINDOW_SEC
    attempts = _forgot_attempts[email.lower()]
    attempts[:] = [t for t in attempts if t > window_start]
    if len(attempts) >= FORGOT_MAX_PER_WINDOW:
        return False
    attempts.append(now)
    return True
