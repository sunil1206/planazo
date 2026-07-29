"""Generic async repository base — thin wrapper around SQLAlchemy 2.x async
queries so services never construct raw ``select()`` statements themselves.

Every Planning Suite repository (checklist/budget/guests/vendor bookings)
shares the same shape: rows are scoped by (event_type, event_id) and, for
mutations, by owner_id. Subclasses only need to declare ``model``.
"""
from __future__ import annotations

from typing import Generic, List, Optional, Type, TypeVar

from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    model: Type[ModelT]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, item_id: int) -> Optional[ModelT]:
        result = await self.db.execute(select(self.model).where(self.model.id == item_id))
        return result.scalar_one_or_none()

    async def list_for_event(self, event_type: str, event_id: int, *, order_by=None) -> List[ModelT]:
        q = select(self.model).where(
            self.model.event_type == event_type,
            self.model.event_id == event_id,
        )
        if order_by is not None:
            q = q.order_by(order_by)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def count_for_event(self, event_type: str, event_id: int) -> int:
        result = await self.db.execute(
            select(sa_func.count()).select_from(self.model).where(
                self.model.event_type == event_type,
                self.model.event_id == event_id,
            )
        )
        return result.scalar_one()

    async def create(self, **fields) -> ModelT:
        obj = self.model(**fields)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelT, **fields) -> ModelT:
        for key, value in fields.items():
            if value is not None:
                setattr(obj, key, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.db.delete(obj)
        await self.db.flush()
