import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from core.config import get_settings
from db.session import get_db
from dependencies.auth import get_current_user
from models.user import User
from models.wishlist import Item, Wishlist, WishlistItem, Reservation
from schemas.wishlist import (
    WishlistCreate,
    WishlistDetail,
    WishlistItemCreate,
    WishlistItemInList,
    WishlistItemOut,
    WishlistItemUpdate,
    WishlistOut,
    WishlistSummary,
    WishlistUpdate,
    ShareLinkResponse,
    ReservationInfo
)

router = APIRouter(prefix="/wishlists", tags=["wishlists"])


def _build_share_url(public_id: uuid.UUID) -> str:
    """Вспомогательная функция для сборки полной ссылки на список."""
    settings = get_settings()
    base = settings.frontend_url.rstrip("/")
    return f"{base}/shared/{public_id}"


async def _get_owned_wishlist(
        wishlist_id: uuid.UUID,
        user: User,
        db: AsyncSession,
) -> Wishlist:
    """Вспомогательная функция проверки прав владения списком."""
    stmt = select(Wishlist).where(Wishlist.id == wishlist_id)
    res = await db.execute(stmt)
    wl = res.scalar_one_or_none()
    if wl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wishlist not found")
    if wl.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return wl


@router.get("", response_model=list[WishlistSummary])
async def list_wishlists(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
) -> list[WishlistSummary]:
    """Список всех списков пользователя с индикаторами прогресса (Sprint 4)."""

    # 1. Подзапрос: общее кол-во товаров в каждом списке
    cnt_sub = (
        select(WishlistItem.wishlist_id, func.count().label("cnt"))
        .group_by(WishlistItem.wishlist_id)
        .subquery()
    )

    # 2. Подзапрос: кол-во забронированных товаров
    res_sub = (
        select(WishlistItem.wishlist_id, func.count().label("cnt"))
        .join(Reservation, Reservation.wishlist_item_id == WishlistItem.id)
        .group_by(WishlistItem.wishlist_id)
        .subquery()
    )

    # 3. Подзапрос: кол-во купленных товаров
    purchased_sub = (
        select(WishlistItem.wishlist_id, func.count().label("cnt"))
        .where(WishlistItem.is_purchased == True)
        .group_by(WishlistItem.wishlist_id)
        .subquery()
    )

    # Основной запрос с объединением всех счетчиков
    stmt = (
        select(
            Wishlist,
            func.coalesce(cnt_sub.c.cnt, 0),
            func.coalesce(res_sub.c.cnt, 0),
            func.coalesce(purchased_sub.c.cnt, 0)
        )
        .outerjoin(cnt_sub, Wishlist.id == cnt_sub.c.wishlist_id)
        .outerjoin(res_sub, Wishlist.id == res_sub.c.wishlist_id)
        .outerjoin(purchased_sub, Wishlist.id == purchased_sub.c.wishlist_id)
        .where(Wishlist.user_id == current_user.id)
        .order_by(Wishlist.created_at.desc())
    )

    res = await db.execute(stmt)
    rows = res.all()

    out: list[WishlistSummary] = []
    for wl, cnt, res_cnt, pur_cnt in rows:
        out.append(
            WishlistSummary(
                id=wl.id,
                title=wl.title,
                description=wl.description,
                is_public=wl.is_public,
                public_id=wl.public_id,
                share_url=_build_share_url(wl.public_id),
                items_count=int(cnt),
                reserved_count=int(res_cnt),
                purchased_count=int(pur_cnt),
                created_at=wl.created_at,
            )
        )
    return out


@router.post("", response_model=WishlistOut, status_code=status.HTTP_201_CREATED)
async def create_wishlist(
        body: WishlistCreate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
) -> WishlistOut:
    """Создание нового списка."""
    wl = Wishlist(
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        is_public=body.is_public,
    )
    db.add(wl)
    await db.commit()
    await db.refresh(wl)

    return WishlistOut(
        id=wl.id,
        title=wl.title,
        description=wl.description,
        is_public=wl.is_public,
        public_id=wl.public_id,
        share_url=_build_share_url(wl.public_id),
        created_at=wl.created_at
    )


@router.get("/{wishlist_id}/share", response_model=ShareLinkResponse)
async def get_share_link(
        wishlist_id: uuid.UUID,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    """Получение ссылки для шеринга (Sprint 4)."""
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)
    return ShareLinkResponse(
        public_id=wl.public_id,
        share_url=_build_share_url(wl.public_id)
    )


@router.get("/{wishlist_id}", response_model=WishlistDetail)
async def get_wishlist(
        wishlist_id: uuid.UUID,
        show_all: bool = False,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
) -> WishlistDetail:
    """Просмотр списка с поддержкой механики 'Сюрприз' (Sprint 4)."""
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)

    # Жадная загрузка товара и данных о бронировании
    stmt = (
        select(WishlistItem)
        .options(
            joinedload(WishlistItem.item),
            joinedload(WishlistItem.reservation)
        )
        .where(WishlistItem.wishlist_id == wl.id)
    )

    # МЕХАНИКА СЮРПРИЗА: Если show_all=False, скрываем забронированные
    res = await db.execute(stmt)
    rows = res.scalars().all()

    items: list[WishlistItemInList] = []
    for wi in rows:
        res_info = None
        if wi.reservation:
            res_info = ReservationInfo(
                guest_name=wi.reservation.guest_name,
                reserved_at=wi.reservation.reserved_at
            )

        items.append(
            WishlistItemInList(
                id=wi.item.id,
                title=wi.item.title,
                price=wi.item.price,
                currency=wi.item.currency,
                url=wi.item.url,
                image_url=wi.item.image_url,
                priority=wi.priority,
                note=wi.note,
                is_purchased=wi.is_purchased,
                is_reserved=wi.reservation is not None,
                reserved_by=res_info,
                added_at=wi.added_at,
            )
        )

    return WishlistDetail(
        id=wl.id,
        title=wl.title,
        description=wl.description,
        is_public=wl.is_public,
        public_id=wl.public_id,
        share_url=_build_share_url(wl.public_id),
        items=items,
    )


