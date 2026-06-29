"""
Gallery v2 router — albums, AI metadata, likes, comments, approval workflow.

Endpoints:
  GET    /api/gallery/v2/{website_id}/albums/                    — list albums
  POST   /api/gallery/v2/{website_id}/albums/                    — create album
  PATCH  /api/gallery/v2/{website_id}/albums/{album_id}/         — update album
  DELETE /api/gallery/v2/{website_id}/albums/{album_id}/         — delete album
  GET    /api/gallery/v2/{website_id}/images/                    — list images (filterable)
  PATCH  /api/gallery/v2/images/{image_id}/                      — approve/pin/hide/move album
  DELETE /api/gallery/v2/images/{image_id}/                      — delete image + storage key
  POST   /api/gallery/v2/images/{image_id}/like/                 — like an image
  DELETE /api/gallery/v2/images/{image_id}/like/                 — unlike
  GET    /api/gallery/v2/images/{image_id}/comments/             — list comments
  POST   /api/gallery/v2/images/{image_id}/comments/             — add comment
  DELETE /api/gallery/v2/images/{image_id}/comments/{comment_id}/ — delete comment
  GET    /api/gallery/v2/{website_id}/pending/                   — images awaiting approval
  POST   /api/gallery/v2/{website_id}/bulk-approve/              — approve multiple at once
"""
import hashlib
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.gallery import GalleryAlbum, GalleryImage, GalleryMediaLike, GalleryMediaComment
from app.schemas.gallery_v2 import (
    GalleryAlbumCreate, GalleryAlbumUpdate, GalleryAlbumRead,
    GalleryImageV2Read, GalleryImageApprovalUpdate,
    LikeCreate, LikeRead, CommentCreate, CommentRead,
)
from services.storage import storage

router = APIRouter(prefix="/api/gallery/v2", tags=["gallery-v2"])


# ── Albums ────────────────────────────────────────────────────────────────────

