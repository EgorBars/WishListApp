from fastapi import APIRouter, Depends, HTTPException, status
from core.rate_limit import register_parse_attempt
from dependencies.auth import get_current_user
from models.user import User
from schemas.item import ParseRequest, ParseResponse
from core.scraper import ScraperService

router = APIRouter(prefix="/items", tags=["items"])
scraper = ScraperService()


@router.post("/parse", response_model=ParseResponse)
async def parse_item_url(
        body: ParseRequest,
        current_user: User = Depends(get_current_user)
):
    # 1. Rate Limit
    if not register_parse_attempt(str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again in 60 seconds."
        )

    # 2. Parsing
    result = await scraper.parse_url(body.url)

    # 3. Return
    return result