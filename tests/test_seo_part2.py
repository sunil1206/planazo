"""Tests for the Part 2 SEO additions: Core Web Vitals (PageSpeed Insights),
Blog admin CRUD, and the Google Search Console OAuth plumbing.

pagespeed.fetch_core_web_vitals and search_console's token-exchange/query
calls hit real Google endpoints in production — here they're mocked at the
httpx client boundary so tests run offline and deterministically, but the
parsing/plumbing code itself (the part that could actually have a bug) runs
for real.
"""
from __future__ import annotations
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport, Response as HttpxResponse

from app.seo.models import SeoSearchConsoleToken
from app.seo.router import router as seo_router
from app.seo import pagespeed
from app.seo import search_console as gsc
from app.database.base import get_db

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def seo_admin_client(db_session, make_user):
    test_app = FastAPI()
    test_app.include_router(seo_router)

    async def _override_get_db():
        yield db_session

    test_app.dependency_overrides[get_db] = _override_get_db
    admin = await make_user(email="admin@test.com", role="ADMIN")

    from tests.conftest import auth_headers
    transport = ASGITransport(app=test_app)
    async with AsyncClient(
        transport=transport, base_url="http://test", headers=auth_headers(admin),
    ) as ac:
        yield ac, admin


# ── PageSpeed Insights parsing ───────────────────────────────────────────────

FAKE_PSI_RESPONSE = {
    "lighthouseResult": {
        "categories": {"performance": {"score": 0.92}},
        "audits": {
            "largest-contentful-paint": {"numericValue": 1800.4},
            "cumulative-layout-shift": {"numericValue": 0.03},
            "total-blocking-time": {"numericValue": 120.0},
            "first-contentful-paint": {"numericValue": 900.2},
        },
    }
}


async def test_fetch_core_web_vitals_parses_real_shape():
    mock_resp = HttpxResponse(200, json=FAKE_PSI_RESPONSE)
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
        result = await pagespeed.fetch_core_web_vitals("https://planazo.in/", strategy="mobile")
    assert result["performance_score"] == 92
    assert result["lcp_ms"] == 1800.4
    assert result["cls"] == 0.03


async def test_fetch_core_web_vitals_raises_on_error_status():
    mock_resp = HttpxResponse(400, json={"error": {"message": "Invalid URL"}})
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
        with pytest.raises(pagespeed.PageSpeedError):
            await pagespeed.fetch_core_web_vitals("not-a-url")


async def test_performance_check_endpoint_stores_snapshot(seo_admin_client):
    client, _ = seo_admin_client
    mock_resp = HttpxResponse(200, json=FAKE_PSI_RESPONSE)
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_resp)):
        resp = await client.post("/api/seo/admin/performance/check", json={"path": "/", "strategy": "mobile"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["performance_score"] == 92
    assert body["path"] == "/"

    listing = await client.get("/api/seo/admin/performance")
    assert listing.status_code == 200
    assert len(listing.json()) == 1


# ── Blog admin CRUD ───────────────────────────────────────────────────────────

async def test_blog_crud_via_admin_api(seo_admin_client):
    client, _ = seo_admin_client

    create = await client.post("/api/seo/admin/blog", json={
        "slug": "hello-world", "title": "Hello World", "excerpt": "First post",
        "content": "<p>Hi</p>", "status": "published",
    })
    assert create.status_code == 201
    post_id = create.json()["id"]
    assert create.json()["published_at"] is not None  # auto-set on publish

    update = await client.put(f"/api/seo/admin/blog/{post_id}", json={"title": "Hello World Updated"})
    assert update.status_code == 200
    assert update.json()["title"] == "Hello World Updated"

    listing = await client.get("/api/seo/admin/blog")
    assert len(listing.json()) == 1

    delete = await client.delete(f"/api/seo/admin/blog/{post_id}")
    assert delete.status_code == 204


async def test_blog_create_rejects_duplicate_slug(seo_admin_client):
    client, _ = seo_admin_client
    body = {"slug": "dupe", "title": "First", "status": "draft"}
    first = await client.post("/api/seo/admin/blog", json=body)
    assert first.status_code == 201
    second = await client.post("/api/seo/admin/blog", json={**body, "title": "Second"})
    assert second.status_code == 400


# ── Google Search Console OAuth plumbing ────────────────────────────────────────

def test_build_authorization_url_contains_required_params():
    url = gsc.build_authorization_url(state="fake-state-token")
    assert "accounts.google.com" in url
    assert "state=fake-state-token" in url
    assert "webmasters.readonly" in url
    assert "access_type=offline" in url


async def test_gsc_status_reports_disconnected_by_default(seo_admin_client):
    client, _ = seo_admin_client
    resp = await client.get("/api/seo/admin/gsc/status")
    assert resp.status_code == 200
    assert resp.json()["connected"] is False


async def test_gsc_status_reports_connected_after_token_stored(seo_admin_client, db_session):
    client, _ = seo_admin_client
    db_session.add(SeoSearchConsoleToken(
        site_url="https://planazo.in/", refresh_token="fake-refresh-token", connected_by="admin@test.com",
    ))
    await db_session.commit()

    resp = await client.get("/api/seo/admin/gsc/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["connected"] is True
    assert body["site_url"] == "https://planazo.in/"


async def test_gsc_report_without_connection_returns_409(seo_admin_client):
    client, _ = seo_admin_client
    resp = await client.get("/api/seo/admin/gsc/report", params={"start_date": "2026-07-01", "end_date": "2026-07-30"})
    assert resp.status_code == 409


async def test_gsc_connect_requires_admin(db_session, make_user):
    test_app = FastAPI()
    test_app.include_router(seo_router)

    async def _override_get_db():
        yield db_session

    test_app.dependency_overrides[get_db] = _override_get_db
    regular_user = await make_user(email="not-admin@test.com", role="USER")

    from tests.conftest import auth_headers
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test", headers=auth_headers(regular_user)) as ac:
        resp = await ac.get("/api/seo/admin/gsc/connect")
    assert resp.status_code == 403
