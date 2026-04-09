#!/usr/bin/env python
"""
Скрипт для установки Playwright браузеров.
Запустить один раз перед использованием парсера.
"""

import subprocess
import sys

try:
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
    print("✅ Playwright браузеры установлены успешно")
except subprocess.CalledProcessError as e:
    print(f"❌ Ошибка установки: {e}")
    sys.exit(1)
