"""
Image processing tasks — thumbnail generation, face embedding.
"""
import os
import json

from app.workers.celery_app import celery_app
from app.core.config import settings


@celery_app.task(bind=True, max_retries=2)
def generate_thumbnails_task(self, image_id: int, rel_path: str):
    """Generate thumb_small and thumb_medium for a GalleryImage."""
    try:
        from PIL import Image as PILImage
        import asyncio
        from sqlalchemy import select
        from sqlalchemy.orm import Session
        from sqlalchemy import create_engine

        sync_engine = create_engine(settings.sync_database_url)
        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)

        with PILImage.open(abs_path) as img:
            img = img.convert("RGB")
            base, ext = os.path.splitext(rel_path)

            # small: 200px wide
            small = img.copy()
            small.thumbnail((200, 200))
            small_path = f"{base}_small{ext}"
            small.save(os.path.join(settings.MEDIA_ROOT, small_path))

            # medium: 600px wide
            medium = img.copy()
            medium.thumbnail((600, 600))
            medium_path = f"{base}_medium{ext}"
            medium.save(os.path.join(settings.MEDIA_ROOT, medium_path))

        with Session(sync_engine) as session:
            from app.models.gallery import GalleryImage
            img_record = session.get(GalleryImage, image_id)
            if img_record:
                img_record.thumb_small = small_path
                img_record.thumb_medium = medium_path
                session.commit()

    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2)
def compute_face_embedding_task(self, image_id: int, rel_path: str):
    """Compute InsightFace embedding and store on GalleryImage."""
    try:
        import cv2
        import insightface
        from sqlalchemy import create_engine
        from sqlalchemy.orm import Session

        abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
        app_face = insightface.app.FaceAnalysis(
            name="buffalo_l", providers=["CPUExecutionProvider"]
        )
        app_face.prepare(ctx_id=0, det_size=(640, 640))

        img = cv2.imread(abs_path)
        if img is None:
            return

        faces = app_face.get(img)
        if not faces:
            return

        embedding = faces[0].normed_embedding.tolist()

        sync_engine = create_engine(settings.sync_database_url)
        with Session(sync_engine) as session:
            from app.models.gallery import GalleryImage
            img_record = session.get(GalleryImage, image_id)
            if img_record:
                img_record.face_embedding = embedding
                session.commit()

    except Exception as exc:
        raise self.retry(exc=exc)
