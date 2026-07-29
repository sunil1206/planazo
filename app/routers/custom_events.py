"""
Custom Events router — lightweight planner for travel, festivals, vacations,
meetups, and everyday occasions. Deliberately simple compared to the Wedding
module: one CustomEvent plus small child collections (checklist, budget,
notes, gallery, files, members).

Endpoints:
  GET/POST            /api/custom-events/
  GET/PUT/DELETE      /api/custom-events/{id}/
  GET                 /api/custom-events/{id}/dashboard/

  GET/POST            /api/custom-events/{id}/checklist/
  PUT/DELETE          /api/custom-events/{id}/checklist/{item_id}/
  PATCH               /api/custom-events/{id}/checklist/{item_id}/complete/

  GET/POST            /api/custom-events/{id}/budget/
  PUT/DELETE          /api/custom-events/{id}/budget/{item_id}/

  GET/POST            /api/custom-events/{id}/notes/
  PUT/DELETE          /api/custom-events/{id}/notes/{note_id}/

  GET/POST            /api/custom-events/{id}/gallery/
  DELETE              /api/custom-events/{id}/gallery/{photo_id}/

  GET/POST            /api/custom-events/{id}/files/
  DELETE              /api/custom-events/{id}/files/{file_id}/

  GET/POST            /api/custom-events/{id}/members/
  PUT/DELETE          /api/custom-events/{id}/members/{member_id}/
  POST                /api/custom-events/{id}/members/{member_id}/invite/  (future-ready stub)
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.base import get_db
from app.models.custom_event import (
    CustomEvent, ChecklistItem, BudgetItem, EventNote, EventGallery, EventFile, EventMember,
)
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.custom_event import (
    CustomEventCreate, CustomEventUpdate, CustomEventRead,
    ChecklistItemCreate, ChecklistItemUpdate, ChecklistItemRead,
    BudgetItemCreate, BudgetItemUpdate, BudgetItemRead,
    EventNoteCreate, EventNoteUpdate, EventNoteRead,
    EventGalleryCreate, EventGalleryRead,
    EventFileCreate, EventFileRead,
    EventMemberCreate, EventMemberUpdate, EventMemberRead,
    DashboardSummary, ChecklistSummary, BudgetSummary, CustomEventDashboard,
)

router = APIRouter(prefix="/api/custom-events", tags=["custom-events"])


# ── Helpers ──────────────────────────────────────────────────────────────────────

async def get_event_or_404(event_id: int, user: User, db: AsyncSession) -> CustomEvent:
    result = await db.execute(
        select(CustomEvent)
        .where(CustomEvent.id == event_id)
        .options(
            selectinload(CustomEvent.checklist),
            selectinload(CustomEvent.budget),
            selectinload(CustomEvent.notes),
            selectinload(CustomEvent.gallery),
            selectinload(CustomEvent.files),
            selectinload(CustomEvent.members),
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    if event.owner_id != user.id and not user.is_staff:
        raise HTTPException(403, "Not your event")
    return event


def _days_remaining(event: CustomEvent) -> Optional[int]:
    target = event.end_date or event.start_date
    if not target:
        return None
    now = datetime.now(timezone.utc)
    if target.tzinfo is None:
        target = target.replace(tzinfo=timezone.utc)
    return (target.date() - now.date()).days


def _build_summary(event: CustomEvent) -> DashboardSummary:
    total = len(event.checklist)
    completed = sum(1 for c in event.checklist if c.completed)
    progress = round((completed / total) * 100) if total else 0
    estimated = float(sum(b.estimated or 0 for b in event.budget))
    spent = float(sum(b.spent or 0 for b in event.budget))
    return DashboardSummary(
        progress=progress,
        days_remaining=_days_remaining(event),
        checklist=ChecklistSummary(completed=completed, total=total),
        budget=BudgetSummary(estimated=estimated, spent=spent, remaining=estimated - spent),
        gallery_count=len(event.gallery),
        files=len(event.files),
        members=len(event.members),
    )


# ── CustomEvent CRUD ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[CustomEventRead])
async def list_events(
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(CustomEvent).where(CustomEvent.owner_id == user.id)
    if event_type:
        q = q.where(CustomEvent.event_type == event_type)
    if status:
        q = q.where(CustomEvent.status == status.upper())
    if search:
        like = f"%{search}%"
        q = q.where(or_(
            CustomEvent.title.ilike(like),
            CustomEvent.location.ilike(like),
            CustomEvent.event_type.ilike(like),
        ))
    q = q.order_by(CustomEvent.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=CustomEventRead, status_code=201)
async def create_event(
    body: CustomEventCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = CustomEvent(**body.model_dump(), owner_id=user.id)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/{event_id}/", response_model=CustomEventRead)
async def get_event(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_event_or_404(event_id, user, db)


@router.put("/{event_id}/", response_model=CustomEventRead)
async def update_event(
    event_id: int,
    body: CustomEventUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(event, field, val)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}/", status_code=204)
async def delete_event(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, user, db)
    await db.delete(event)
    await db.commit()


@router.get("/{event_id}/dashboard/", response_model=CustomEventDashboard)
async def get_dashboard(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, user, db)
    return CustomEventDashboard(event=event, summary=_build_summary(event))


# ── Checklist ─────────────────────────────────────────────────────────────────────

@router.get("/{event_id}/checklist/", response_model=List[ChecklistItemRead])
async def list_checklist(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, user, db)
    return sorted(event.checklist, key=lambda c: c.order)


@router.post("/{event_id}/checklist/", response_model=ChecklistItemRead, status_code=201)
async def create_checklist_item(
    event_id: int, body: ChecklistItemCreate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    item = ChecklistItem(**body.model_dump(), event_id=event.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{event_id}/checklist/{item_id}/", response_model=ChecklistItemRead)
async def update_checklist_item(
    event_id: int, item_id: int, body: ChecklistItemUpdate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    item = next((c for c in event.checklist if c.id == item_id), None)
    if not item:
        raise HTTPException(404, "Checklist item not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(item, field, val)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{event_id}/checklist/{item_id}/", status_code=204)
async def delete_checklist_item(
    event_id: int, item_id: int,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    item = next((c for c in event.checklist if c.id == item_id), None)
    if not item:
        raise HTTPException(404, "Checklist item not found")
    await db.delete(item)
    await db.commit()


@router.patch("/{event_id}/checklist/{item_id}/complete/", response_model=ChecklistItemRead)
async def toggle_checklist_item(
    event_id: int, item_id: int,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    item = next((c for c in event.checklist if c.id == item_id), None)
    if not item:
        raise HTTPException(404, "Checklist item not found")
    item.completed = not item.completed
    await db.commit()
    await db.refresh(item)
    return item


# ── Budget ────────────────────────────────────────────────────────────────────────

@router.get("/{event_id}/budget/", response_model=List[BudgetItemRead])
async def list_budget(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, user, db)
    return event.budget


@router.post("/{event_id}/budget/", response_model=BudgetItemRead, status_code=201)
async def create_budget_item(
    event_id: int, body: BudgetItemCreate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    item = BudgetItem(**body.model_dump(), event_id=event.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{event_id}/budget/{item_id}/", response_model=BudgetItemRead)
async def update_budget_item(
    event_id: int, item_id: int, body: BudgetItemUpdate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    item = next((b for b in event.budget if b.id == item_id), None)
    if not item:
        raise HTTPException(404, "Budget item not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(item, field, val)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{event_id}/budget/{item_id}/", status_code=204)
async def delete_budget_item(
    event_id: int, item_id: int,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    item = next((b for b in event.budget if b.id == item_id), None)
    if not item:
        raise HTTPException(404, "Budget item not found")
    await db.delete(item)
    await db.commit()


# ── Notes ─────────────────────────────────────────────────────────────────────────

@router.get("/{event_id}/notes/", response_model=List[EventNoteRead])
async def list_notes(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, user, db)
    return event.notes


@router.post("/{event_id}/notes/", response_model=EventNoteRead, status_code=201)
async def create_note(
    event_id: int, body: EventNoteCreate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    note = EventNote(**body.model_dump(), event_id=event.id)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.put("/{event_id}/notes/{note_id}/", response_model=EventNoteRead)
async def update_note(
    event_id: int, note_id: int, body: EventNoteUpdate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    note = next((n for n in event.notes if n.id == note_id), None)
    if not note:
        raise HTTPException(404, "Note not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(note, field, val)
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{event_id}/notes/{note_id}/", status_code=204)
async def delete_note(
    event_id: int, note_id: int,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    note = next((n for n in event.notes if n.id == note_id), None)
    if not note:
        raise HTTPException(404, "Note not found")
    await db.delete(note)
    await db.commit()


# ── Gallery ───────────────────────────────────────────────────────────────────────

@router.get("/{event_id}/gallery/", response_model=List[EventGalleryRead])
async def list_gallery(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, user, db)
    return event.gallery


@router.post("/{event_id}/gallery/", response_model=EventGalleryRead, status_code=201)
async def add_gallery_item(
    event_id: int, body: EventGalleryCreate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    photo = EventGallery(**body.model_dump(), event_id=event.id)
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.delete("/{event_id}/gallery/{photo_id}/", status_code=204)
async def delete_gallery_item(
    event_id: int, photo_id: int,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    photo = next((g for g in event.gallery if g.id == photo_id), None)
    if not photo:
        raise HTTPException(404, "Gallery item not found")
    await db.delete(photo)
    await db.commit()


# ── Files ─────────────────────────────────────────────────────────────────────────
# Downloading is just a GET of `file_url` (a CDN/presigned URL) — no separate
# download endpoint is needed since the storage service already returns
# directly-fetchable URLs (see services/storage.py).

@router.get("/{event_id}/files/", response_model=List[EventFileRead])
async def list_files(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, user, db)
    return event.files


@router.post("/{event_id}/files/", response_model=EventFileRead, status_code=201)
async def add_file(
    event_id: int, body: EventFileCreate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    f = EventFile(**body.model_dump(), event_id=event.id)
    db.add(f)
    await db.commit()
    await db.refresh(f)
    return f


@router.delete("/{event_id}/files/{file_id}/", status_code=204)
async def delete_file(
    event_id: int, file_id: int,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    f = next((x for x in event.files if x.id == file_id), None)
    if not f:
        raise HTTPException(404, "File not found")
    await db.delete(f)
    await db.commit()


# ── Members ───────────────────────────────────────────────────────────────────────

@router.get("/{event_id}/members/", response_model=List[EventMemberRead])
async def list_members(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, user, db)
    return event.members


@router.post("/{event_id}/members/", response_model=EventMemberRead, status_code=201)
async def add_member(
    event_id: int, body: EventMemberCreate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    member = EventMember(**body.model_dump(), event_id=event.id)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@router.put("/{event_id}/members/{member_id}/", response_model=EventMemberRead)
async def update_member(
    event_id: int, member_id: int, body: EventMemberUpdate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    member = next((m for m in event.members if m.id == member_id), None)
    if not member:
        raise HTTPException(404, "Member not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(member, field, val)
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{event_id}/members/{member_id}/", status_code=204)
async def remove_member(
    event_id: int, member_id: int,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, user, db)
    member = next((m for m in event.members if m.id == member_id), None)
    if not member:
        raise HTTPException(404, "Member not found")
    await db.delete(member)
    await db.commit()


@router.post("/{event_id}/members/{member_id}/invite/", response_model=EventMemberRead)
async def invite_member(
    event_id: int, member_id: int,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    """
    Future-ready stub: marks a member as (re-)invited. Does not yet send an
    email — wire this up to the Resend email service (see app/core/config.py
    RESEND_API_KEY) when real invite emails are needed.
    """
    event = await get_event_or_404(event_id, user, db)
    member = next((m for m in event.members if m.id == member_id), None)
    if not member:
        raise HTTPException(404, "Member not found")
    member.status = "INVITED"
    await db.commit()
    await db.refresh(member)
    return member
