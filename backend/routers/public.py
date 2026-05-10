import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from core.rate_limit import register_public_view_attempt, register_reservation_attempt
from db.session import get_db
from models.wishlist import Reservation, Wishlist, WishlistItem
from schemas.wishlist import (
    PublicReservationCancelRequest,
    PublicWishlist,
    PublicWishlistItem,
    PurchaseResponse,
    ReservationRequest,
    ReservationResponse,
)

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/wishlists/{public_id}", response_model=PublicWishlist)
async def get_public_wishlist(
    public_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not register_public_view_attempt(request.client.host):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
        )

    stmt = select(Wishlist).options(joinedload(Wishlist.user)).where(Wishlist.public_id == public_id)
    res = await db.execute(stmt)
    wl = res.scalar_one_or_none()

    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    if not wl.is_public:
        raise HTTPException(status_code=403, detail="This wishlist is private")

    owner_name = wl.user.email.split("@")[0]

    items_stmt = (
        select(WishlistItem)
        .options(joinedload(WishlistItem.item), joinedload(WishlistItem.reservation))
        .where(WishlistItem.wishlist_id == wl.id)
        .order_by(WishlistItem.added_at.desc())
    )
    items_res = await db.execute(items_stmt)
    wishlist_items = items_res.scalars().all()

    public_items = []
    for wi in wishlist_items:
        reservation_data = {"guest_name": wi.reservation.guest_name} if wi.reservation else None
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
                reserved_by=reservation_data,
            )
        )

    return PublicWishlist(
        id=wl.id,
        title=wl.title,
        description=wl.description,
        owner_name=owner_name,
        items=public_items,
    )


@router.post(
    "/wishlists/{public_id}/items/{item_id}/reserve",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def reserve_item(
    public_id: uuid.UUID,
    item_id: uuid.UUID,
    body: ReservationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not register_reservation_attempt(request.client.host):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
        )

    wl_stmt = select(Wishlist).where(Wishlist.public_id == public_id)
    wl_res = await db.execute(wl_stmt)
    wl = wl_res.scalar_one_or_none()

    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist or item not found")
    if not wl.is_public:
        raise HTTPException(status_code=403, detail="This wishlist is private")

    wi_stmt = (
        select(WishlistItem)
        .options(joinedload(WishlistItem.item), joinedload(WishlistItem.reservation))
        .where(WishlistItem.wishlist_id == wl.id, WishlistItem.item_id == item_id)
    )
    wi_res = await db.execute(wi_stmt)
    wi = wi_res.scalar_one_or_none()

    if not wi:
        raise HTTPException(status_code=404, detail="Wishlist or item not found")
    if wi.is_purchased:
        raise HTTPException(status_code=400, detail="Cannot reserve purchased item")
    if wi.reservation:
        raise HTTPException(status_code=409, detail="This item is already reserved")

    new_reservation = Reservation(
        wishlist_item_id=wi.id,
        guest_name=body.guest_name,
        guest_email=body.guest_email,
    )

    db.add(new_reservation)

    try:
        await db.commit()
        await db.refresh(new_reservation)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create reservation")

    return ReservationResponse(
        message="Gift reserved successfully",
        reservation_id=new_reservation.id,
        reservation_token=new_reservation.reservation_token,
        item_title=wi.item.title,
    )


@router.delete("/reservations/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_public_reservation(
    reservation_id: uuid.UUID,
    body: PublicReservationCancelRequest,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Reservation).where(Reservation.id == reservation_id)
    res = await db.execute(stmt)
    reservation = res.scalar_one_or_none()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.reservation_token != body.reservation_token:
        raise HTTPException(status_code=403, detail="Invalid reservation token")

    await db.delete(reservation)
    await db.commit()


@router.post(
    "/wishlists/{public_id}/items/{item_id}/purchase",
    response_model=PurchaseResponse,
)
async def purchase_item(
    public_id: uuid.UUID,
    item_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not register_reservation_attempt(request.client.host):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
        )

    wl_stmt = select(Wishlist).where(Wishlist.public_id == public_id)
    wl_res = await db.execute(wl_stmt)
    wl = wl_res.scalar_one_or_none()

    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist or item not found")
    if not wl.is_public:
        raise HTTPException(status_code=403, detail="This wishlist is private")

    wi_stmt = (
        select(WishlistItem)
        .options(joinedload(WishlistItem.item), joinedload(WishlistItem.reservation))
        .where(WishlistItem.wishlist_id == wl.id, WishlistItem.item_id == item_id)
    )
    wi_res = await db.execute(wi_stmt)
    wi = wi_res.scalar_one_or_none()

    if not wi:
        raise HTTPException(status_code=404, detail="Wishlist or item not found")
    if wi.is_purchased:
        raise HTTPException(status_code=409, detail="This item is already purchased")

    wi.is_purchased = True
    if wi.reservation:
        await db.delete(wi.reservation)

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to purchase item")

    return PurchaseResponse(message="Gift purchased successfully", item_title=wi.item.title)
