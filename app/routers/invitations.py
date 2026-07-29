"""
Invitation router — mirrors backend/apps/invitation/views.py.

Endpoints:
  GET/POST/PUT  /api/invitations/websites/
  GET/PUT       /api/invitations/websites/{slug}/
  GET/POST      /api/invitations/websites/{slug}/bridegroom/
  GET/POST/PUT/DELETE /api/invitations/websites/{slug}/stories/
  GET/POST/PUT/DELETE /api/invitations/websites/{slug}/events/
  GET/POST/PUT  /api/invitations/websites/{slug}/countdown/
  GET/POST      /api/invitations/websites/{slug}/rsvps/
  GET/POST      /api/invitations/websites/{slug}/wishes/
  GET/POST      /api/invitations/websites/{slug}/photos/
  POST          /api/invitations/websites/{slug}/visit/
"""
import logging
import secrets
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.base import get_db
from app.models.invitation import (
    CoupleWebsite, BrideGroom, BrideGroomStory, BrideGroomEvent,
    WeddingCountdown, InvitationRSVP, Makeyourwish, PageVisit,
    WeddingGalleryPhoto, WeddingVendor,
)
from app.models.user import User
from app.core.dependencies import get_current_user, get_current_user_optional, require_role
from app.schemas.invitation import (
    CoupleWebsiteCreate, CoupleWebsiteUpdate, CoupleWebsiteRead, CoupleWebsiteDetail,
    BrideGroomUpsert, BrideGroomRead,
    StoryCreate, StoryUpdate, StoryRead,
    EventCreate, EventUpdate, EventRead,
    CountdownUpsert, CountdownRead,
    RSVPCreate, RSVPRead,
    WishCreate, WishRead,
    WeddingPhotoRead,
    WeddingVendorAdd, WeddingVendorRead,
)

router = APIRouter(prefix="/api/invitations", tags=["invitations"])


# ── Helper ────────────────────────────────────────────────────────────────────

async def get_website_or_404(slug: str, db: AsyncSession) -> CoupleWebsite:
    result = await db.execute(
        select(CoupleWebsite)
        .where(CoupleWebsite.slug == slug)
        .options(
            selectinload(CoupleWebsite.bridegroom),
            selectinload(CoupleWebsite.stories),
            selectinload(CoupleWebsite.events),
            selectinload(CoupleWebsite.countdown),
        )
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "Website not found")
    return website


def assert_owner(website: CoupleWebsite, user: User):
    if website.account_id != user.id and not user.is_staff:
        raise HTTPException(403, "Not your website")


# ── Website CRUD ──────────────────────────────────────────────────────────────

@router.get("/websites/", response_model=List[CoupleWebsiteRead])
async def list_my_websites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CoupleWebsite).where(CoupleWebsite.account_id == user.id)
    )
    return result.scalars().all()


