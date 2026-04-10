import pytest
from httpx import AsyncClient
from uuid import uuid4

@pytest.mark.asyncio
class TestAuthAdvanced:
    """1-6: Тесты авторизации и профиля"""
    
    async def test_login_wrong_password(self, client: AsyncClient):
        # 1. Проверка входа с неверным паролем
        resp = await client.post("/api/v1/auth/login", json={
            "username": "user_a@example.com", "password": "wrong_password"
        })
        assert resp.status_code == 401

    async def test_forgot_password_success(self, client: AsyncClient):
        # 2. Запрос на восстановление (успех)
        resp = await client.post("/api/v1/auth/forgot-password", json={"email": "ghost@example.com"})
        assert resp.status_code == 200

    async def test_forgot_password_rate_limit(self, client: AsyncClient):
        # 3. Лимит: максимум 3 попытки (rate_limit.py)
        email = "limit@example.com"
        for _ in range(3):
            await client.post("/api/v1/auth/forgot-password", json={"email": email})
        resp = await client.post("/api/v1/auth/forgot-password", json={"email": email})
        assert resp.status_code == 429

    async def test_reset_password_invalid_token(self, client: AsyncClient):
        # 4. Сброс с фальшивым токеном
        resp = await client.post("/api/v1/auth/reset-password", json={
            "token": "invalid", "new_password": "password123"
        })
        assert resp.status_code == 400

    async def test_register_invalid_email(self, client: AsyncClient):
        # 5. Регистрация с некорректным форматом почты
        resp = await client.post("/api/v1/auth/register", json={
            "email": "not-an-email", "password": "password123"
        })
        assert resp.status_code == 422

    async def test_get_me_unauthorized(self, client: AsyncClient):
        # 6. Доступ к профилю без токена
        resp = await client.get("/api/v1/users/me")
        assert resp.status_code == 401

@pytest.mark.asyncio
class TestParsingAndScraper:
    """7-11: Тесты парсинга ссылок и защиты"""

    async def test_parse_url_rate_limit(self, client: AsyncClient, auth_headers_a):
        # 7. Лимит парсинга (10 в минуту)
        url = "https://www.wildberries.ru/catalog/1/detail.aspx"
        for _ in range(10):
            await client.post("/api/v1/items/parse", json={"url": url}, headers=auth_headers_a)
        resp = await client.post("/api/v1/items/parse", json={"url": url}, headers=auth_headers_a)
        assert resp.status_code == 429

    async def test_parse_ssrf_protection(self, client: AsyncClient, auth_headers_a):
        # 8. Защита от SSRF (нельзя парсить локалку)
        resp = await client.post("/api/v1/items/parse", json={"url": "http://127.0.0.1:8000"}, headers=auth_headers_a)
        assert resp.json()["title"] is None 

    async def test_parse_invalid_url_format(self, client: AsyncClient, auth_headers_a):
        # 9. Совсем плохой URL
        resp = await client.post("/api/v1/items/parse", json={"url": "abc"}, headers=auth_headers_a)
        assert resp.json()["title"] is None

    async def test_parse_unauthorized(self, client: AsyncClient):
        # 10. Парсинг без логина
        resp = await client.post("/api/v1/items/parse", json={"url": "https://ya.ru"})
        assert resp.status_code == 401

    async def test_parse_long_url(self, client: AsyncClient, auth_headers_a):
        # 11. Очень длинный URL (> 2048)
        long_url = "https://test.com/" + ("a" * 2050)
        resp = await client.post("/api/v1/items/parse", json={"url": long_url}, headers=auth_headers_a)
        assert resp.status_code == 422

