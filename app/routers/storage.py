"""
Storage router — presigned upload URLs + local-dev fallback.

Endpoints:
  POST /api/storage/presign/         — get presigned S3/R2 PUT URL
  POST /api/storage/local-upload/    — local-dev only: accept the actual file
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.gallery_v2 import PresignedUploadRequest, PresignedUploadResponse
from services.storage import storage

router = APIRouter(prefix="/api/storage", tags=["storage"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_FILE_SIZE_MB = 200


@router.post("/presign/", response_model=PresignedUploadResponse)
async def get_presigned_url(
    body: PresignedUploadRequest,
    user: User = Depends(get_current_user),
):
    """
    Returns a presigned PUT URL so the browser can upload directly to S3/R2.
    No file bytes flow through this API server.
    """
    if body.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type {body.content_type!r} not allowed")

    folder = body.folder.strip("/") or "gallery"
    key = storage.make_key(f"{folder}/{user.id}", body.filename)
    result = await storage.presign_put(key, content_type=body.content_type)
    return result


@router.post("/local-upload/")
async def local_upload(
    key: str = Query(..., description="Storage key from presign response"),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """
    Local-dev fallback: receives the actual file and saves to MEDIA_ROOT.
    In production (STORAGE_BACKEND=s3) this endpoint is unused.
    """
    if settings.STORAGE_BACKEND == "s3":
        raise HTTPException(400, "Direct upload not available in S3 mode — use presigned URL")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type {file.content_type!r} not allowed")

    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(413, f"File too large ({size_mb:.1f} MB > {MAX_FILE_SIZE_MB} MB)")

    cdn_url, stored_key = await storage.upload(data, key, content_type=file.content_type)
    return {"cdn_url": cdn_url, "key": stored_key, "size_mb": round(size_mb, 2)}
