"""
Storage service — abstracts local disk vs S3/Cloudflare R2.

Usage:
    from services.storage import storage

    # Upload raw bytes/file-like object
    cdn_url, storage_key = await storage.upload(file_bytes, "gallery/abc.jpg", content_type="image/jpeg")

    # Generate presigned URL for direct browser → S3 upload (skips API server)
    presign = await storage.presign_put("gallery/abc.jpg", content_type="image/jpeg")

    # Delete
    await storage.delete("gallery/abc.jpg")
"""
import os
import uuid
import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple

import boto3
from botocore.exceptions import ClientError
from PIL import Image as PILImage

from app.core.config import settings


class StorageService:
    def __init__(self):
        self._s3 = None

    # ── S3 client (lazy, thread-safe enough for async context) ────────────────
    def _client(self):
        if self._s3 is None:
            kwargs = dict(
                region_name=settings.S3_REGION,
                aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            )
            if settings.S3_ENDPOINT_URL:
                kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
            self._s3 = boto3.client("s3", **kwargs)
        return self._s3

    # ── Key → public URL ──────────────────────────────────────────────────────
    def cdn_url(self, key: str) -> str:
        if settings.STORAGE_BACKEND == "local":
            return f"{settings.MEDIA_URL}{key}"
        base = settings.S3_CDN_URL.rstrip("/") if settings.S3_CDN_URL else \
               f"https://{settings.S3_BUCKET_NAME}.s3.{settings.S3_REGION}.amazonaws.com"
        return f"{base}/{key}"

    # ── Upload bytes → storage ────────────────────────────────────────────────
    async def upload(
        self,
        data: bytes,
        key: str,
        content_type: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Upload bytes to storage. Returns (public_cdn_url, storage_key).
        """
        if not content_type:
            content_type = mimetypes.guess_type(key)[0] or "application/octet-stream"

        if settings.STORAGE_BACKEND == "s3":
            self._client().put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=key,
                Body=data,
                ContentType=content_type,
                CacheControl="public, max-age=31536000",
            )
        else:
            # Local fallback
            dest = Path(settings.MEDIA_ROOT) / key
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)

        return self.cdn_url(key), key

    # ── Presigned PUT URL for direct browser upload ───────────────────────────
    async def presign_put(
        self,
        key: str,
        content_type: str = "application/octet-stream",
        expiry: Optional[int] = None,
    ) -> dict:
        """
        Returns {"upload_url": ..., "cdn_url": ..., "key": ...}
        Frontend uses upload_url to PUT the file directly to S3/R2.
        """
        if settings.STORAGE_BACKEND != "s3":
            # Local dev: return a fake presign that points to our own upload endpoint
            return {
                "upload_url": f"/api/storage/local-upload/?key={key}",
                "cdn_url": self.cdn_url(key),
                "key": key,
            }

        expiry = expiry or settings.S3_PRESIGN_EXPIRY_SECONDS
        url = self._client().generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expiry,
        )
        return {"upload_url": url, "cdn_url": self.cdn_url(key), "key": key}

    # ── Delete ────────────────────────────────────────────────────────────────
    async def delete(self, key: str) -> None:
        if settings.STORAGE_BACKEND == "s3":
            try:
                self._client().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
            except ClientError:
                pass
        else:
            path = Path(settings.MEDIA_ROOT) / key
            path.unlink(missing_ok=True)

    # ── Thumbnail generation (sync — run in threadpool) ───────────────────────
    def make_thumbnail(self, image_bytes: bytes, size: Tuple[int, int]) -> bytes:
        img = PILImage.open(BytesIO(image_bytes))
        img.thumbnail(size, PILImage.LANCZOS)
        # Convert RGBA → RGB for JPEG output
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        buf = BytesIO()
        img.save(buf, format="WEBP", quality=85, optimize=True)
        return buf.getvalue()

    # ── Key helpers ───────────────────────────────────────────────────────────
    @staticmethod
    def make_key(folder: str, filename: str) -> str:
        """Generate a unique storage key: folder/uuid-filename."""
        ext = Path(filename).suffix.lower()
        return f"{folder}/{uuid.uuid4().hex}{ext}"


storage = StorageService()
