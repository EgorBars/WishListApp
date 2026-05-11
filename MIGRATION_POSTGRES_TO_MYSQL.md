# Миграция с PostgreSQL на MySQL

## Выполненные изменения

### 1. Python зависимости (requirements.txt)
- ❌ Удалены: `asyncpg`, `psycopg[binary,pool]`
- ✅ Добавлены: `aiomysql==0.2.0`, `PyMySQL==1.1.0`

### 2. Конфигурация БД (backend/core/config.py)
- ✅ Переименованы переменные окружения: `POSTGRES_*` → `MYSQL_*`
- ✅ Добавлены свойства для URL подключения с поддержкой MySQL:
  - `async_database_url`: mysql+aiomysql://
  - `sync_database_url`: mysql+pymysql://

### 3. Docker Compose (docker-compose.yml)
- ✅ Заменено: `postgres:15-alpine` → `mysql:8.0`
- ✅ Обновлены переменные окружения: `POSTGRES_*` → `MYSQL_*`
- ✅ Изменён healthcheck: `pg_isready` → `mysqladmin ping`
- ✅ Изменён порт: 5432 → 3306
- ✅ Переименован volume: `postgres_data` → `mysql_data`
- ✅ Обновлены DATABASE_URL в env переменных приложения

### 4. Production Docker Compose (deploy/docker-compose.prod.yml)
- ✅ Те же изменения что и в docker-compose.yml

### 5. Модели SQLAlchemy (backend/models/)
- ✅ Удалены импорты: `from sqlalchemy.dialects.postgresql import UUID`
- ✅ Заменены все UUID колонки на `String(36)` с использованием `str(uuid.uuid4())`
  - user.py: User.id
  - wishlist.py: 
    - Wishlist.id, Wishlist.user_id, Wishlist.public_id
    - Item.id
    - WishlistItem.id, WishlistItem.wishlist_id, WishlistItem.item_id
    - Reservation.id, Reservation.wishlist_item_id

## Необходимые действия

### 1. Обновить .env файл

```env
# Заменить:
POSTGRES_USER=wishlist_user
POSTGRES_PASSWORD=wishlist_password
POSTGRES_DB=wishlist_db

# На:
MYSQL_USER=wishlist_user
MYSQL_PASSWORD=wishlist_password
MYSQL_DB=wishlist_db
MYSQL_ROOT_PASSWORD=root_password

# Обновить URL подключения:
DATABASE_URL=mysql+aiomysql://wishlist_user:wishlist_password@localhost:3306/wishlist_db
DATABASE_URL_SYNC=mysql+pymysql://wishlist_user:wishlist_password@localhost:3306/wishlist_db
```

### 2. Переиндексировать миграции

Поскольку мы изменили типы данных (UUID → String(36)), нужно создать новую миграцию Alembic:

```bash
cd backend
# Удалить старые версии миграций (они не совместимы с MySQL)
rm alembic/versions/001_initial.py

# Создать новую базовую миграцию для MySQL
alembic revision --autogenerate -m "Initial migration for MySQL"

# Применить миграцию
alembic upgrade head
```

### 3. Переинициализировать БД

Если используете Docker:

```bash
# Удалить старый volume PostgreSQL
docker-compose down -v

# Пересоздать с MySQL
docker-compose up -d

# Применить миграции
docker-compose exec app alembic upgrade head
```

Если используете локальную БД:
1. Убедитесь, что MySQL 8.0+ установлен и запущен
2. Создайте БД вручную или позвольте приложению её создать
3. Запустите миграции: `alembic upgrade head`

### 4. Обновить pip зависимости

```bash
cd backend
pip install --upgrade -r requirements.txt
```

### 5. Переустроить Docker образы (если необходимо)

```bash
docker-compose build
```

## Важные заметки

### Совместимость MySQL/MariaDB
- MySQL 8.0+ рекомендуется (используется в docker-compose.yml)
- MariaDB 10.5+ также поддерживается

### UUID в MySQL
- MySQL не имеет встроенного типа UUID
- Используется `VARCHAR(36)` (стандартная длина UUID)
- Переходы используют `str(uuid.uuid4())` для генерации

### Производительность
- Для лучшей производительности рассмотрите использование `BINARY(16)` вместо `VARCHAR(36)`
- Это потребует дополнительной обработки при конвертации UUID

### Возможные проблемы

#### Если видите ошибки подключения:
- Проверьте, запущен ли MySQL сервер
- Подтвердите правильность учетных данных в .env
- Убедитесь, что БД существует

#### Если миграции не работают:
- Удалите таблицы и переозапустите: `alembic downgrade base` → `alembic upgrade head`
- Проверьте логи: `docker-compose logs app`

## Команды для быстрого старта

```bash
# 1. Установить зависимости
cd backend && pip install -r requirements.txt && cd ..

# 2. Запустить контейнеры
docker-compose up -d

# 3. Применить миграции
docker-compose exec app alembic upgrade head

# 4. Проверить статус
docker-compose ps
docker-compose logs app
```

## Результат

Приложение теперь полностью перенесено на MySQL и готово к использованию! 🎉
