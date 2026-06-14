"""
Celery tasks for gallery image processing.

Architecture note
-----------------
InsightFace + ONNX-Runtime are heavy and ONLY installed in the FastAPI
container (`fastapi/requirements.txt`).  This Celery worker container uses
the same `requirements.txt` as Django, which deliberately omits them.  So
we MUST NOT `import insightface` here -- it will silently ImportError.
Instead we call the FastAPI HTTP endpoints:

    POST {FASTAPI}/api/v1/ai/face-embed   -> returns {embedding: [...]}
    POST {FASTAPI}/api/v1/ai/selfie-match -> returns {matched: [...]}

This keeps the heavy ML in one container and keeps Celery + Django light.
"""
import os
import logging
from celery import shared_task
from PIL import Image as PILImage
from django.conf import settings

logger = logging.getLogger(__name__)

# FastAPI service URL inside the docker network.
FASTAPI_URL = os.environ.get("INTERNAL_FAST_URL") or os.environ.get(
    "FASTAPI_URL", "http://fastapi:8001"
)


# ─── Thumbnails (PIL only -- no ML) ─────────────────────────────────────────
@shared_task(bind=True, max_retries=3)
def process_gallery_image(self, image_id):
    """Generate small + medium thumbnails after upload, then queue embedding."""
    from .models import GalleryImage
    try:
        img_obj = GalleryImage.objects.get(pk=image_id)
        original_path = img_obj.picture.path

        for size, field_name, subdir in [
            ((300, 300),  "thumb_small",  "gallery/thumbs/small/"),
            ((800, 800),  "thumb_medium", "gallery/thumbs/medium/"),
        ]:
            pil_img = PILImage.open(original_path)
            pil_img.thumbnail(size, PILImage.LANCZOS)
            if pil_img.mode in ("RGBA", "P"):
                pil_img = pil_img.convert("RGB")

            thumb_dir  = os.path.join(settings.MEDIA_ROOT, subdir)
            os.makedirs(thumb_dir, exist_ok=True)
            filename   = os.path.basename(original_path)
            thumb_path = os.path.join(thumb_dir, filename)
            pil_img.save(thumb_path, "JPEG", quality=82, optimize=True)

            relative = os.path.join(subdir, filename)
            setattr(img_obj, field_name, relative)

        img_obj.save(update_fields=["thumb_small", "thumb_medium"])

        # Queue the embedding generation as a separate task
        generate_face_embedding.delay(image_id)

    except GalleryImage.DoesNotExist:
        pass
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)


# ─── Face embedding (delegates to FastAPI) ──────────────────────────────────
@shared_task(bind=True, max_retries=2)
def generate_face_embedding(self, image_id):
    """
    POST the original image to FastAPI /api/v1/ai/face-embed and persist the
    returned 512-d embedding on the GalleryImage.

    Failure modes (we LOG them so they show up in `docker compose logs celery_worker`):
      - 503 from FastAPI: model still loading / not installed.  Retry.
      - 400 from FastAPI: no face detected (this is a legitimate "no face" image).
      - Any other exception: retry up to 2x then give up silently.
    """
    import requests
    from .models import GalleryImage

    try:
        img_obj = GalleryImage.objects.get(pk=image_id)
    except GalleryImage.DoesNotExist:
        return

    if img_obj.face_embedding:
        return  # already done -- idempotent

    try:
        with open(img_obj.picture.path, "rb") as fh:
            files = {"file": (os.path.basename(img_obj.picture.path), fh, "image/jpeg")}
            resp = requests.post(
                f"{FASTAPI_URL}/api/v1/ai/face-embed",
                files=files,
                timeout=60,
            )
    except requests.RequestException as exc:
        logger.warning("face-embed: HTTP error for image %s: %s", image_id, exc)
        raise self.retry(exc=exc, countdown=60)

    if resp.status_code == 400:
        # No face in the photo -- that's fine, we just don't store an embedding.
        logger.info("face-embed: no face detected in image %s -- skipping", image_id)
        return

    if resp.status_code == 503:
        # Model still loading -- back off and retry.
        logger.info("face-embed: FastAPI 503 (model loading) -- retrying image %s", image_id)
        raise self.retry(exc=Exception("model not ready"), countdown=120)

    if not resp.ok:
        logger.error("face-embed: unexpected %s for image %s: %s",
                     resp.status_code, image_id, resp.text[:200])
        return

    try:
        data = resp.json()
        embedding = data.get("embedding")
        if not embedding:
            logger.error("face-embed: empty embedding for image %s", image_id)
            return
        img_obj.face_embedding = embedding
        img_obj.save(update_fields=["face_embedding"])
        logger.info("face-embed: saved %d-d embedding for image %s",
                    len(embedding), image_id)
    except Exception as exc:
        logger.exception("face-embed: parse failure for image %s: %s", image_id, exc)


# ─── Selfie match (delegates to FastAPI's /selfie-match) ────────────────────
@shared_task(bind=True, max_retries=2)
def run_selfie_match(self, match_id):
    """
    POST the selfie to FastAPI /api/v1/ai/selfie-match (which also queries the
    DB for stored gallery embeddings and returns the matches), then persist
    the matched_images M2M and final status on the GuestSelfieMatch row.
    """
    import requests
    from .models import GuestSelfieMatch, GalleryImage

    try:
        match = GuestSelfieMatch.objects.get(pk=match_id)
    except GuestSelfieMatch.DoesNotExist:
        return

    match.status = GuestSelfieMatch.RUNNING
    match.save(update_fields=["status"])

    try:
        with open(match.selfie.path, "rb") as fh:
            files = {"file": ("selfie.jpg", fh, "image/jpeg")}
            params = {"website_slug": match.website.slug}
            resp = requests.post(
                f"{FASTAPI_URL}/api/v1/ai/selfie-match",
                files=files,
                params=params,
                timeout=90,
            )
    except requests.RequestException as exc:
        match.status = GuestSelfieMatch.FAILED
        match.error  = f"AI service unreachable: {exc}"
        match.save(update_fields=["status", "error"])
        raise self.retry(exc=exc, countdown=60)

    if resp.status_code == 400:
        match.status = GuestSelfieMatch.FAILED
        match.error  = (resp.json().get("detail")
                        if resp.headers.get("content-type", "").startswith("application/json")
                        else "No face detected in selfie.")
        match.save(update_fields=["status", "error"])
        return

    if resp.status_code == 503:
        match.status = GuestSelfieMatch.FAILED
        match.error  = "AI model is loading -- please try again in a minute."
        match.save(update_fields=["status", "error"])
        return

    if not resp.ok:
        match.status = GuestSelfieMatch.FAILED
        match.error  = f"AI service returned {resp.status_code}"
        match.save(update_fields=["status", "error"])
        return

    try:
        data = resp.json()
        matched_ids = [m["id"] for m in data.get("matched", [])]
        match.matched_images.set(GalleryImage.objects.filter(pk__in=matched_ids))
        match.status = GuestSelfieMatch.DONE
        match.save(update_fields=["status"])
        logger.info("selfie-match: %d matches for selfie %s",
                    len(matched_ids), match_id)
    except Exception as exc:
        logger.exception("selfie-match: parse failure for selfie %s: %s", match_id, exc)
        match.status = GuestSelfieMatch.FAILED
        match.error  = "Could not parse AI response."
        match.save(update_fields=["status", "error"])
