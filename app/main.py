"""
Planazo FastAPI application.
Replaces the entire Django backend/ monolith.
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import sentry_sdk

from app.core.config import settings
from app.core.rate_limit import limiter
from app.database.base import engine


# ── Structured logging ────────────────────────────────────────────────────────
# Nothing else in the app called logging.basicConfig(), so every
# logging.getLogger(__name__) call (auth, webhooks, Celery tasks, the new
# Planning Suite notification/queue warnings, etc.) was silently going
# nowhere below WARNING. One line, applied once, at import time.
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("planazo").setLevel(logging.INFO)
from app.routers.auth import router as auth_router
from app.routers.invitations import router as invitations_router
from app.routers.vendors import router as vendors_router
from app.routers.gallery import router as gallery_router
from app.routers.payment import router as payment_router
from app.routers.gifts import router as gifts_router
from app.routers.birthday import router as birthday_router
from app.routers.custom_events import router as custom_events_router
from app.routers.planning import router as planning_router
# Phase 1 — new routers
from app.routers.permissions import router as permissions_router
from app.routers.storage import router as storage_router
from app.routers.gallery_v2 import router as gallery_v2_router
from app.routers.photographer import router as photographer_router
# Seller dashboard + payment webhooks
from app.routers.gifts_seller import router as gifts_seller_router
from app.routers.razorpay_webhook import router as razorpay_webhook_router
from app.admin.main import create_admin_instances
from app.admin.views import register_views
from app.middleware.error_handling import register_error_handlers


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
    # Create all tables on first boot (idempotent — skips existing tables)
    import app.models  # noqa: F401 — register all models onto Base.metadata
    from app.database.base import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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

    # ── Rate limiting ──────────────────────────────────────────────────────────
    # Per-endpoint limits are declared where they matter (auth.py — login,
    # register, OTP, password reset) via @limiter.limit(...); this just wires
    # the shared Limiter instance into the app.
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

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
        custom_events_router,
        planning_router,
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

    # ── Consistent error responses ────────────────────────────────────────────
    register_error_handlers(app)

    # ── Admin panels ───────────────────────────────────────────────────────────
    admin, vendor_admin, gift_admin = create_admin_instances(app)
    register_views(admin, vendor_admin, gift_admin)

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
