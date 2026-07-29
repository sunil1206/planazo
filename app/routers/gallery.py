"""
Gallery router — mirrors backend/apps/gallery/views.py + fastapi/routers/ai.py.

Endpoints:
  GET  /api/gallery/categories/
  GET  /api/gallery/{gallery_token}/images/
  POST /api/gallery/{gallery_token}/upload/
  DELETE /api/gallery/images/{id}/
  POST /api/gallery/selfie-match/
  GET  /api/gallery/selfie-match/{id}/
"""
import logging
import os
import secrets
import json
import uuid
from typing import List, Optional

import aiofiles
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.base import get_db
from app.models.invitation import CoupleWebsite
from app.models.gallery import GalleryCategory, GalleryImage, GuestSelfieMatch
from app.models.user import User
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.config import settings
from app.schemas.gallery import (
    GalleryCategoryRead, GalleryImageRead, GalleryImageUpload,
    SelfieMatchRead,
)

router = APIRouter(prefix="/api/gallery", tags=["gallery"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
COSINE_THRESHOLD = 0.40


# ── Helpers ───────────────────────────────────────────────────────────────────

async def save_upload(upload: UploadFile, subfolder: str) -> str:
    """Save uploaded file to MEDIA_ROOT and return relative path."""
    ext = os.path.splitext(upload.filename or "img.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    rel_path = os.path.join(subfolder, filename)
    abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    async with aiofiles.open(abs_path, "wb") as f:
        content = await upload.read()
        await f.write(content)
    return rel_path


def cosine_similarity(a: list, b: list) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories/", response_model=List[GalleryCategoryRead])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GalleryCategory))
    return result.scalars().all()


# ── Images for a wedding website (via gallery_token) ─────────────────────────

@router.get("/{gallery_token}/images/", response_model=List[GalleryImageRead])
async def list_gallery_images(
    gallery_token: str,
    gallery_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CoupleWebsite).where(CoupleWebsite.gallery_token == gallery_token)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "Gallery not found")

    q = select(GalleryImage).where(GalleryImage.website_id == website.id)
    if gallery_type:
        q = q.where(GalleryImage.gallery_type == gallery_type.upper())
    result2 = await db.execute(q)
    return result2.scalars().all()


@router.post("/{gallery_token}/upload/", response_model=GalleryImageRead, status_code=201)
async def upload_gallery_image(
    gallery_token: str,
    file: UploadFile = File(...),
    title: str = Form(""),
    gallery_type: str = Form("INVITATION"),
    category_id: Optional[int] = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Unsupported image type")

    result = await db.execute(
        select(CoupleWebsite).where(CoupleWebsite.gallery_token == gallery_token)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "Gallery not found")
    if website.account_id != user.id and not user.is_staff:
        raise HTTPException(403, "Not authorized")

    rel_path = await save_upload(file, f"gallery/{gallery_token}")
    slug = secrets.token_urlsafe(12)

    image = GalleryImage(
        website_id=website.id,
        gallery_type=gallery_type.upper(),
        title=title,
        picture=rel_path,
        slug=slug,
        uploaded_by_id=user.id,
        category_id=category_id,
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)

    try:
        from app.workers.tasks.image_tasks import generate_thumbnails_task, compute_face_embedding_task
        generate_thumbnails_task.delay(image_id=image.id, rel_path=rel_path)
        compute_face_embedding_task.delay(image_id=image.id, rel_path=rel_path)
    except Exception:
        # Thumbnails/face-embedding are best-effort background enrichment —
        # a Celery/Redis hiccup should never fail the upload itself.
        logging.getLogger("planazo").warning(
            "Could not queue thumbnail/face-embedding tasks for image %s", image.id, exc_info=True
        )

    return image


@router.delete("/images/{image_id}/", status_code=204)
async def delete_gallery_image(
    image_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GalleryImage).where(GalleryImage.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(404, "Image not found")
    if image.uploaded_by_id != user.id and not user.is_staff:
        raise HTTPException(403, "Not authorized")
    # Optionally delete file from disk
    try:
        abs_path = os.path.join(settings.MEDIA_ROOT, image.picture)
        if os.path.exists(abs_path):
            os.remove(abs_path)
    except OSError:
        pass
    await db.delete(image)
    await db.commit()


# ── Selfie face-match ─────────────────────────────────────────────────────────

@router.post("/selfie-match/", response_model=SelfieMatchRead, status_code=201)
async def selfie_match(
    gallery_token: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a guest selfie and find matching gallery images via face embeddings.
    Mirrors fastapi/routers/ai.py selfie-match logic using async SQLAlchemy.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Unsupported image type")

    result = await db.execute(
        select(CoupleWebsite).where(CoupleWebsite.gallery_token == gallery_token)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "Gallery not found")

    # Save selfie
    selfie_path = await save_upload(file, "selfies")

    selfie_record = GuestSelfieMatch(
        website_id=website.id,
        selfie=selfie_path,
        status="PROCESSING",
    )
    db.add(selfie_record)
    await db.commit()
    await db.refresh(selfie_record)

    # Run face embedding in a threadpool to avoid blocking the event loop
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    def _embed(path: str):
        try:
            import insightface
            import cv2
            app_face = insightface.app.FaceAnalysis(
                name="buffalo_l", providers=["CPUExecutionProvider"]
            )
            app_face.prepare(ctx_id=0, det_size=(640, 640))
            img = cv2.imread(path)
            if img is None:
                return None, "Could not read image"
            faces = app_face.get(img)
            if not faces:
                return None, "No face detected"
            embedding = faces[0].normed_embedding.tolist()
            return embedding, ""
        except Exception as exc:
            return None, str(exc)

    abs_selfie = os.path.join(settings.MEDIA_ROOT, selfie_path)
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as pool:
        selfie_emb, err = await loop.run_in_executor(pool, _embed, abs_selfie)

    if selfie_emb is None:
        selfie_record.status = "FAILED"
        selfie_record.error = err
        await db.commit()
        await db.refresh(selfie_record)
        return selfie_record

    selfie_record.selfie_embedding = selfie_emb

    # Fetch all gallery images with embeddings for this website
    result2 = await db.execute(
        select(GalleryImage).where(
            GalleryImage.website_id == website.id,
            GalleryImage.face_embedding.isnot(None),
        )
    )
    gallery_images = result2.scalars().all()

    matched = []
    for img in gallery_images:
        emb = img.face_embedding
        if isinstance(emb, str):
            try:
                emb = json.loads(emb)
            except Exception:
                continue
        if not emb:
            continue
        sim = cosine_similarity(selfie_emb, emb)
        if sim >= COSINE_THRESHOLD:
            matched.append(img)

    selfie_record.matched_images = matched
    selfie_record.status = "DONE"
    await db.commit()

    result3 = await db.execute(
        select(GuestSelfieMatch)
        .where(GuestSelfieMatch.id == selfie_record.id)
        .options(selectinload(GuestSelfieMatch.matched_images))
    )
    return result3.scalar_one()


@router.get("/selfie-match/{match_id}/", response_model=SelfieMatchRead)
async def get_selfie_match(match_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GuestSelfieMatch)
        .where(GuestSelfieMatch.id == match_id)
        .options(selectinload(GuestSelfieMatch.matched_images))
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")
    return match
