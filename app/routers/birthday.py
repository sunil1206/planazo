"""
Birthday router — mirrors backend/apps/birthday/views.py.

Endpoints:
  GET/POST    /api/birthday/pages/
  GET/PUT     /api/birthday/pages/{slug}/
  POST        /api/birthday/pages/{slug}/events/
  PUT/DELETE  /api/birthday/pages/{slug}/events/{id}/
  POST        /api/birthday/pages/{slug}/stories/
  PUT/DELETE  /api/birthday/pages/{slug}/stories/{id}/
  GET/POST    /api/birthday/pages/{slug}/wishes/
  GET/POST    /api/birthday/pages/{slug}/rsvps/
  POST        /api/birthday/pages/{slug}/countdown/
  POST        /api/birthday/pages/{slug}/visit/
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.base import get_db
from app.models.birthday import (
    BirthdayPage, BirthdayEvent, BirthdayStory, BirthdayWish,
    BirthdayRSVP, BirthdayCountdown,
)
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.birthday import (
    BirthdayPageCreate, BirthdayPageUpdate, BirthdayPageRead, BirthdayPageDetail,
    BirthdayEventBase, BirthdayEventRead,
    BirthdayStoryBase, BirthdayStoryRead,
    BirthdayWishCreate, BirthdayWishRead,
    BirthdayRSVPCreate, BirthdayRSVPRead,
    BirthdayCountdownBase, BirthdayCountdownRead,
)

router = APIRouter(prefix="/api/birthday", tags=["birthday"])


# ── Helper ────────────────────────────────────────────────────────────────────

async def get_page_or_404(slug: str, db: AsyncSession) -> BirthdayPage:
    result = await db.execute(
        select(BirthdayPage)
        .where(BirthdayPage.slug == slug)
        .options(
            selectinload(BirthdayPage.events),
            selectinload(BirthdayPage.stories),
            selectinload(BirthdayPage.wishes),
            selectinload(BirthdayPage.countdown),
        )
    )
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Birthday page not found")
    return page


def assert_owner(page: BirthdayPage, user: User):
    if page.owner_id != user.id and not user.is_staff:
        raise HTTPException(403, "Not your page")


# ── Pages ─────────────────────────────────────────────────────────────────────

@router.get("/pages/", response_model=List[BirthdayPageRead])
async def list_my_pages(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BirthdayPage).where(BirthdayPage.owner_id == user.id)
    )
    return result.scalars().all()


@router.post("/pages/", response_model=BirthdayPageRead, status_code=201)
async def create_page(
    body: BirthdayPageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slug_check = await db.execute(
        select(BirthdayPage).where(BirthdayPage.slug == body.slug)
    )
    if slug_check.scalar_one_or_none():
        raise HTTPException(400, "Slug already taken")
    page = BirthdayPage(**body.model_dump(), owner_id=user.id)
    db.add(page)
    await db.commit()
    await db.refresh(page)
    return page


@router.get("/pages/{slug}/", response_model=BirthdayPageDetail)
async def get_page(slug: str, db: AsyncSession = Depends(get_db)):
    return await get_page_or_404(slug, db)


@router.put("/pages/{slug}/", response_model=BirthdayPageRead)
async def update_page(
    slug: str,
    body: BirthdayPageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(page, field, val)
    await db.commit()
    await db.refresh(page)
    return page


# ── Events ────────────────────────────────────────────────────────────────────

@router.post("/pages/{slug}/events/", response_model=BirthdayEventRead, status_code=201)
async def create_event(
    slug: str,
    body: BirthdayEventBase,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    event = BirthdayEvent(**body.model_dump(), page_id=page.id)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.put("/pages/{slug}/events/{event_id}/", response_model=BirthdayEventRead)
async def update_event(
    slug: str,
    event_id: int,
    body: BirthdayEventBase,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    result = await db.execute(
        select(BirthdayEvent).where(
            BirthdayEvent.id == event_id, BirthdayEvent.page_id == page.id
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    for field, val in body.model_dump().items():
        setattr(event, field, val)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/pages/{slug}/events/{event_id}/", status_code=204)
async def delete_event(
    slug: str,
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    result = await db.execute(
        select(BirthdayEvent).where(
            BirthdayEvent.id == event_id, BirthdayEvent.page_id == page.id
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    await db.delete(event)
    await db.commit()


# ── Stories ───────────────────────────────────────────────────────────────────

@router.post("/pages/{slug}/stories/", response_model=BirthdayStoryRead, status_code=201)
async def create_story(
    slug: str,
    body: BirthdayStoryBase,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    story = BirthdayStory(**body.model_dump(), page_id=page.id)
    db.add(story)
    await db.commit()
    await db.refresh(story)
    return story


@router.put("/pages/{slug}/stories/{story_id}/", response_model=BirthdayStoryRead)
async def update_story(
    slug: str,
    story_id: int,
    body: BirthdayStoryBase,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    result = await db.execute(
        select(BirthdayStory).where(
            BirthdayStory.id == story_id, BirthdayStory.page_id == page.id
        )
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")
    for field, val in body.model_dump().items():
        setattr(story, field, val)
    await db.commit()
    await db.refresh(story)
    return story


@router.delete("/pages/{slug}/stories/{story_id}/", status_code=204)
async def delete_story(
    slug: str,
    story_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    result = await db.execute(
        select(BirthdayStory).where(
            BirthdayStory.id == story_id, BirthdayStory.page_id == page.id
        )
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")
    await db.delete(story)
    await db.commit()


# ── Wishes ────────────────────────────────────────────────────────────────────

@router.get("/pages/{slug}/wishes/", response_model=List[BirthdayWishRead])
async def list_wishes(slug: str, db: AsyncSession = Depends(get_db)):
    page = await get_page_or_404(slug, db)
    return page.wishes


@router.post("/pages/{slug}/wishes/", response_model=BirthdayWishRead, status_code=201)
async def create_wish(
    slug: str,
    body: BirthdayWishCreate,
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    wish = BirthdayWish(**body.model_dump(), page_id=page.id)
    db.add(wish)
    await db.commit()
    await db.refresh(wish)
    return wish


# ── RSVPs ─────────────────────────────────────────────────────────────────────

@router.get("/pages/{slug}/rsvps/", response_model=List[BirthdayRSVPRead])
async def list_rsvps(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    result = await db.execute(
        select(BirthdayRSVP).where(BirthdayRSVP.page_id == page.id)
    )
    return result.scalars().all()


@router.post("/pages/{slug}/rsvps/", response_model=BirthdayRSVPRead, status_code=201)
async def create_rsvp(
    slug: str,
    body: BirthdayRSVPCreate,
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    rsvp = BirthdayRSVP(**body.model_dump(), page_id=page.id)
    db.add(rsvp)
    await db.commit()
    await db.refresh(rsvp)
    return rsvp


# ── Countdown ─────────────────────────────────────────────────────────────────

@router.post("/pages/{slug}/countdown/", response_model=BirthdayCountdownRead)
async def upsert_countdown(
    slug: str,
    body: BirthdayCountdownBase,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await get_page_or_404(slug, db)
    assert_owner(page, user)
    if page.countdown:
        cd = page.countdown
        for field, val in body.model_dump().items():
            setattr(cd, field, val)
    else:
        cd = BirthdayCountdown(**body.model_dump(), page_id=page.id)
        db.add(cd)
    await db.commit()
    await db.refresh(cd)
    return cd


# ── Visit tracking ────────────────────────────────────────────────────────────

@router.post("/pages/{slug}/visit/", status_code=201)
async def record_visit(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BirthdayPage).where(BirthdayPage.slug == slug)
    )
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Birthday page not found")
    page.views = (page.views or 0) + 1
    await db.commit()
    return {"detail": "recorded"}