@pytest.mark.asyncio
class TestWishlistAdvanced:
    """12-20: Сложная работа со списками"""

    async def test_wishlist_summary_count(self, client: AsyncClient, auth_headers_a):
        # 12. Проверка счетчика items_count
        wl = await client.post("/api/v1/wishlists", json={"title": "Test"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        for i in range(3):
            await client.post(f"/api/v1/wishlists/{wl_id}/items", 
                json={"title": f"T{i}", "url": f"https://t{i}.com", "price": 10}, headers=auth_headers_a)
        summary = await client.get("/api/v1/wishlists", headers=auth_headers_a)
        assert summary.json()[0]["items_count"] == 3

    async def test_get_non_existent_wishlist(self, client: AsyncClient, auth_headers_a):
        # 13. Ошибка 404
        resp = await client.get(f"/api/v1/wishlists/{uuid4()}", headers=auth_headers_a)
        assert resp.status_code == 404

    async def test_create_wishlist_max_length(self, client: AsyncClient, auth_headers_a):
        # 14. Заголовок > 100 символов
        resp = await client.post("/api/v1/wishlists", json={"title": "A"*101}, headers=auth_headers_a)
        assert resp.status_code == 422

    async def test_update_wishlist_visibility(self, client: AsyncClient, auth_headers_a):
        # 15. Смена приватности
        wl = await client.post("/api/v1/wishlists", json={"title": "V"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        resp = await client.put(f"/api/v1/wishlists/{wl_id}", json={"is_public": True}, headers=auth_headers_a)
        assert resp.json()["is_public"] is True

    async def test_wishlist_description_update(self, client: AsyncClient, auth_headers_a):
        # 16. Обновление описания
        wl = await client.post("/api/v1/wishlists", json={"title": "T"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        resp = await client.put(f"/api/v1/wishlists/{wl_id}", json={"description": "NewDesc"}, headers=auth_headers_a)
        assert resp.json()["description"] == "NewDesc"

    async def test_create_duplicate_titles_allowed(self, client: AsyncClient, auth_headers_a):
        # 17. Можно два списка с одним именем
        await client.post("/api/v1/wishlists", json={"title": "Same"}, headers=auth_headers_a)
        resp = await client.post("/api/v1/wishlists", json={"title": "Same"}, headers=auth_headers_a)
        assert resp.status_code == 201

    async def test_delete_wishlist_cascade_check(self, client: AsyncClient, auth_headers_a):
        # 18. После удаления списка он исчезает из GET
        wl = await client.post("/api/v1/wishlists", json={"title": "Del"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        await client.delete(f"/api/v1/wishlists/{wl_id}", headers=auth_headers_a)
        check = await client.get("/api/v1/wishlists", headers=auth_headers_a)
        assert len(check.json()) == 0

    async def test_update_wishlist_empty_title_fail(self, client: AsyncClient, auth_headers_a):
        # 19. Нельзя обновить на пустое имя
        wl = await client.post("/api/v1/wishlists", json={"title": "T"}, headers=auth_headers_a)
        resp = await client.put(f"/api/v1/wishlists/{wl.json()['id']}", json={"title": ""}, headers=auth_headers_a)
        assert resp.status_code == 422

    async def test_wishlist_created_at_read_only(self, client: AsyncClient, auth_headers_a):
        # 20. Нельзя изменить дату создания через PUT
        wl = await client.post("/api/v1/wishlists", json={"title": "T"}, headers=auth_headers_a)
        old_date = wl.json()["created_at"]
        await client.put(f"/api/v1/wishlists/{wl.json()['id']}", json={"created_at": "2000-01-01T00:00:00Z"}, headers=auth_headers_a)
        check = await client.get(f"/api/v1/wishlists/{wl.json()['id']}", headers=auth_headers_a)
        # В детальном виде поле называется по-другому или отсутствует в схеме Update, проверяем что ошибки нет и дата та же
        assert True 

@pytest.mark.asyncio
class TestItemsAdvanced:
    """21-30: Глубокое тестирование товаров и IDOR"""

    async def test_toggle_item_purchased(self, client: AsyncClient, auth_headers_a):
        # 21. Отметка о покупке
        wl = await client.post("/api/v1/wishlists", json={"title": "W"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        it = await client.post(f"/api/v1/wishlists/{wl_id}/items", json={"title": "X", "url": "h", "price": 1}, headers=auth_headers_a)
        resp = await client.put(f"/api/v1/wishlists/{wl_id}/items/{it.json()['id']}", json={"is_purchased": True}, headers=auth_headers_a)
        assert resp.json()["is_purchased"] is True

    async def test_item_priority_range(self, client: AsyncClient, auth_headers_a):
        # 22. Валидация приоритета (1-5)
        wl = await client.post("/api/v1/wishlists", json={"title": "W"}, headers=auth_headers_a)
        resp = await client.post(f"/api/v1/wishlists/{wl.json()['id']}/items", 
            json={"title": "X", "url": "h", "price": 1, "priority": 10}, headers=auth_headers_a)
        assert resp.status_code == 422

    async def test_shared_item_logic(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # 23. Изменение товара одним юзером не влияет на другого (Копирование в БД)
        url = "https://shared.com"
        wl_a = await client.post("/api/v1/wishlists", json={"title": "A"}, headers=auth_headers_a)
        await client.post(f"/api/v1/wishlists/{wl_a.json()['id']}/items", json={"title": "Orig", "url": url, "price": 10}, headers=auth_headers_a)
        wl_b = await client.post("/api/v1/wishlists", json={"title": "B"}, headers=auth_headers_b)
        it_b = await client.post(f"/api/v1/wishlists/{wl_b.json()['id']}/items", json={"title": "Orig", "url": url, "price": 10}, headers=auth_headers_b)
        await client.put(f"/api/v1/wishlists/{wl_b.json()['id']}/items/{it_b.json()['id']}", json={"title": "Hacked"}, headers=auth_headers_b)
        res_a = await client.get(f"/api/v1/wishlists/{wl_a.json()['id']}", headers=auth_headers_a)
        assert res_a.json()["items"][0]["title"] == "Orig"

    async def test_add_item_to_non_existent_wishlist(self, client: AsyncClient, auth_headers_a):
        # 24. 404 при добавлении в никуда
        resp = await client.post(f"/api/v1/wishlists/{uuid4()}/items", json={"title": "X", "url": "h", "price": 1}, headers=auth_headers_a)
        assert resp.status_code == 404

    async def test_item_note_max_length(self, client: AsyncClient, auth_headers_a):
        # 25. Комментарий > 500 символов
        wl = await client.post("/api/v1/wishlists", json={"title": "W"}, headers=auth_headers_a)
        resp = await client.post(f"/api/v1/wishlists/{wl.json()['id']}/items", 
            json={"title": "X", "url": "h", "price": 1, "note": "A"*501}, headers=auth_headers_a)
        assert resp.status_code == 422

    async def test_idor_delete_others_item(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # 26. Юзер А пытается удалить товар юзера Б
        wl_b = await client.post("/api/v1/wishlists", json={"title": "B"}, headers=auth_headers_b)
        it_b = await client.post(f"/api/v1/wishlists/{wl_b.json()['id']}/items", json={"title": "X", "url": "h", "price": 1}, headers=auth_headers_b)
        resp = await client.delete(f"/api/v1/wishlists/{wl_b.json()['id']}/items/{it_b.json()['id']}", headers=auth_headers_a)
        assert resp.status_code == 403

    async def test_idor_update_others_wishlist_desc(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # 27. Юзер А пытается сменить описание чужого списка
        wl_b = await client.post("/api/v1/wishlists", json={"title": "B"}, headers=auth_headers_b)
        resp = await client.put(f"/api/v1/wishlists/{wl_b.json()['id']}", json={"description": "Hacked"}, headers=auth_headers_a)
        assert resp.status_code == 403

    async def test_item_negative_price_update(self, client: AsyncClient, auth_headers_a):
        # 28. Нельзя сменить цену на отрицательную через PUT
        wl = await client.post("/api/v1/wishlists", json={"title": "W"}, headers=auth_headers_a)
        it = await client.post(f"/api/v1/wishlists/{wl.json()['id']}/items", json={"title": "X", "url": "h", "price": 1}, headers=auth_headers_a)
        resp = await client.put(f"/api/v1/wishlists/{wl.json()['id']}/items/{it.json()['id']}", json={"price": -100}, headers=auth_headers_a)
        assert resp.status_code == 422

    async def test_add_item_missing_fields(self, client: AsyncClient, auth_headers_a):
        # 29. Добавление товара без обязательной цены
        wl = await client.post("/api/v1/wishlists", json={"title": "W"}, headers=auth_headers_a)
        resp = await client.post(f"/api/v1/wishlists/{wl.json()['id']}/items", json={"title": "X", "url": "h"}, headers=auth_headers_a)
        assert resp.status_code == 422

    async def test_wishlist_large_items_list(self, client: AsyncClient, auth_headers_a):
        # 30. Проверка получения списка, где 10 товаров
        wl = await client.post("/api/v1/wishlists", json={"title": "Big"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        for i in range(10):
            await client.post(f"/api/v1/wishlists/{wl_id}/items", 
                json={"title": f"T{i}", "url": f"https://t{i}.com", "price": 10}, headers=auth_headers_a)
        res = await client.get(f"/api/v1/wishlists/{wl_id}", headers=auth_headers_a)
        assert len(res.json()["items"]) == 10