@router.put("/{wishlist_id}", response_model=WishlistDetail)
async def update_wishlist(
        wishlist_id: uuid.UUID,
        body: WishlistUpdate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
) -> WishlistDetail:
    """Обновление настроек списка."""
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)
    if body.title is not None:
        wl.title = body.title
    if body.description is not None:
        wl.description = body.description
    if body.is_public is not None:
        wl.is_public = body.is_public

    await db.commit()
    await db.refresh(wl)
    # Возвращаем через вызов get_wishlist для консистентности данных
    return await get_wishlist(wishlist_id, False, db, current_user)


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wishlist(
        wishlist_id: uuid.UUID,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
) -> Response:
    """Удаление списка (каскадно удалит брони и товары)."""
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)
    await db.execute(delete(Wishlist).where(Wishlist.id == wl.id))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{wishlist_id}/items", response_model=WishlistItemOut, status_code=status.HTTP_201_CREATED)
async def add_item(
        wishlist_id: uuid.UUID,
        body: WishlistItemCreate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
) -> WishlistItemOut:
    """Добавление товара в список."""
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)

    normalized_url = body.url.strip()
    stmt = select(Item).where(Item.url == normalized_url)
    res = await db.execute(stmt)
    item: Item | None = res.scalar_one_or_none()

    if item is None:
        item = Item(
            url=normalized_url,
            title=body.title,
            price=body.price,
            currency=body.currency,
            image_url=body.image_url,
        )
        db.add(item)
        await db.flush()

    link_check = await db.execute(
        select(WishlistItem).where(
            WishlistItem.wishlist_id == wl.id,
            WishlistItem.item_id == item.id,
        )
    )
    if link_check.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Item already in this wishlist")

    wi = WishlistItem(
        wishlist_id=wl.id,
        item_id=item.id,
        priority=body.priority,
        note=body.note,
        is_purchased=False,
    )
    db.add(wi)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Item already in this wishlist")

    await db.refresh(wi)
    await db.refresh(item)

    return WishlistItemOut(
        id=item.id,
        title=item.title,
        price=item.price,
        currency=item.currency,
        url=item.url,
        image_url=item.image_url,
        priority=wi.priority,
        note=wi.note,
        is_purchased=wi.is_purchased,
        added_at=wi.added_at,
    )


@router.put("/{wishlist_id}/items/{item_id}", response_model=WishlistItemOut)
async def update_item(
        wishlist_id: uuid.UUID,
        item_id: uuid.UUID,
        body: WishlistItemUpdate,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
) -> WishlistItemOut:
    """Обновление товара в списке (с логикой дублирования общих товаров)."""
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)

    stmt = select(WishlistItem).where(
        WishlistItem.wishlist_id == wl.id,
        WishlistItem.item_id == item_id,
    )
    res = await db.execute(stmt)
    wi: WishlistItem | None = res.scalar_one_or_none()
    if wi is None:
        raise HTTPException(status_code=404, detail="Item not found")

    stmt_item = select(Item).where(Item.id == item_id)
    item = (await db.execute(stmt_item)).scalar_one()

    # Проверка на глобальные изменения (те, что затрагивают таблицу Item)
    normalized_url = body.url.strip() if body.url is not None else None
    wants_update_global = any(
        v is not None for v in (body.title, normalized_url, body.price, body.currency, body.image_url)
    )

    if wants_update_global:
        cnt_stmt = select(func.count()).select_from(WishlistItem).where(WishlistItem.item_id == item.id)
        cnt = int((await db.execute(cnt_stmt)).scalar_one())

        next_title = body.title if body.title is not None else item.title
        next_url = normalized_url if normalized_url is not None else item.url
        next_price = body.price if body.price is not None else item.price
        next_currency = body.currency if body.currency is not None else item.currency
        next_image_url = body.image_url if body.image_url is not None else item.image_url

        if cnt > 1:
            # Создаем копию товара, если он используется кем-то еще
            new_item = Item(
                url=next_url, title=next_title, price=next_price,
                currency=next_currency, image_url=next_image_url,
            )
            db.add(new_item)
            await db.flush()
            wi.item_id = new_item.id
            item = new_item
        else:
            item.title, item.url, item.price = next_title, next_url, next_price
            item.currency, item.image_url = next_currency, next_image_url

    if body.note is not None: wi.note = body.note
    if body.priority is not None: wi.priority = body.priority
    if body.is_purchased is not None: wi.is_purchased = body.is_purchased

    await db.commit()
    await db.refresh(wi)
    await db.refresh(item)

    return WishlistItemOut(
        id=item.id, title=item.title, price=item.price, currency=item.currency,
        url=item.url, image_url=item.image_url, priority=wi.priority,
        note=wi.note, is_purchased=wi.is_purchased, added_at=wi.added_at,
    )


@router.delete("/{wishlist_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
        wishlist_id: uuid.UUID,
        item_id: uuid.UUID,
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
) -> Response:
    """Удаление товара из списка."""
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)

    await db.execute(
        delete(WishlistItem).where(
            WishlistItem.wishlist_id == wl.id,
            WishlistItem.item_id == item_id,
        )
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
