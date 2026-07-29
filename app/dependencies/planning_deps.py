"""FastAPI dependencies for the Planning Suite.

``get_owned_event`` is a path-param dependency: because it declares
``event_type``/``event_id`` parameters with the same names as the route's
path parameters, FastAPI wires them through automatically. Every Planning
Suite endpoint depends on this instead of re-implementing ownership checks —
ownership is always re-verified against the real owning table
(couple_websites / birthday_birthdaypage / custom_events), never trusted
from the URL alone.
"""
from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.event_service import EventService, EventRef
from app.services.planning_service import PlanningService


async def get_owned_event(
    event_type: str,
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventRef:
    service = EventService(db)
    return await service.resolve_owned(event_type, event_id, user.id)


async def get_planning_service(db: AsyncSession = Depends(get_db)) -> PlanningService:
    return PlanningService(db)


async def get_event_service(db: AsyncSession = Depends(get_db)) -> EventService:
    return EventService(db)
