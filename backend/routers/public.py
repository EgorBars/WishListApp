import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from db.session import get_db
from models.wishlist import Wishlist, WishlistItem, Reservation, Item
from models.user import User
from schemas.wishlist import (
    PublicWishlist,
    PublicWishlistItem,
    ReservationRequest,
    ReservationResponse
)
from core.rate_limit import register_public_view_attempt, register_reservation_attempt

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/wishlists/{public_id}", response_model=PublicWishlist)
async def get_public_wishlist(
        public_id: uuid.UUID,
        request: Request,
        db: AsyncSession = Depends(get_db)
):
    """Просмотр публичного списка гостем."""
    # 1. Rate Limiting (30 зап/мин)
    if not register_public_view_attempt(request.client.host):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later."
        )

    # 2. Поиск списка и владельца
    stmt = (
        select(Wishlist)
        .options(joinedload(Wishlist.user))
        .where(Wishlist.public_id == public_id)
    )
    res = await db.execute(stmt)
    wl = res.scalar_one_or_none()

    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    if not wl.is_public:
        raise HTTPException(status_code=403, detail="This wishlist is private")

    # 3. Формируем имя владельца (часть до @)
    owner_name = wl.user.email.split('@')[0]

    # 4. Получаем товары со связанными данными (Item и Reservation)
    items_stmt = (
        select(WishlistItem)
        .options(
            joinedload(WishlistItem.item),
            joinedload(WishlistItem.reservation)
        )
        .where(WishlistItem.wishlist_id == wl.id)
        .order_by(WishlistItem.added_at.desc())
    )
    items_res = await db.execute(items_stmt)
    wishlist_items = items_res.scalars().all()

    # 5. Маппинг в публичную схему (автоматически скроет note и email)
    public_items = []
    for wi in wishlist_items:
        reservation_data = None
        if wi.reservation:
            reservation_data = {"guest_name": wi.reservation.guest_name}

        public_items.append(
            PublicWishlistItem(
                id=wi.item.id,
                title=wi.item.title,
                price=wi.item.price,
                currency=wi.item.currency,
                url=wi.item.url,
                image_url=wi.item.image_url,
                priority=wi.priority,
                is_purchased=wi.is_purchased,
                is_reserved=wi.reservation is not None,
                reserved_by=reservation_data
            )
        )

    return PublicWishlist(
        id=wl.id,
        title=wl.title,
        description=wl.description,
        owner_name=owner_name,
        items=public_items
    )


@router.post(
    "/wishlists/{public_id}/items/{item_id}/reserve",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED
)
async def reserve_item(
        public_id: uuid.UUID,
        item_id: uuid.UUID,
        body: ReservationRequest,
        request: Request,
        db: AsyncSession = Depends(get_db)
):
    """Бронирование подарка гостем."""
    # 1. Rate Limiting (5 зап/мин)
    if not register_reservation_attempt(request.client.host):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later."
        )

    # 2. Проверка списка
    wl_stmt = select(Wishlist).where(Wishlist.public_id == public_id)
    wl_res = await db.execute(wl_stmt)
    wl = wl_res.scalar_one_or_none()

    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist or item not found")
    if not wl.is_public:
        raise HTTPException(status_code=403, detail="This wishlist is private")

    # 3. Поиск связи товара со списком (Проверка IDOR: принадлежит ли item_id этому списку)
    wi_stmt = (
        select(WishlistItem)
        .options(joinedload(WishlistItem.item), joinedload(WishlistItem.reservation))
        .where(
            WishlistItem.wishlist_id == wl.id,
            WishlistItem.item_id == item_id
        )
    )
    wi_res = await db.execute(wi_stmt)
    wi = wi_res.scalar_one_or_none()

    if not wi:
        raise HTTPException(status_code=404, detail="Wishlist or item not found")

    # 4. Бизнес-проверки
    if wi.is_purchased:
        raise HTTPException(status_code=400, detail="Cannot reserve purchased item")
    if wi.reservation:
        raise HTTPException(status_code=409, detail="This item is already reserved")

    # 5. Создание бронирования
    new_reservation = Reservation(
        wishlist_item_id=wi.id,
        guest_name=body.guest_name,
        guest_email=body.guest_email
    )

    db.add(new_reservation)

    try:
        await db.commit()
        await db.refresh(new_reservation)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create reservation")

    return ReservationResponse(
        message="Подарок успешно забронирован",
        reservation_id=new_reservation.id,
        item_title=wi.item.title
    )
