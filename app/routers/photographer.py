"""
Photographer router.

Endpoints:
  GET    /api/photographer/profile/                  — my profile (PHOTOGRAPHER role)
  POST   /api/photographer/profile/                  — create profile
  PATCH  /api/photographer/profile/                  — update profile
  GET    /api/photographer/assignments/              — my event assignments
  PATCH  /api/photographer/assignments/{id}/accept/  — accept assignment
  PATCH  /api/photographer/assignments/{id}/decline/ — decline assignment
  GET    /api/photographer/gallery/{event_type}/{event_id}/ — upload gallery for assigned event
  POST   /api/photographer/upload/                   — record completed upload (after presign)
  GET    /api/photographer/directory/                — public photographer listing
  GET    /api/photographer/directory/{id}/           — public profile detail
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.permissions import PhotographerProfile, PhotographerAssignment
from app.schemas.permissions import (
    PhotographerProfileCreate, PhotographerProfileRead,
    AssignPhotographerRequest, AssignmentRead,
)
from services.storage import storage

router = APIRouter(prefix="/api/photographer", tags=["photographer"])


def _require_photographer(user: User):
    if user.role not in ("PHOTOGRAPHER", "ADMIN"):
        raise HTTPException(403, "Photographer role required")


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/profile/", response_model=PhotographerProfileRead)
async def get_my_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_photographer(user)
    result = await db.execute(
        select(PhotographerProfile).where(PhotographerProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found — please create one first")
    return profile


@router.post("/profile/", response_model=PhotographerProfileRead, status_code=201)
async def create_profile(
    body: PhotographerProfileCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_photographer(user)
    existing = (await db.execute(
        select(PhotographerProfile).where(PhotographerProfile.user_id == user.id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Profile already exists")

    profile = PhotographerProfile(**body.model_dump(), user_id=user.id)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.patch("/profile/", response_model=PhotographerProfileRead)
async def update_profile(
    body: PhotographerProfileCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_photographer(user)
    result = await db.execute(
        select(PhotographerProfile).where(PhotographerProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(profile, k, v)
    await db.commit()
    await db.refresh(profile)
    return profile


# ── Assignments ───────────────────────────────────────────────────────────────

@router.get("/assignments/", response_model=List[AssignmentRead])
async def my_assignments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_photographer(user)
    profile_result = await db.execute(
        select(PhotographerProfile).where(PhotographerProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return []

    result = await db.execute(
        select(PhotographerAssignment)
        .where(PhotographerAssignment.photographer_id == profile.id)
        .order_by(PhotographerAssignment.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/assignments/{assignment_id}/accept/", response_model=AssignmentRead)
async def accept_assignment(
    assignment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_photographer(user)
    result = await db.execute(
        select(PhotographerAssignment)
        .join(PhotographerProfile)
        .where(
            PhotographerAssignment.id == assignment_id,
            PhotographerProfile.user_id == user.id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    assignment.status = "ACCEPTED"
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.patch("/assignments/{assignment_id}/decline/", response_model=AssignmentRead)
async def decline_assignment(
    assignment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_photographer(user)
    result = await db.execute(
        select(PhotographerAssignment)
        .join(PhotographerProfile)
        .where(
            PhotographerAssignment.id == assignment_id,
            PhotographerProfile.user_id == user.id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    assignment.status = "DECLINED"
    await db.commit()
    await db.refresh(assignment)
    return assignment


# ── Assign photographer (called by event owner) ───────────────────────────────

@router.post("/assign/", response_model=AssignmentRead, status_code=201)
async def assign_photographer(
    body: AssignPhotographerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_result = await db.execute(
        select(PhotographerProfile).where(PhotographerProfile.id == body.photographer_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Photographer not found")

    existing = (await db.execute(
        select(PhotographerAssignment).where(
            PhotographerAssignment.photographer_id == body.photographer_id,
            PhotographerAssignment.event_type      == body.event_type.upper(),
            PhotographerAssignment.event_id        == body.event_id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Photographer already assigned to this event")

    assignment = PhotographerAssignment(
        photographer_id=body.photographer_id,
        event_type=body.event_type.upper(),
        event_id=body.event_id,
        assigned_by_id=user.id,
        notes=body.notes,
        shoot_date=body.shoot_date,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


# ── Public directory ──────────────────────────────────────────────────────────

@router.get("/directory/", response_model=List[PhotographerProfileRead])
async def photographer_directory(
    city: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = select(PhotographerProfile).where(PhotographerProfile.is_available == True)
    if city:
        q = q.where(PhotographerProfile.base_city.ilike(f"%{city}%"))
    q = q.order_by(PhotographerProfile.rating.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/directory/{profile_id}/", response_model=PhotographerProfileRead)
async def get_photographer(
    profile_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PhotographerProfile).where(PhotographerProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Photographer not found")
    return profile
