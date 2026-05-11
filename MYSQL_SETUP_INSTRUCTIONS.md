# Завершение миграции с PostgreSQL на MySQL

## ✅ Что уже сделано

### 1. Код обновлён для Python 3.9 совместимости
- ✅ Все `| None` заменены на `Optional[...]`
- ✅ Все типы обновлены в файлах:
  - `backend/core/config.py`
  - `backend/core/security.py`
  - `backend/dependencies/auth.py`
  - `backend/models/user.py`
  - `backend/models/wishlist.py`
  - `backend/routers/auth.py`
  - `backend/routers/wishlists.py`
  - `backend/schemas/user.py`

### 2. Конфиг переведён на MySQL
- ✅ `requirements.txt` - заменены драйверы PostgreSQL на MySQL
- ✅ `docker-compose.yml` - PostgreSQL → MySQL 8.0
- ✅ `deploy/docker-compose.prod.yml` - PostgreSQL → MySQL 8.0
- ✅ `.env` - обновлены переменные: `POSTGRES_*` → `MYSQL_*`

### 3. Модели обновлены на String(36) вместо UUID
- ✅ Все UUID поля заменены на `String(36)` для совместимости с MySQL
- ✅ Создана миграция Alembic: `alembic/versions/002_initial_mysql_migration.py`

## 🚀 Как запустить с Docker (рекомендуется)

### Шаг 1: Пересоздать контейнеры
```bash
# Остановить и удалить старые контейнеры/volumes
docker-compose down -v

# Пересоздать контейнеры с MySQL
docker-compose up -d
```

### Шаг 2: Дождитесь, пока MySQL будет готова
```bash
# Проверить статус
docker-compose ps

# Смотреть логи
docker-compose logs -f db
```

### Шаг 3: Применить миграции
```bash
# Выполнить миграцию Alembic
docker-compose exec app python -m alembic upgrade head

# Или вручную создать таблицы (если нужно):
docker-compose exec app python -c "
from alembic.config import Config
from alembic import command

config = Config('alembic.ini')
command.upgrade(config, 'head')
"
```

### Шаг 4: Проверить, что базаработает
```bash
# Вход в контейнер приложения
docker-compose exec app bash

# Запустить простой тест подключения
python -c "
from db.session import engine
import asyncio

async def test():
    async with engine.begin() as conn:
        result = await conn.execute('SELECT 1')
        print('✅ БД подключена!')

asyncio.run(test())
"
```

## 🐛 Если есть ошибки

### Ошибка: "table users doesn't exist"
```bash
# Пересоздать all таблицы
docker-compose exec app alembic downgrade base
docker-compose exec app alembic upgrade head
```

### Ошибка: "Can't connect to MySQL"
```bash
# Проверить логи MySQL
docker-compose logs db

# Убедиться, что MySQL запущена и готова
docker-compose exec db mysql -u wishlist_user -pwishlist_password -e "SELECT 1"
```

### Ошибка: "aiomysql" модуль не найден
```bash
# Переустановить зависимости внутри контейнера
docker-compose exec app pip install -r requirements.txt
```

## 📋 Для локальной разработки (без Docker)

### Требования
- Python 3.9+
- MySQL 8.0+
- pip и virtualenv

### Установка

```bash
# 1. Создать виртуальное окружение
python -m venv venv

# На Windows:
venv\Scripts\activate
# На macOS/Linux:
source venv/bin/activate

# 2. Установить зависимости
cd backend
pip install -r requirements.txt

# 3. Убедиться, что MySQL запущена
# Windows: mysql.exe -u root
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql

# 4. Создать базу данных (если её нет)
mysql -u root -p -e "
CREATE DATABASE wishlist_db;
CREATE USER 'wishlist_user'@'localhost' IDENTIFIED BY 'wishlist_password';
GRANT ALL PRIVILEGES ON wishlist_db.* TO 'wishlist_user'@'localhost';
FLUSH PRIVILEGES;
"

# 5. Применить миграции
alembic upgrade head

# 6. Запустить приложение
python main.py

# Или через uvicorn:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### .env для локальной разработки
```env
MYSQL_USER=wishlist_user
MYSQL_PASSWORD=wishlist_password
MYSQL_DB=wishlist_db
DATABASE_URL=mysql+aiomysql://wishlist_user:wishlist_password@localhost:3306/wishlist_db
DATABASE_URL_SYNC=mysql+pymysql://wishlist_user:wishlist_password@localhost:3306/wishlist_db
```

## ✨ Проверка результата

После выполнения команд, приложение должно быть готово:
- 🔗 Фронтенд: http://localhost:5173
- 🔌 API: http://localhost:8000
- 📚 API Docs: http://localhost:8000/docs
- 🗄️ MySQL: localhost:3306

## 📝 Важные заметки

### Различия между PostgreSQL и MySQL

| Особенность | PostgreSQL | MySQL |
|--|--|--|
| UUID тип | NATIVE | VARCHAR(36) |
| Порт | 5432 | 3306 |
| Драйвер asyncio | asyncpg | aiomysql |
| Boolean | BOOLEAN | TINYINT(1) |
| Timezone | Встроена | DateTime(timezone=True) → DATETIME |

### Миграция данных

Если у вас есть данные в старой PostgreSQL БД, используйте:
```bash
# Экспорт из PostgreSQL
pg_dump -h localhost -U postgres -d wishlist_db > backup.sql

# Конвертация SQL (если нужно)
# - UUID → VARCHAR(36)
# - SERIAL → AUTO_INCREMENT
# - TEXT vs VARCHAR

# Импорт в MySQL
mysql -u wishlist_user -pwishlist_password wishlist_db < backup.sql
```

## 📞 Поддержка

Если возникают проблемы:
1. Проверьте логи: `docker-compose logs -f app`
2. Убедитесь, что MySQL запущена
3. Проверьте переменные в `.env`
4. Попробуйте пересоздать контейнеры: `docker-compose down -v && docker-compose up -d`
