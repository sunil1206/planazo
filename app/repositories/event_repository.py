"""Cross-event-type repository — the piece that makes ``GET /api/events`` and
the Planning Suite dashboard possible even though Wedding, Birthday and
Custom Events live in three unrelated tables.

Each event type is fetched with its own targeted query (no cross-table SQL
UNION — the three tables don't share a column set, and per-user event counts
are small, so merging in Python is simpler and just as fast in practice).
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.invitation import CoupleWebsite
from app.models.birthday import BirthdayPage
from app.models.custom_event import CustomEvent


class EventRepository:
    """Read access to the three siloed event tables, normalized."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_wedding(self, event_id: int) -> Optional[CoupleWebsite]:
        result = await self.db.execute(
            select(CoupleWebsite)
            .where(CoupleWebsite.id == event_id)
            .options(selectinload(CoupleWebsite.countdown))
        )
        return result.scalar_one_or_none()

    async def get_birthday(self, event_id: int) -> Optional[BirthdayPage]:
        result = await self.db.execute(
            select(BirthdayPage)
            .where(BirthdayPage.id == event_id)
            .options(selectinload(BirthdayPage.countdown))
        )
        return result.scalar_one_or_none()

    async def get_custom(self, event_id: int) -> Optional[CustomEvent]:
        result = await self.db.execute(
            select(CustomEvent).where(CustomEvent.id == event_id)
        )
        return result.scalar_one_or_none()

    async def list_weddings(self, owner_id: int) -> List[CoupleWebsite]:
        result = await self.db.execute(
            select(CoupleWebsite)
            .where(CoupleWebsite.account_id == owner_id)
            .options(selectinload(CoupleWebsite.countdown))
        )
        return list(result.scalars().all())

    async def list_birthdays(self, owner_id: int) -> List[BirthdayPage]:
        result = await self.db.execute(
            select(BirthdayPage)
            .where(BirthdayPage.owner_id == owner_id)
            .options(selectinload(BirthdayPage.countdown))
        )
        return list(result.scalars().all())

    async def list_customs(self, owner_id: int) -> List[CustomEvent]:
        result = await self.db.execute(
            select(CustomEvent).where(CustomEvent.owner_id == owner_id)
        )
        return list(result.scalars().all())
