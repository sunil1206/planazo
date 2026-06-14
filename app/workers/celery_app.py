"""
Celery application — identical broker/backend config as Django backend.
Framework-agnostic: all Celery config lived in settings.py, not in Django internals.
"""
import os
from celery import Celery

# Allow tasks to import app.core.config without a running FastAPI app
os.environ.setdefault("APP_ENV", "production")

from app.core.config import settings

celery_app = Celery(
    "planazo",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks.email_tasks",
        "app.workers.tasks.image_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)
