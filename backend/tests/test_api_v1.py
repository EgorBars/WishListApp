import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestWishlistCRUD:
    async def test_create_wishlist_success(self, client: AsyncClient, auth_headers_a):
        # Создание списка с валидными данными -> 201
        resp = await client.post("/api/v1/wishlists", json={"title": "My List"}, headers=auth_headers_a)
        assert resp.status_code == 201
        assert resp.json()["title"] == "My List"

    async def test_create_wishlist_empty_title(self, client: AsyncClient, auth_headers_a):
        # Создание списка с пустым названием -> 422
        resp = await client.post("/api/v1/wishlists", json={"title": ""}, headers=auth_headers_a)
        assert resp.status_code == 422

    async def test_get_only_my_wishlists(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # Получение всех списков пользователя -> возвращает только его списки
        await client.post("/api/v1/wishlists", json={"title": "User A List"}, headers=auth_headers_a)
        await client.post("/api/v1/wishlists", json={"title": "User B List"}, headers=auth_headers_b)
        
        resp = await client.get("/api/v1/wishlists", headers=auth_headers_a)
        data = resp.json()
        assert resp.status_code == 200
        assert len(data) == 1
        assert data[0]["title"] == "User A List"

    async def test_update_my_wishlist(self, client: AsyncClient, auth_headers_a):
        # Обновление своего списка -> 200
        create = await client.post("/api/v1/wishlists", json={"title": "Old"}, headers=auth_headers_a)
        wl_id = create.json()["id"]
        resp = await client.put(f"/api/v1/wishlists/{wl_id}", json={"title": "New"}, headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["title"] == "New"

    async def test_delete_my_wishlist(self, client: AsyncClient, auth_headers_a):
        # Удаление своего списка -> 204
        create = await client.post("/api/v1/wishlists", json={"title": "To Delete"}, headers=auth_headers_a)
        wl_id = create.json()["id"]
        resp = await client.delete(f"/api/v1/wishlists/{wl_id}", headers=auth_headers_a)
        assert resp.status_code == 204

@pytest.mark.asyncio
class TestItemCRUD:
    async def test_add_item_success(self, client: AsyncClient, auth_headers_a):
        # Добавление товара в свой список -> 201
        wl = await client.post("/api/v1/wishlists", json={"title": "WL"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        item_data = {
            "title": "iPhone",
            "url": "https://apple.com",
            "price": 999.99,
            "priority": 5
        }
        resp = await client.post(f"/api/v1/wishlists/{wl_id}/items", json=item_data, headers=auth_headers_a)
        assert resp.status_code == 201
        assert resp.json()["title"] == "iPhone"

    async def test_add_item_negative_price(self, client: AsyncClient, auth_headers_a):
        # Добавление товара с отрицательной ценой -> 422
        wl = await client.post("/api/v1/wishlists", json={"title": "WL"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        resp = await client.post(f"/api/v1/wishlists/{wl_id}/items", 
            json={"title": "X", "url": "h", "price": -10}, headers=auth_headers_a)
        assert resp.status_code == 422

    async def test_add_duplicate_item(self, client: AsyncClient, auth_headers_a):
        # Добавление существующего товара повторно -> 409
        wl = await client.post("/api/v1/wishlists", json={"title": "WL"}, headers=auth_headers_a)
        wl_id = wl.json()["id"]
        item = {"title": "X", "url": "https://test.com", "price": 10}
        await client.post(f"/api/v1/wishlists/{wl_id}/items", json=item, headers=auth_headers_a)
        resp = await client.post(f"/api/v1/wishlists/{wl_id}/items", json=item, headers=auth_headers_a)
        assert resp.status_code == 409

@pytest.mark.asyncio
class TestSecurityIDOR:
    async def test_idor_get_others_wishlist(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # Пользователь А пытается получить список пользователя Б -> 403
        create = await client.post("/api/v1/wishlists", json={"title": "Secret B"}, headers=auth_headers_b)
        wl_id = create.json()["id"]
        resp = await client.get(f"/api/v1/wishlists/{wl_id}", headers=auth_headers_a)
        assert resp.status_code == 403

    async def test_idor_update_others_wishlist(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # Пользователь А пытается обновить список Б -> 403
        create = await client.post("/api/v1/wishlists", json={"title": "List B"}, headers=auth_headers_b)
        wl_id = create.json()["id"]
        resp = await client.put(f"/api/v1/wishlists/{wl_id}", json={"title": "Hacked"}, headers=auth_headers_a)
        assert resp.status_code == 403

    async def test_idor_delete_others_wishlist(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # Пользователь А пытается удалить список Б -> 403
        create = await client.post("/api/v1/wishlists", json={"title": "List B"}, headers=auth_headers_b)
        wl_id = create.json()["id"]
        resp = await client.delete(f"/api/v1/wishlists/{wl_id}", headers=auth_headers_a)
        assert resp.status_code == 403

    async def test_idor_add_item_to_others_list(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # Пользователь А пытается добавить товар в список Б -> 403
        create = await client.post("/api/v1/wishlists", json={"title": "List B"}, headers=auth_headers_b)
        wl_id = create.json()["id"]
        resp = await client.post(f"/api/v1/wishlists/{wl_id}/items", 
            json={"title": "X", "url": "h", "price": 10}, headers=auth_headers_a)
        assert resp.status_code == 403

    async def test_idor_update_others_item(self, client: AsyncClient, auth_headers_a, auth_headers_b):
        # Пользователь А пытается обновить товар в списке Б -> 403
        # 1. Б создает список и товар
        wl = await client.post("/api/v1/wishlists", json={"title": "B"}, headers=auth_headers_b)
        wl_id = wl.json()["id"]
        item = await client.post(f"/api/v1/wishlists/{wl_id}/items", 
            json={"title": "B-Item", "url": "h", "price": 10}, headers=auth_headers_b)
        item_id = item.json()["id"]
        # 2. А пытается его изменить
        resp = await client.put(f"/api/v1/wishlists/{wl_id}/items/{item_id}", 
            json={"note": "Hacked"}, headers=auth_headers_a)
        assert resp.status_code == 403