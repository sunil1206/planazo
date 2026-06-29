"""
Event Permission router.

Endpoints:
  GET    /api/permissions/{event_type}/{event_id}/        — list all members of an event
  POST   /api/permissions/{event_type}/{event_id}/        — grant access to a user
  PATCH  /api/permissions/{event_type}/{event_id}/{perm_id}/ — update role/capabilities
  DELETE /api/permissions/{event_type}/{event_id}/{perm_id}/ — revoke access
  GET    /api/permissions/me/                             — all events I have access to
  POST   /api/permissions/accept/{token}/                 — accept an invite token
"""
import secrets
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.permissions import EventPermission, EventRole
from app.schemas.permissions import (
    GrantPermissionRequest, UpdatePermissionRequest, PermissionRead,
)

router = APIRouter(prefix="/api/permissions", tags=["permissions"])

VALID_EVENT_TYPES = {"WEDDING", "BIRTHDAY", "CORPORATE", "TRIP"}


def _assert_event_type(event_type: str):
    if event_type.upper() not in VALID_EVENT_TYPES:
        raise HTTPException(400, f"Invalid event_type. Choose from: {sorted(VALID_EVENT_TYPES)}")


async def _get_requester_perm(
    event_type: str, event_id: int, user: User, db: AsyncSession
) -> EventPermission:
    """Fetch the current user's permission row; raise 403 if not found."""
    result = await db.execute(
        select(EventPermission).where(
            EventPermission.event_type == event_type.upper(),
            EventPermission.event_id  == event_id,
            EventPermission.user_id   == user.id,
        )
    )
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(403, "You do not have access to this event")
    return perm


# ── List members ──────────────────────────────────────────────────────────────

@router.get("/{event_type}/{event_id}/", response_model=List[PermissionRead])
async def list_permissions(
    event_type: str,
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_event_type(event_type)
    requester = await _get_requester_perm(event_type, event_id, user, db)
    if not requester.effective("can_manage_permissions") and user.role != "ADMIN":
        raise HTTPException(403, "You need manage_permissions capability")

    result = await db.execute(
        select(EventPermission).where(
            EventPermission.event_type == event_type.upper(),
            EventPermission.event_id  == event_id,
        ).order_by(EventPermission.created_at)
    )
    return result.scalars().all()


# ── Grant access ──────────────────────────────────────────────────────────────

@router.post("/{event_type}/{event_id}/", response_model=PermissionRead, status_code=201)
async def grant_permission(
    event_type: str,
    event_id: int,
    body: GrantPermissionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_event_type(event_type)
    if body.role not in EventRole.ALL:
        raise HTTPException(400, f"Invalid role. Choose from: {EventRole.ALL}")

    requester = await _get_requester_perm(event_type, event_id, user, db)
    if not requester.effective("can_manage_permissions") and user.role != "ADMIN":
        raise HTTPException(403, "You need manage_permissions capability")

    # Resolve target user by email
    target_result = await db.execute(
        select(User).where(User.email == body.user_email)
    )
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, f"No user found with email {body.user_email!r}")

    # Check not already granted
    exists = await db.execute(
        select(EventPermission).where(
            EventPermission.event_type == event_type.upper(),
            EventPermission.event_id  == event_id,
            EventPermission.user_id   == target.id,
        )
    )
    if exists.scalar_one_or_none():
        raise HTTPException(400, "User already has access to this event")

    perm = EventPermission(
        event_type=event_type.upper(),
        event_id=event_id,
        user_id=target.id,
        role=body.role,
        invited_by_id=user.id,
        invite_token=secrets.token_urlsafe(32),
        can_upload=body.can_upload,
        can_edit=body.can_edit,
        can_delete=body.can_delete,
        can_download=body.can_download,
        can_approve=body.can_approve,
        can_publish=body.can_publish,
        can_share=body.can_share,
        can_manage_permissions=body.can_manage_permissions,
    )
    db.add(perm)
    await db.commit()
    await db.refresh(perm)
    return perm


# ── Update permission ─────────────────────────────────────────────────────────

@router.patch("/{event_type}/{event_id}/{perm_id}/", response_model=PermissionRead)
async def update_permission(
    event_type: str,
    event_id: int,
    perm_id: int,
    body: UpdatePermissionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_event_type(event_type)
    requester = await _get_requester_perm(event_type, event_id, user, db)
    if not requester.effective("can_manage_permissions") and user.role != "ADMIN":
        raise HTTPException(403, "You need manage_permissions capability")

    result = await db.execute(select(EventPermission).where(EventPermission.id == perm_id))
    perm = result.scalar_one_or_none()
    if not perm or perm.event_id != event_id:
        raise HTTPException(404, "Permission not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(perm, field, value)
    await db.commit()
    await db.refresh(perm)
    return perm


# ── Revoke access ─────────────────────────────────────────────────────────────

@router.delete("/{event_type}/{event_id}/{perm_id}/", status_code=204)
async def revoke_permission(
    event_type: str,
    event_id: int,
    perm_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_event_type(event_type)
    requester = await _get_requester_perm(event_type, event_id, user, db)
    if not requester.effective("can_manage_permissions") and user.role != "ADMIN":
        raise HTTPException(403, "You need manage_permissions capability")

    result = await db.execute(select(EventPermission).where(EventPermission.id == perm_id))
    perm = result.scalar_one_or_none()
    if not perm or perm.event_id != event_id:
        raise HTTPException(404, "Permission not found")
    if perm.role == EventRole.OWNER:
        raise HTTPException(400, "Cannot revoke the event owner")

    await db.delete(perm)
    await db.commit()


# ── My events ─────────────────────────────────────────────────────────────────

@router.get("/me/", response_model=List[PermissionRead])
async def my_permissions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EventPermission).where(EventPermission.user_id == user.id)
        .order_by(EventPermission.created_at.desc())
    )
    return result.scalars().all()


# ── Accept invite token ───────────────────────────────────────────────────────

@router.post("/accept/{token}/", response_model=PermissionRead)
async def accept_invite(
    token: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EventPermission).where(EventPermission.invite_token == token)
    )
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(404, "Invalid or expired invite token")
    if perm.user_id != user.id:
        raise HTTPException(403, "This invite was sent to a different account")
    if perm.accepted_at:
        return perm   # already accepted — idempotent

    perm.accepted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(perm)
    return perm
