"""Image utility helpers used by upload endpoints."""
import os
import uuid
import aiofiles
from fastapi import UploadFile

from app.core.config import settings

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 20


async def save_upload(file: UploadFile, subfolder: str) -> str:
    """Validate and save an uploaded image, return the relative media path."""
    if file.content_type not in ALLOWED_TYPES:
        from fastapi import HTTPException
        raise HTTPException(400, f"Unsupported type: {file.content_type}")

    ext = os.path.splitext(file.filename or "img.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    rel_path = os.path.join(subfolder, filename)
    abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)

    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        from fastapi import HTTPException
        raise HTTPException(400, f"File exceeds {MAX_SIZE_MB}MB limit")

    async with aiofiles.open(abs_path, "wb") as f:
        await f.write(content)

    return rel_path


def media_url(rel_path: str) -> str:
    """Convert a relative media path to a public URL."""
    return f"{settings.MEDIA_URL.rstrip('/')}/{rel_path.lstrip('/')}"
