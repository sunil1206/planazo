"""Regression test for the CORS-on-500 bug.

An unhandled (non-HTTPException) exception used to bypass CORSMiddleware
entirely: Starlette pulls any handler registered for the base ``Exception``
class out to its outermost ServerErrorMiddleware (see
Starlette.build_middleware_stack), which sits *outside* CORSMiddleware and
sends its response straight through the raw ASGI ``send`` callable — never
through CORSMiddleware's own header-injection. Browsers then report this to
JS as a plain CORS failure / "Network Error", hiding the real 500 and its
message completely. This is exactly what made a real backend bug in
GET /api/invitations/websites/{slug}/ look like "the Edit button does
nothing" from the frontend.

register_error_handlers() now manually attaches the same
Access-Control-Allow-Origin header CORSMiddleware would have added, read
from settings.cors_origins. This test builds a tiny app (mirroring
app/main.py's real middleware setup) with a route that raises a plain
error, and asserts the response is both a clean 500 *and* carries CORS
headers for a cross-origin request from an allowed origin.

Uses ASGITransport(..., raise_app_exceptions=False): Starlette's
ServerErrorMiddleware always re-raises after sending its response (so
Uvicorn can log it) — the default httpx test transport surfaces that
re-raise as a client-side exception, which would fail this test even
though the response was sent correctly. This is a proper simulation, not
a way of avoiding the risk of the bug.
"""
from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient, ASGITransport

from app.core.config import settings
from app.middleware.error_handling import register_error_handlers

pytestmark = pytest.mark.asyncio

ALLOWED_ORIGIN = settings.cors_origins[0] if settings.cors_origins else "https://www.planazo.in"


def _make_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[ALLOWED_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_error_handlers(app)

    @app.get("/boom")
    async def boom():
        raise AttributeError("simulated unhandled bug")

    @app.get("/fine")
    async def fine():
        return {"ok": True}

    return app


async def test_unhandled_exception_gets_clean_500_with_cors_headers():
    app = _make_app()
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/boom", headers={"Origin": ALLOWED_ORIGIN})

    assert resp.status_code == 500
    body = resp.json()
    assert body["detail"] == "Internal server error"
    assert body["error"] == "internal_error"
    # The actual bug: this header must be present for the browser to let the
    # frontend JS see the response at all, instead of reporting a CORS error.
    assert resp.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN


async def test_unhandled_exception_does_not_leak_internal_details():
    app = _make_app()
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/boom")

    assert resp.status_code == 500
    assert "simulated unhandled bug" not in resp.text
    assert "Traceback" not in resp.text


async def test_unhandled_exception_from_disallowed_origin_gets_no_cors_header():
    """Mirrors CORSMiddleware's own behavior: an Origin that isn't in the
    allowlist never gets Access-Control-Allow-Origin, whether the response
    is a normal one or this fallback 500 path."""
    app = _make_app()
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/boom", headers={"Origin": "https://evil.example.com"})

    assert resp.status_code == 500
    assert "access-control-allow-origin" not in resp.headers


async def test_normal_responses_still_get_cors_headers_via_middleware():
    """Sanity check that the ordinary CORSMiddleware path is untouched."""
    app = _make_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/fine", headers={"Origin": ALLOWED_ORIGIN})

    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN
