"""
Planazo FastAPI application.
Replaces the entire Django backend/ monolith.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import sentry_sdk

from app.core.config import settings
from app.database.base import engine
from app.routers.auth import router as auth_router
from app.routers.invitations import router as invitations_router
from app.routers.vendors import router as vendors_router
from app.routers.gallery import router as gallery_router
from app.routers.payment import router as payment_router
from app.routers.gifts import router as gifts_router
from app.routers.birthday import router as birthday_router
# Phase 1 — new routers
from app.routers.permissions import router as permissions_router
from app.routers.storage import router as storage_router
from app.routers.gallery_v2 import router as gallery_v2_router
from app.routers.photographer import router as photographer_router
# Seller dashboard + payment webhooks
from app.routers.gifts_seller import router as gifts_seller_router
from app.routers.razorpay_webhook import router as razorpay_webhook_router
from app.admin.main import admin, vendor_admin, gift_admin
from app.admin.views import register_views


# ── Sentry ────────────────────────────────────────────────────────────────────

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=settings.ENVIRONMENT,
    )


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup checks
    import redis.asyncio as aioredis
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
    except Exception as exc:
        import logging
        logging.getLogger("planazo").warning(f"Redis not reachable at startup: {exc}")

    yield

    # Shutdown
    await engine.dispose()


# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="Planazo API",
        version="2.0.0",
        description="Wedding, Vendor, Gift and Birthday platform — FastAPI edition",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        openapi_url="/api/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Middleware ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Session middleware is needed for SQLAdmin auth
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.SECRET_KEY,
        session_cookie="planazo_session",
        https_only=not settings.DEBUG,
        same_site="lax",
    )

    # ── Routers ────────────────────────────────────────────────────────────────
    for router in [
        auth_router,
        invitations_router,
        vendors_router,
        gallery_router,
        payment_router,
        gifts_router,
        birthday_router,
        # Phase 1
        permissions_router,
        storage_router,
        gallery_v2_router,
        photographer_router,
        # Seller + webhooks
        gifts_seller_router,
        razorpay_webhook_router,
    ]:
        app.include_router(router)

    # ── Admin panels ───────────────────────────────────────────────────────────
    register_views(admin, vendor_admin, gift_admin)
    admin.mount_to(app)           # /admin
    vendor_admin.mount_to(app)    # /vendor-admin
    gift_admin.mount_to(app)      # /gift-admin

    # ── Static / media ─────────────────────────────────────────────────────────
    media_root = settings.MEDIA_ROOT
    os.makedirs(media_root, exist_ok=True)
    app.mount("/media", StaticFiles(directory=media_root), name="media")

    # ── Prometheus ─────────────────────────────────────────────────────────────
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    # ── Health check ───────────────────────────────────────────────────────────
    @app.get("/health", tags=["ops"])
    async def health():
        return {"status": "ok", "version": app.version}

    return app


app = create_app()
