from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from dependencies.auth import get_current_user
from models.user import User
from models.wishlist import Item, Wishlist, WishlistItem
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
)

router = APIRouter(prefix="/wishlists", tags=["wishlists"])


async def _get_owned_wishlist(
    wishlist_id: UUID,
    user: User,
    db: AsyncSession,
) -> Wishlist:
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
    cnt_sub = (
        select(WishlistItem.wishlist_id, func.count().label("cnt"))
        .group_by(WishlistItem.wishlist_id)
        .subquery()
    )
    stmt = (
        select(Wishlist, func.coalesce(cnt_sub.c.cnt, 0))
        .outerjoin(cnt_sub, Wishlist.id == cnt_sub.c.wishlist_id)
        .where(Wishlist.user_id == current_user.id)
        .order_by(Wishlist.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()
    out: list[WishlistSummary] = []
    for wl, cnt_val in rows:
        out.append(
            WishlistSummary(
                id=wl.id,
                title=wl.title,
                description=wl.description,
                is_public=wl.is_public,
                items_count=int(cnt_val or 0),
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
    wl = Wishlist(
        user_id=current_user.id,
        title=body.title,
        description=body.description,
        is_public=body.is_public,
    )
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return wl


@router.get("/{wishlist_id}", response_model=WishlistDetail)
async def get_wishlist(
    wishlist_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WishlistDetail:
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)

    stmt = (
        select(WishlistItem, Item)
        .join(Item, WishlistItem.item_id == Item.id)
        .where(WishlistItem.wishlist_id == wl.id)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items: list[WishlistItemInList] = []
    for wi, item in rows:
        items.append(
            WishlistItemInList(
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
        )

    return WishlistDetail(
        id=wl.id,
        title=wl.title,
        description=wl.description,
        is_public=wl.is_public,
        items=items,
    )


@router.put("/{wishlist_id}", response_model=WishlistDetail)
async def update_wishlist(
    wishlist_id: UUID,
    body: WishlistUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WishlistDetail:
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)
    if body.title is not None:
        wl.title = body.title
    if body.description is not None:
        wl.description = body.description
    if body.is_public is not None:
        wl.is_public = body.is_public
    await db.commit()
    await db.refresh(wl)
    return await get_wishlist(wishlist_id, db, current_user)


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wishlist(
    wishlist_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)
    await db.execute(delete(Wishlist).where(Wishlist.id == wl.id))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{wishlist_id}/items", response_model=WishlistItemOut, status_code=status.HTTP_201_CREATED)
async def add_item(
    wishlist_id: UUID,
    body: WishlistItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WishlistItemOut:
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
    else:
        # Update existing item with new data if different
        if item.title != body.title:
            item.title = body.title
        if item.price != body.price:
            item.price = body.price
        if item.currency != body.currency:
            item.currency = body.currency
        if item.image_url != body.image_url:
            item.image_url = body.image_url
        await db.flush()

    link_check = await db.execute(
        select(WishlistItem).where(
            WishlistItem.wishlist_id == wl.id,
            WishlistItem.item_id == item.id,
        )
    )
    if link_check.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Товар уже добавлен в этот список",
        )

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
        # Most likely unique constraint (wishlist_id, item_id) in concurrent requests.
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Товар уже добавлен в этот список",
        )
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
    wishlist_id: UUID,
    item_id: UUID,
    body: WishlistItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WishlistItemOut:
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)

    stmt = select(WishlistItem).where(
        WishlistItem.wishlist_id == wl.id,
        WishlistItem.item_id == item_id,
    )
    res = await db.execute(stmt)
    wi: WishlistItem | None = res.scalar_one_or_none()
    if wi is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    stmt_item = select(Item).where(Item.id == item_id)
    item = (await db.execute(stmt_item)).scalar_one()

    normalized_url = body.url.strip() if body.url is not None else None
    wants_update_global = any(
        v is not None
        for v in (
            body.title,
            normalized_url,
            body.price,
            body.currency,
            body.image_url,
        )
    )

    if wants_update_global:
        # Считаем, сколько связей у этого конкретного товара
        cnt_stmt = select(func.count()).select_from(WishlistItem).where(WishlistItem.item_id == item.id)
        cnt = int((await db.execute(cnt_stmt)).scalar_one())

        next_title = body.title if body.title is not None else item.title
        next_url = normalized_url if normalized_url is not None else item.url
        next_price = body.price if body.price is not None else item.price
        next_currency = body.currency if body.currency is not None else item.currency
        if body.image_url is not None:
            # Если пришла строка (даже пустая), обрезаем пробелы
            val = body.image_url.strip()
            # Если строка стала пустой — пишем в базу None (NULL)
            next_image_url = val if val != "" else None
        else:
            # Если поле вообще не прислали в JSON, оставляем как было
            next_image_url = item.image_url

        # Если товар "общий" (используется в других списках), создаем копию для текущего пользователя,
        # чтобы не менять данные у других людей.
        if cnt > 1:
            # Создаем новый товар, так как мы не хотим портить данные другим
            new_item = Item(
                url=next_url,
                title=next_title,
                price=next_price,
                currency=next_currency,
                image_url=next_image_url,
            )
            db.add(new_item)
            await db.flush()
            wi.item_id = new_item.id
            item = new_item
        else:
            # Если товар только наш, просто обновляем его
            item.title = next_title
            item.url = next_url
            item.price = next_price
            item.currency = next_currency
            item.image_url = next_image_url

    if body.note is not None:
        wi.note = body.note
    if body.priority is not None:
        wi.priority = body.priority
    if body.is_purchased is not None:
        wi.is_purchased = body.is_purchased

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already in this wishlist")
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


@router.delete("/{wishlist_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    wishlist_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    wl = await _get_owned_wishlist(wishlist_id, current_user, db)

    stmt = select(WishlistItem).where(
        WishlistItem.wishlist_id == wl.id,
        WishlistItem.item_id == item_id,
    )
    res = await db.execute(stmt)
    wi: WishlistItem | None = res.scalar_one_or_none()
    if wi is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    await db.execute(
        delete(WishlistItem).where(
            WishlistItem.wishlist_id == wl.id,
            WishlistItem.item_id == item_id,
        )
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
