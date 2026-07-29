"""Normalizes Wedding / Birthday / Custom Event rows into one shape so the
Planning Suite (and the unified ``GET /api/events`` listing) can treat every
event type identically, without those three modules' tables ever being
touched or migrated.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status as http_status

from app.models.invitation import CoupleWebsite
from app.models.birthday import BirthdayPage
from app.models.custom_event import CustomEvent
from app.repositories.event_repository import EventRepository
from app.utils.pagination import PageParams

EVENT_TYPES = ("wedding", "birthday", "custom")


@dataclass
class EventRef:
    """Normalized view over whichever table actually owns this event."""
    id: int
    event_type: str
    title: str
    event_date: Optional[datetime]
    cover_image: Optional[str]
    status: str
    owner_id: int
    location: Optional[str] = None


def _derive_status(event_date: Optional[datetime]) -> str:
    if not event_date:
        return "PLANNING"
    now = datetime.now(timezone.utc)
    ed = event_date if event_date.tzinfo else event_date.replace(tzinfo=timezone.utc)
    if ed.date() == now.date():
        return "ONGOING"
    if ed > now:
        return "UPCOMING"
    return "COMPLETED"


def _from_wedding(w: CoupleWebsite) -> EventRef:
    event_date = w.countdown.event_date if getattr(w, "countdown", None) else None
    return EventRef(
        id=w.id, event_type="wedding", title=w.couple or "Untitled Wedding",
        event_date=event_date, cover_image=w.thumbnail,
        status=_derive_status(event_date), owner_id=w.account_id,
    )


def _from_birthday(b: BirthdayPage) -> EventRef:
    event_date = b.countdown.event_date if getattr(b, "countdown", None) else None
    return EventRef(
        id=b.id, event_type="birthday", title=b.title or "Untitled Birthday",
        event_date=event_date, cover_image=b.cover_image,
        status=_derive_status(event_date), owner_id=b.owner_id,
    )


def _from_custom(c: CustomEvent) -> EventRef:
    event_date = c.start_date
    return EventRef(
        id=c.id, event_type="custom", title=c.title,
        event_date=event_date, cover_image=c.cover_image,
        status=(c.status or _derive_status(event_date)), owner_id=c.owner_id,
        location=c.location or None,
    )


class EventService:
    def __init__(self, db):
        self.repo = EventRepository(db)

    async def resolve(self, event_type: str, event_id: int) -> EventRef:
        event_type = (event_type or "").strip().lower()
        if event_type not in EVENT_TYPES:
            raise HTTPException(http_status.HTTP_400_BAD_REQUEST,
                                 f"event_type must be one of {', '.join(EVENT_TYPES)}")
        if event_type == "wedding":
            row = await self.repo.get_wedding(event_id)
            ref = _from_wedding(row) if row else None
        elif event_type == "birthday":
            row = await self.repo.get_birthday(event_id)
            ref = _from_birthday(row) if row else None
        else:
            row = await self.repo.get_custom(event_id)
            ref = _from_custom(row) if row else None

        if ref is None:
            raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Event not found")
        return ref

    async def resolve_owned(self, event_type: str, event_id: int, user_id: int) -> EventRef:
        ref = await self.resolve(event_type, event_id)
        if ref.owner_id != user_id:
            raise HTTPException(http_status.HTTP_403_FORBIDDEN, "You do not own this event")
        return ref

    async def list_events(
        self, owner_id: int, *, search: Optional[str] = None,
        event_type: Optional[str] = None, status_filter: Optional[str] = None,
        sort_by: str = "date", sort_dir: str = "desc", params: PageParams,
    ) -> dict:
        refs: List[EventRef] = []

        types_to_query = [event_type] if event_type else list(EVENT_TYPES)
        for et in types_to_query:
            if et not in EVENT_TYPES:
                raise HTTPException(http_status.HTTP_400_BAD_REQUEST,
                                     f"event_type must be one of {', '.join(EVENT_TYPES)}")
            if et == "wedding":
                refs.extend(_from_wedding(w) for w in await self.repo.list_weddings(owner_id))
            elif et == "birthday":
                refs.extend(_from_birthday(b) for b in await self.repo.list_birthdays(owner_id))
            else:
                refs.extend(_from_custom(c) for c in await self.repo.list_customs(owner_id))

        if search:
            needle = search.strip().lower()
            refs = [r for r in refs if needle in (r.title or "").lower()]
        if status_filter:
            refs = [r for r in refs if r.status.upper() == status_filter.upper()]

        reverse = sort_dir.lower() != "asc"
        if sort_by == "title":
            refs.sort(key=lambda r: (r.title or "").lower(), reverse=reverse)
        else:
            # date sort — events with no date always sink to the end, regardless of direction
            dated = [r for r in refs if r.event_date is not None]
            undated = [r for r in refs if r.event_date is None]
            dated.sort(key=lambda r: r.event_date, reverse=reverse)
            refs = dated + undated

        total = len(refs)
        start = params.offset
        page_items = refs[start:start + params.page_size]
        pages = (total + params.page_size - 1) // params.page_size if params.page_size else 0
        return {
            "items": page_items, "total": total,
            "page": params.page, "page_size": params.page_size, "pages": max(pages, 0),
        }
