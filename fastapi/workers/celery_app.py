import os
from celery import Celery

celery_app = Celery(
    "snapshare",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/1"),
    backend=os.environ.get("REDIS_URL", "redis://redis:6379/0"),
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer    = "json",
    result_serializer  = "json",
    accept_content     = ["json"],
    timezone           = "Asia/Kolkata",
    enable_utc         = True,
)
