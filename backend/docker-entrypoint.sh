#!/bin/sh
set -e

# Переходим в директорию приложения
cd /app

echo "Waiting for database..."
# (Здесь можно добавить проверку базы через nc, если нужно)

echo "Running migrations..."
alembic upgrade head

echo "Starting server..."
# uvicorn будет искать main.py в /app
exec uvicorn main:app --host 0.0.0.0 --port 8000