@router.post("/websites/", response_model=CoupleWebsiteRead, status_code=201)
async def create_website(
    body: CoupleWebsiteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Enforce slug uniqueness
    exists = await db.execute(select(CoupleWebsite).where(CoupleWebsite.slug == body.slug))
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Slug already taken")

    website = CoupleWebsite(
        **body.model_dump(),
        account_id=user.id,
        gallery_token=secrets.token_urlsafe(8)[:12],
    )
    db.add(website)
    await db.commit()
    await db.refresh(website)
    return website


@router.get("/websites/{slug}/", response_model=CoupleWebsiteDetail)
async def get_website(slug: str, db: AsyncSession = Depends(get_db)):
    return await get_website_or_404(slug, db)


@router.put("/websites/{slug}/", response_model=CoupleWebsiteRead)
async def update_website(
    slug: str,
    body: CoupleWebsiteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(website, field, val)
    await db.commit()
    await db.refresh(website)
    return website


@router.delete("/websites/{slug}/", status_code=204)
async def delete_website(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    await db.delete(website)
    await db.commit()


# ── BrideGroom ────────────────────────────────────────────────────────────────

@router.get("/websites/{slug}/bridegroom/", response_model=Optional[BrideGroomRead])
async def get_bridegroom(slug: str, db: AsyncSession = Depends(get_db)):
    website = await get_website_or_404(slug, db)
    return website.bridegroom


@router.post("/websites/{slug}/bridegroom/", response_model=BrideGroomRead)
async def upsert_bridegroom(
    slug: str,
    body: BrideGroomUpsert,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    if website.bridegroom:
        bg = website.bridegroom
        for field, val in body.model_dump().items():
            setattr(bg, field, val)
    else:
        bg = BrideGroom(**body.model_dump(), website_id=website.id)
        db.add(bg)
    await db.commit()
    await db.refresh(bg)
    return bg


# ── Stories ───────────────────────────────────────────────────────────────────

@router.get("/websites/{slug}/stories/", response_model=List[StoryRead])
async def list_stories(slug: str, db: AsyncSession = Depends(get_db)):
    website = await get_website_or_404(slug, db)
    return sorted(website.stories, key=lambda s: s.order)


@router.post("/websites/{slug}/stories/", response_model=StoryRead, status_code=201)
async def create_story(
    slug: str,
    body: StoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    story = BrideGroomStory(**body.model_dump(), website_id=website.id)
    db.add(story)
    await db.commit()
    await db.refresh(story)
    return story


@router.put("/websites/{slug}/stories/{story_id}/", response_model=StoryRead)
async def update_story(
    slug: str,
    story_id: int,
    body: StoryUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    result = await db.execute(
        select(BrideGroomStory).where(
            BrideGroomStory.id == story_id,
            BrideGroomStory.website_id == website.id,
        )
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(story, field, val)
    await db.commit()
    await db.refresh(story)
    return story


@router.delete("/websites/{slug}/stories/{story_id}/", status_code=204)
async def delete_story(
    slug: str,
    story_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    result = await db.execute(
        select(BrideGroomStory).where(
            BrideGroomStory.id == story_id,
            BrideGroomStory.website_id == website.id,
        )
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")
    await db.delete(story)
    await db.commit()


# ── Events ────────────────────────────────────────────────────────────────────

@router.get("/websites/{slug}/events/", response_model=List[EventRead])
async def list_events(slug: str, db: AsyncSession = Depends(get_db)):
    website = await get_website_or_404(slug, db)
    return sorted(website.events, key=lambda e: e.order)


@router.post("/websites/{slug}/events/", response_model=EventRead, status_code=201)
async def create_event(
    slug: str,
    body: EventCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    event = BrideGroomEvent(**body.model_dump(), website_id=website.id)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.put("/websites/{slug}/events/{event_id}/", response_model=EventRead)
async def update_event(
    slug: str,
    event_id: int,
    body: EventUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    result = await db.execute(
        select(BrideGroomEvent).where(
            BrideGroomEvent.id == event_id,
            BrideGroomEvent.website_id == website.id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(event, field, val)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/websites/{slug}/events/{event_id}/", status_code=204)
async def delete_event(
    slug: str,
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    result = await db.execute(
        select(BrideGroomEvent).where(
            BrideGroomEvent.id == event_id,
            BrideGroomEvent.website_id == website.id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    await db.delete(event)
    await db.commit()


# ── Countdown ─────────────────────────────────────────────────────────────────

@router.get("/websites/{slug}/countdown/", response_model=Optional[CountdownRead])
async def get_countdown(slug: str, db: AsyncSession = Depends(get_db)):
    website = await get_website_or_404(slug, db)
    return website.countdown


@router.post("/websites/{slug}/countdown/", response_model=CountdownRead)
async def upsert_countdown(
    slug: str,
    body: CountdownUpsert,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    if website.countdown:
        cd = website.countdown
        for field, val in body.model_dump().items():
            setattr(cd, field, val)
    else:
        cd = WeddingCountdown(**body.model_dump(), website_id=website.id)
        db.add(cd)
    await db.commit()
    await db.refresh(cd)
    return cd


# ── RSVPs ─────────────────────────────────────────────────────────────────────

@router.get("/websites/{slug}/rsvps/", response_model=List[RSVPRead])
async def list_rsvps(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    result = await db.execute(
        select(InvitationRSVP).where(InvitationRSVP.website_id == website.id)
    )
    return result.scalars().all()


@router.post("/websites/{slug}/rsvps/", response_model=RSVPRead, status_code=201)
async def create_rsvp(
    slug: str,
    body: RSVPCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CoupleWebsite)
        .where(CoupleWebsite.slug == slug)
        .options(selectinload(CoupleWebsite.account))
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "Website not found")
    rsvp = InvitationRSVP(**body.model_dump(), website_id=website.id)
    db.add(rsvp)
    await db.commit()
    await db.refresh(rsvp)

    if website.account and website.account.email:
        try:
            from app.workers.tasks.email_tasks import send_rsvp_notification_task
            send_rsvp_notification_task.delay(
                owner_email=website.account.email, rsvp_name=rsvp.name, website_slug=website.slug,
            )
        except Exception:
            # Celery/Redis being unavailable should never fail the RSVP submission itself.
            logging.getLogger("planazo").warning("Could not queue RSVP notification for %s", slug, exc_info=True)

    return rsvp


# ── Wishes ────────────────────────────────────────────────────────────────────

@router.get("/websites/{slug}/wishes/", response_model=List[WishRead])
async def list_wishes(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CoupleWebsite).where(CoupleWebsite.slug == slug))
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "Website not found")
    result2 = await db.execute(
        select(Makeyourwish).where(Makeyourwish.website_id == website.id)
    )
    return result2.scalars().all()


@router.post("/websites/{slug}/wishes/", response_model=WishRead, status_code=201)
async def create_wish(
    slug: str,
    body: WishCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CoupleWebsite).where(CoupleWebsite.slug == slug))
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "Website not found")
    wish = Makeyourwish(**body.model_dump(), website_id=website.id)
    db.add(wish)
    await db.commit()
    await db.refresh(wish)
    return wish


# ── Wedding Vendors ───────────────────────────────────────────────────────────

@router.get("/websites/{slug}/vendors/", response_model=List[WeddingVendorRead])
async def list_wedding_vendors(slug: str, db: AsyncSession = Depends(get_db)):
    website = await get_website_or_404(slug, db)
    result = await db.execute(
        select(WeddingVendor).where(WeddingVendor.website_id == website.id)
    )
    return result.scalars().all()


@router.post("/websites/{slug}/vendors/", response_model=WeddingVendorRead, status_code=201)
async def add_wedding_vendor(
    slug: str,
    body: WeddingVendorAdd,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    exists = await db.execute(
        select(WeddingVendor).where(
            WeddingVendor.website_id == website.id,
            WeddingVendor.vendor_id == body.vendor_id,
        )
    )
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Vendor already added")
    wv = WeddingVendor(**body.model_dump(), website_id=website.id)
    db.add(wv)
    await db.commit()
    await db.refresh(wv)
    return wv


@router.delete("/websites/{slug}/vendors/{vendor_row_id}/", status_code=204)
async def remove_wedding_vendor(
    slug: str,
    vendor_row_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    result = await db.execute(
        select(WeddingVendor).where(
            WeddingVendor.id == vendor_row_id,
            WeddingVendor.website_id == website.id,
        )
    )
    wv = result.scalar_one_or_none()
    if not wv:
        raise HTTPException(404, "Not found")
    await db.delete(wv)
    await db.commit()


# ── Wedding Gallery Photos ─────────────────────────────────────────────────────

@router.get("/websites/{slug}/photos/", response_model=List[WeddingPhotoRead])
async def list_wedding_photos(
    slug: str,
    tag: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    q = select(WeddingGalleryPhoto).where(WeddingGalleryPhoto.website_id == website.id)
    if tag:
        q = q.where(WeddingGalleryPhoto.tag == tag)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/websites/{slug}/photos/", response_model=WeddingPhotoRead, status_code=201)
async def add_wedding_photo(
    slug: str,
    image: str,
    tag: str = "other",
    caption: str = "",
    thumbnail: Optional[str] = None,
    uploader_name: str = "Guest",
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    photo = WeddingGalleryPhoto(
        website_id=website.id, image=image, thumbnail=thumbnail,
        tag=tag, caption=caption, uploader_name=uploader_name,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.delete("/websites/{slug}/photos/{photo_id}/", status_code=204)
async def delete_wedding_photo(
    slug: str,
    photo_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    website = await get_website_or_404(slug, db)
    assert_owner(website, user)
    result = await db.execute(
        select(WeddingGalleryPhoto).where(
            WeddingGalleryPhoto.id == photo_id,
            WeddingGalleryPhoto.website_id == website.id,
        )
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(404, "Photo not found")
    await db.delete(photo)
    await db.commit()


# ── Page visit tracking ───────────────────────────────────────────────────────

@router.post("/websites/{slug}/visit/", status_code=201)
async def record_visit(slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CoupleWebsite).where(CoupleWebsite.slug == slug))
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "Website not found")
    ip = request.client.host if request.client else "0.0.0.0"
    visit = PageVisit(website_id=website.id, ip_address=ip)
    db.add(visit)
    website.views = (website.views or 0) + 1
    await db.commit()
    return {"detail": "recorded"}