@router.get("/{website_id}/albums/", response_model=List[GalleryAlbumRead])
async def list_albums(
    website_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    q = select(GalleryAlbum).where(GalleryAlbum.website_id == website_id)
    if not user:
        q = q.where(GalleryAlbum.privacy == "PUBLIC", GalleryAlbum.is_published == True)
    result = await db.execute(q.order_by(GalleryAlbum.order))
    return result.scalars().all()


@router.post("/{website_id}/albums/", response_model=GalleryAlbumRead, status_code=201)
async def create_album(
    website_id: int,
    body: GalleryAlbumCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    album = GalleryAlbum(**body.model_dump(), website_id=website_id, created_by_id=user.id)
    db.add(album)
    await db.commit()
    await db.refresh(album)
    return album


@router.patch("/{website_id}/albums/{album_id}/", response_model=GalleryAlbumRead)
async def update_album(
    website_id: int,
    album_id: int,
    body: GalleryAlbumUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GalleryAlbum).where(GalleryAlbum.id == album_id, GalleryAlbum.website_id == website_id)
    )
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(404, "Album not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(album, k, v)
    await db.commit()
    await db.refresh(album)
    return album


@router.delete("/{website_id}/albums/{album_id}/", status_code=204)
async def delete_album(
    website_id: int,
    album_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GalleryAlbum).where(GalleryAlbum.id == album_id, GalleryAlbum.website_id == website_id)
    )
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(404, "Album not found")
    await db.delete(album)
    await db.commit()


# ── Images (v2 list with filters) ─────────────────────────────────────────────

@router.get("/{website_id}/images/", response_model=List[GalleryImageV2Read])
async def list_images_v2(
    website_id: int,
    album_id:   Optional[int]  = Query(None),
    media_type: Optional[str]  = Query(None),     # IMAGE / VIDEO
    ai_scene:   Optional[str]  = Query(None),
    is_featured:Optional[bool] = Query(None),
    is_highlighted: Optional[bool] = Query(None),
    page:       int = Query(1, ge=1),
    page_size:  int = Query(40, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    q = (
        select(GalleryImage)
        .where(
            GalleryImage.website_id == website_id,
            GalleryImage.is_hidden  == False,
        )
    )
    if not user:
        q = q.where(GalleryImage.is_approved == True, GalleryImage.privacy == "PUBLIC")

    if album_id    is not None: q = q.where(GalleryImage.album_id    == album_id)
    if media_type  is not None: q = q.where(GalleryImage.media_type  == media_type)
    if ai_scene    is not None: q = q.where(GalleryImage.ai_scene    == ai_scene)
    if is_featured is not None: q = q.where(GalleryImage.is_featured == is_featured)
    if is_highlighted is not None: q = q.where(GalleryImage.is_highlighted == is_highlighted)

    q = q.order_by(GalleryImage.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()


# ── Image approval / metadata update ─────────────────────────────────────────

@router.patch("/images/{image_id}/", response_model=GalleryImageV2Read)
async def update_image(
    image_id: int,
    body: GalleryImageApprovalUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GalleryImage).where(GalleryImage.id == image_id))
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(404, "Image not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(img, k, v)
    await db.commit()
    await db.refresh(img)
    return img


@router.delete("/images/{image_id}/", status_code=204)
async def delete_image(
    image_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GalleryImage).where(GalleryImage.id == image_id))
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(404, "Image not found")
    # Remove from storage
    if img.storage_key:
        await storage.delete(img.storage_key)
    await db.delete(img)
    await db.commit()


# ── Pending approval queue ────────────────────────────────────────────────────

@router.get("/{website_id}/pending/", response_model=List[GalleryImageV2Read])
async def list_pending(
    website_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GalleryImage).where(
            GalleryImage.website_id  == website_id,
            GalleryImage.is_approved == False,
        ).order_by(GalleryImage.created_at)
    )
    return result.scalars().all()


@router.post("/{website_id}/bulk-approve/")
async def bulk_approve(
    website_id: int,
    image_ids: List[int],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(GalleryImage)
        .where(GalleryImage.website_id == website_id, GalleryImage.id.in_(image_ids))
        .values(is_approved=True)
    )
    await db.commit()
    return {"approved": len(image_ids)}


# ── Likes ─────────────────────────────────────────────────────────────────────

@router.post("/images/{image_id}/like/", response_model=LikeRead, status_code=201)
async def like_image(
    image_id: int,
    body: LikeCreate,
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else ""
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]

    # Prevent duplicate likes
    q = select(GalleryMediaLike).where(GalleryMediaLike.image_id == image_id)
    if user:
        q = q.where(GalleryMediaLike.user_id == user.id)
    else:
        q = q.where(GalleryMediaLike.ip_hash == ip_hash)
    existing = (await db.execute(q)).scalar_one_or_none()
    if existing:
        return existing

    like = GalleryMediaLike(
        image_id=image_id,
        user_id=user.id if user else None,
        guest_name=body.guest_name,
        ip_hash=ip_hash,
    )
    db.add(like)
    # Increment counter
    await db.execute(
        update(GalleryImage)
        .where(GalleryImage.id == image_id)
        .values(likes_count=GalleryImage.likes_count + 1)
    )
    await db.commit()
    await db.refresh(like)
    return like


@router.delete("/images/{image_id}/like/", status_code=204)
async def unlike_image(
    image_id: int,
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else ""
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]

    q = select(GalleryMediaLike).where(GalleryMediaLike.image_id == image_id)
    if user:
        q = q.where(GalleryMediaLike.user_id == user.id)
    else:
        q = q.where(GalleryMediaLike.ip_hash == ip_hash)
    like = (await db.execute(q)).scalar_one_or_none()
    if like:
        await db.delete(like)
        await db.execute(
            update(GalleryImage)
            .where(GalleryImage.id == image_id, GalleryImage.likes_count > 0)
            .values(likes_count=GalleryImage.likes_count - 1)
        )
        await db.commit()


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/images/{image_id}/comments/", response_model=List[CommentRead])
async def list_comments(
    image_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GalleryMediaComment)
        .where(GalleryMediaComment.image_id == image_id, GalleryMediaComment.is_approved == True)
        .order_by(GalleryMediaComment.created_at)
    )
    return result.scalars().all()


@router.post("/images/{image_id}/comments/", response_model=CommentRead, status_code=201)
async def add_comment(
    image_id: int,
    body: CommentCreate,
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    comment = GalleryMediaComment(
        image_id=image_id,
        user_id=user.id if user else None,
        guest_name=body.guest_name,
        text=body.text,
    )
    db.add(comment)
    await db.execute(
        update(GalleryImage)
        .where(GalleryImage.id == image_id)
        .values(comments_count=GalleryImage.comments_count + 1)
    )
    await db.commit()
    await db.refresh(comment)
    return comment


@router.delete("/images/{image_id}/comments/{comment_id}/", status_code=204)
async def delete_comment(
    image_id: int,
    comment_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GalleryMediaComment).where(
            GalleryMediaComment.id       == comment_id,
            GalleryMediaComment.image_id == image_id,
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.user_id != user.id and user.role != "ADMIN":
        raise HTTPException(403, "Not your comment")
    await db.delete(comment)
    await db.execute(
        update(GalleryImage)
        .where(GalleryImage.id == image_id, GalleryImage.comments_count > 0)
        .values(comments_count=GalleryImage.comments_count - 1)
    )
    await db.commit()
