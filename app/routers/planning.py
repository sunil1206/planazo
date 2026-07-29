"""
Planning Suite router.

Planning Suite does NOT create events — it manages Checklist / Budget /
Guest List / Vendor Bookings for events that already exist in Wedding,
Birthday or Custom Events. See app/services/event_service.py for how those
three separate tables are normalized into one shape, and
app/dependencies/planning_deps.py for the ownership-checked path dependency
every endpoint below relies on.

Endpoints:
  GET  /api/events/                                                — unified cross-event-type list
  GET  /api/planning/{event_type}/{event_id}/dashboard/             — aggregated stats

  GET/POST   /api/planning/{event_type}/{event_id}/checklist/
  GET/PUT/DELETE /api/planning/{event_type}/{event_id}/checklist/{item_id}/

  GET/POST   /api/planning/{event_type}/{event_id}/budget/
  GET/PUT/DELETE /api/planning/{event_type}/{event_id}/budget/{item_id}/

  GET        /api/planning/{event_type}/{event_id}/guests/summary/
  GET/POST   /api/planning/{event_type}/{event_id}/guests/
  GET/PUT/DELETE /api/planning/{event_type}/{event_id}/guests/{item_id}/

  GET/POST   /api/planning/{event_type}/{event_id}/vendor-bookings/
  GET/PUT/DELETE /api/planning/{event_type}/{event_id}/vendor-bookings/{item_id}/

Note on the ``{event_id}`` path: IDs are only unique *within* a single event
type (a wedding #3 and a custom event #3 can both exist), so every path
includes ``event_type`` alongside ``event_id`` to disambiguate — a small,
deliberate deviation from the spec's literal ``/api/planning/{event_id}``
shape, needed because no single table spans all event types.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.dependencies.planning_deps import get_owned_event, get_planning_service, get_event_service
from app.services.event_service import EventRef, EventService, EVENT_TYPES
from app.services.planning_service import PlanningService
from app.utils.pagination import PageParams, page_params
from app.schemas.planning import (
    EventListResponse, EventSummary,
    ChecklistItemCreate, ChecklistItemUpdate, ChecklistItemRead,
    BudgetItemCreate, BudgetItemUpdate, BudgetItemRead,
    GuestCreate, GuestUpdate, GuestRead, GuestSummary,
    VendorBookingCreate, VendorBookingUpdate, VendorBookingRead,
    PlanningDashboard, DashboardStats,
)

router = APIRouter(prefix="/api", tags=["planning"])


# ── Unified events list ───────────────────────────────────────────────────────

@router.get("/events/", response_model=EventListResponse)
async def list_events(
    search: Optional[str] = Query(None, description="Case-insensitive title search"),
    event_type: Optional[str] = Query(None, description=f"Filter to one of {EVENT_TYPES}"),
    status_filter: Optional[str] = Query(None, alias="status"),
    sort_by: str = Query("date", pattern="^(date|title)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    params: PageParams = Depends(page_params),
    user: User = Depends(get_current_user),
    svc: EventService = Depends(get_event_service),
):
    result = await svc.list_events(
        user.id, search=search, event_type=event_type, status_filter=status_filter,
        sort_by=sort_by, sort_dir=sort_dir, params=params,
    )
    return {
        **result,
        "items": [EventSummary.model_validate(r.__dict__) for r in result["items"]],
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/planning/{event_type}/{event_id}/dashboard/", response_model=PlanningDashboard)
async def get_dashboard(
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    stats = await planning.dashboard_stats(event.event_type, event.id)
    return {"event": EventSummary.model_validate(event.__dict__), "stats": DashboardStats(**stats)}


# ── Checklist ─────────────────────────────────────────────────────────────────

@router.get("/planning/{event_type}/{event_id}/checklist/", response_model=list[ChecklistItemRead])
async def list_checklist(
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.list_checklist(event.event_type, event.id)


@router.post("/planning/{event_type}/{event_id}/checklist/", response_model=ChecklistItemRead, status_code=201)
async def create_checklist_item(
    body: ChecklistItemCreate,
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.create_checklist_item(event.event_type, event.id, event.owner_id, body.model_dump())


@router.get("/planning/{event_type}/{event_id}/checklist/{item_id}/", response_model=ChecklistItemRead)
async def get_checklist_item(
    item_id: int,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_checklist_item_owned(item_id, user.id)
    _assert_scoped(item, event)
    return item


@router.put("/planning/{event_type}/{event_id}/checklist/{item_id}/", response_model=ChecklistItemRead)
async def update_checklist_item(
    item_id: int,
    body: ChecklistItemUpdate,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_checklist_item_owned(item_id, user.id)
    _assert_scoped(item, event)
    return await planning.update_checklist_item(item, body.model_dump(exclude_unset=True))


@router.delete("/planning/{event_type}/{event_id}/checklist/{item_id}/", status_code=204)
async def delete_checklist_item(
    item_id: int,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_checklist_item_owned(item_id, user.id)
    _assert_scoped(item, event)
    await planning.delete_checklist_item(item)


# ── Budget ────────────────────────────────────────────────────────────────────

@router.get("/planning/{event_type}/{event_id}/budget/", response_model=list[BudgetItemRead])
async def list_budget(
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.list_budget(event.event_type, event.id)


@router.post("/planning/{event_type}/{event_id}/budget/", response_model=BudgetItemRead, status_code=201)
async def create_budget_item(
    body: BudgetItemCreate,
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.create_budget_item(event.event_type, event.id, event.owner_id, body.model_dump())


@router.get("/planning/{event_type}/{event_id}/budget/{item_id}/", response_model=BudgetItemRead)
async def get_budget_item(
    item_id: int,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_budget_item_owned(item_id, user.id)
    _assert_scoped(item, event)
    return item


@router.put("/planning/{event_type}/{event_id}/budget/{item_id}/", response_model=BudgetItemRead)
async def update_budget_item(
    item_id: int,
    body: BudgetItemUpdate,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_budget_item_owned(item_id, user.id)
    _assert_scoped(item, event)
    return await planning.update_budget_item(item, body.model_dump(exclude_unset=True))


@router.delete("/planning/{event_type}/{event_id}/budget/{item_id}/", status_code=204)
async def delete_budget_item(
    item_id: int,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_budget_item_owned(item_id, user.id)
    _assert_scoped(item, event)
    await planning.delete_budget_item(item)


# ── Guests ────────────────────────────────────────────────────────────────────

@router.get("/planning/{event_type}/{event_id}/guests/summary/", response_model=GuestSummary)
async def guests_summary(
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.guest_summary(event.event_type, event.id)


@router.get("/planning/{event_type}/{event_id}/guests/", response_model=list[GuestRead])
async def list_guests(
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.list_guests(event.event_type, event.id)


@router.post("/planning/{event_type}/{event_id}/guests/", response_model=GuestRead, status_code=201)
async def create_guest(
    body: GuestCreate,
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.create_guest(event.event_type, event.id, event.owner_id, body.model_dump())


@router.get("/planning/{event_type}/{event_id}/guests/{item_id}/", response_model=GuestRead)
async def get_guest(
    item_id: int,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_guest_owned(item_id, user.id)
    _assert_scoped(item, event)
    return item


@router.put("/planning/{event_type}/{event_id}/guests/{item_id}/", response_model=GuestRead)
async def update_guest(
    item_id: int,
    body: GuestUpdate,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_guest_owned(item_id, user.id)
    _assert_scoped(item, event)
    return await planning.update_guest(item, body.model_dump(exclude_unset=True))


@router.delete("/planning/{event_type}/{event_id}/guests/{item_id}/", status_code=204)
async def delete_guest(
    item_id: int,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_guest_owned(item_id, user.id)
    _assert_scoped(item, event)
    await planning.delete_guest(item)


# ── Vendor bookings ───────────────────────────────────────────────────────────

@router.get("/planning/{event_type}/{event_id}/vendor-bookings/", response_model=list[VendorBookingRead])
async def list_vendor_bookings(
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.list_vendor_bookings(event.event_type, event.id)


@router.post("/planning/{event_type}/{event_id}/vendor-bookings/", response_model=VendorBookingRead, status_code=201)
async def create_vendor_booking(
    body: VendorBookingCreate,
    event: EventRef = Depends(get_owned_event),
    planning: PlanningService = Depends(get_planning_service),
):
    return await planning.create_vendor_booking(event.event_type, event.id, event.owner_id, body.model_dump())


@router.get("/planning/{event_type}/{event_id}/vendor-bookings/{item_id}/", response_model=VendorBookingRead)
async def get_vendor_booking(
    item_id: int,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_vendor_booking_owned(item_id, user.id)
    _assert_scoped(item, event)
    return item


@router.put("/planning/{event_type}/{event_id}/vendor-bookings/{item_id}/", response_model=VendorBookingRead)
async def update_vendor_booking(
    item_id: int,
    body: VendorBookingUpdate,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_vendor_booking_owned(item_id, user.id)
    _assert_scoped(item, event)
    return await planning.update_vendor_booking(item, body.model_dump(exclude_unset=True))


@router.delete("/planning/{event_type}/{event_id}/vendor-bookings/{item_id}/", status_code=204)
async def delete_vendor_booking(
    item_id: int,
    event: EventRef = Depends(get_owned_event),
    user: User = Depends(get_current_user),
    planning: PlanningService = Depends(get_planning_service),
):
    item = await planning.get_vendor_booking_owned(item_id, user.id)
    _assert_scoped(item, event)
    await planning.delete_vendor_booking(item)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _assert_scoped(item, event: EventRef) -> None:
    """Item-level ops are reached via the event's own path, but the item_id
    is a bare integer — make sure it actually belongs to *this* event and
    not some other event the same user owns."""
    if item.event_type != event.event_type or item.event_id != event.id:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Not found for this event")
