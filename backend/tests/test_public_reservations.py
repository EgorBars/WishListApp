import pytest


@pytest.mark.asyncio
async def test_guest_can_cancel_own_reservation(client, auth_headers_a):
    wl_resp = await client.post(
        "/api/v1/wishlists",
        json={"title": "Public WL", "is_public": True},
        headers=auth_headers_a,
    )
    wl = wl_resp.json()

    item_resp = await client.post(
        f"/api/v1/wishlists/{wl['id']}/items",
        json={"title": "Gift", "url": "https://example.com", "price": 10},
        headers=auth_headers_a,
    )
    item = item_resp.json()

    reserve_resp = await client.post(
        f"/api/v1/public/wishlists/{wl['public_id']}/items/{item['id']}/reserve",
        json={"guest_name": "Guest User", "guest_email": "guest@example.com"},
    )
    assert reserve_resp.status_code == 201
    reserve_data = reserve_resp.json()
    assert reserve_data.get("reservation_token")

    cancel_resp = await client.request(
        "DELETE",
        f"/api/v1/public/reservations/{reserve_data['reservation_id']}",
        json={"reservation_token": reserve_data["reservation_token"]},
    )
    assert cancel_resp.status_code == 204


@pytest.mark.asyncio
async def test_guest_cannot_cancel_with_wrong_token(client, auth_headers_a):
    wl_resp = await client.post(
        "/api/v1/wishlists",
        json={"title": "Public WL", "is_public": True},
        headers=auth_headers_a,
    )
    wl = wl_resp.json()

    item_resp = await client.post(
        f"/api/v1/wishlists/{wl['id']}/items",
        json={"title": "Gift", "url": "https://example.com", "price": 10},
        headers=auth_headers_a,
    )
    item = item_resp.json()

    reserve_resp = await client.post(
        f"/api/v1/public/wishlists/{wl['public_id']}/items/{item['id']}/reserve",
        json={"guest_name": "Guest User", "guest_email": "guest@example.com"},
    )
    reserve_data = reserve_resp.json()

    cancel_resp = await client.request(
        "DELETE",
        f"/api/v1/public/reservations/{reserve_data['reservation_id']}",
        json={"reservation_token": "wrong-token"},
    )
    assert cancel_resp.status_code == 403
