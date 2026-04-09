#!/bin/sh
set -e

# Переходим в директорию с приложением
cd /app

echo "Checking files in /app..."
ls -la

echo "Waiting for database..."
# Ждем 3 секунды для надежности
sleep 3

echo "Running migrations..."
# Если alembic не инициализирован, эта команда может завершиться сразу. 
# Если миграций нет, это нормально.
alembic upgrade head || echo "Migration failed or not found, skipping..."

echo "Starting uvicorn..."
# Используем полный путь на случай проблем с PATH
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000