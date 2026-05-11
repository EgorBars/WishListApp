#!/bin/bash
# Скрипт для выполнения миграций MySQL

echo "🚀 Запуск процесса миграции на MySQL..."
echo ""

# Проверка, запущены ли контейнеры
echo "1️⃣  Проверка статуса Docker контейнеров..."
docker-compose ps

echo ""
echo "2️⃣  Очистка старых данных и пересоздание контейнеров..."
echo "   (Это удалит все данные из старой БД)"
read -p "Продолжить? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v
    echo "✅ Контейнеры остановлены и очищены"
fi

echo ""
echo "3️⃣  Создание новых контейнеров с MySQL..."
docker-compose up -d
echo "⏳ Ожидание готовности MySQL (30 сек)..."
sleep 30

echo ""
echo "4️⃣  Проверка подключения к MySQL..."
docker-compose exec -T db mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root_password}" -e "SELECT 1;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ MySQL готова!"
else
    echo "❌ MySQL не отвечает, подождите и повторите попытку"
    exit 1
fi

echo ""
echo "5️⃣  Применение миграций Alembic..."
docker-compose exec -T app python -m alembic upgrade head
if [ $? -eq 0 ]; then
    echo "✅ Миграции применены успешно!"
else
    echo "⚠️  Ошибка при применении миграций"
    echo "    Проверьте логи: docker-compose logs app"
fi

echo ""
echo "6️⃣  Проверка статуса..."
docker-compose ps

echo ""
echo "✨ Миграция завершена!"
echo ""
echo "📍 Приложение доступно по адресам:"
echo "   - Фронтенд: http://localhost:5173"
echo "   - API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "🔍 Для просмотра логов используйте:"
echo "   docker-compose logs -f app"
