import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from routers import images, ai, photobooth

app = FastAPI(
    title="Snapshare FastAPI Service",
    description="Image processing, AI features, and photobooth sync",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Sentry ────────────────────────────────────────────────────────────────────
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1, environment="production")
    app.add_middleware(SentryAsgiMiddleware)

# ── Prometheus metrics ────────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(images.router,     prefix="/api/v1/images",     tags=["Images"])
app.include_router(ai.router,         prefix="/api/v1/ai",         tags=["AI"])
app.include_router(photobooth.router, prefix="/api/v1/photobooth", tags=["Photobooth"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "snapshare-fastapi"}
