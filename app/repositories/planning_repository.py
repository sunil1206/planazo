"""Repositories for the four Planning Suite modules. All four share the same
(event_type, event_id, owner_id) scoping — see base_repository.BaseRepository."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select

from app.models.planning import PlanningChecklistItem, PlanningBudgetItem, Guest, VendorBooking
from app.repositories.base_repository import BaseRepository


class ChecklistRepository(BaseRepository[PlanningChecklistItem]):
    model = PlanningChecklistItem

    async def get_owned(self, item_id: int, owner_id: int) -> Optional[PlanningChecklistItem]:
        result = await self.db.execute(
            select(PlanningChecklistItem).where(
                PlanningChecklistItem.id == item_id, PlanningChecklistItem.owner_id == owner_id
            )
        )
        return result.scalar_one_or_none()


class BudgetRepository(BaseRepository[PlanningBudgetItem]):
    model = PlanningBudgetItem

    async def get_owned(self, item_id: int, owner_id: int) -> Optional[PlanningBudgetItem]:
        result = await self.db.execute(
            select(PlanningBudgetItem).where(
                PlanningBudgetItem.id == item_id, PlanningBudgetItem.owner_id == owner_id
            )
        )
        return result.scalar_one_or_none()


class GuestRepository(BaseRepository[Guest]):
    model = Guest

    async def get_owned(self, item_id: int, owner_id: int) -> Optional[Guest]:
        result = await self.db.execute(
            select(Guest).where(Guest.id == item_id, Guest.owner_id == owner_id)
        )
        return result.scalar_one_or_none()


class VendorBookingRepository(BaseRepository[VendorBooking]):
    model = VendorBooking

    async def get_owned(self, item_id: int, owner_id: int) -> Optional[VendorBooking]:
        result = await self.db.execute(
            select(VendorBooking).where(VendorBooking.id == item_id, VendorBooking.owner_id == owner_id)
        )
        return result.scalar_one_or_none()
