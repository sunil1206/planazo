"""Tests for app/ssr/ — the server-rendered vendor SEO landing pages.

Builds a minimal FastAPI app with just ssr_router (same lightweight pattern
as conftest.py's make_test_app — no auth, no storage/services imports, so
this doesn't need boto3/insightface/etc. installed) sharing the same
db_session fixture, so real rows created here are what the routes render.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from app.models.vendor import VendorCategory, VendorWebsite, VendorReview
from app.ssr.router import router as ssr_router
from app.ssr import queries as q
from app.seo.generator import build_vendor_meta
from app.seo.slugs import slugify

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def ssr_client(db_session):
    test_app = FastAPI()
    test_app.include_router(ssr_router)

    from app.database.base import get_db

    async def _override_get_db():
        yield db_session

    test_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _make_category(db_session, key="wedding_planner", name="Wedding Planners", url_slug="wedding-planners"):
    cat = VendorCategory(key=key, name=name, url_slug=url_slug, is_active=True)
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)
    return cat


async def _make_vendor_row(db_session, owner, category_key, city, title, **kwargs):
    v = VendorWebsite(
        account_id=owner.id, category=category_key, city=city, title=title,
        slug=slugify(title), is_active=True, is_verified=True, **kwargs,
    )
    db_session.add(v)
    await db_session.commit()
    await db_session.refresh(v)
    return v


# ── Category index ───────────────────────────────────────────────────────────

async def test_category_index_lists_real_cities(ssr_client, db_session, make_user):
    cat = await _make_category(db_session)
    owner1 = await make_user(email="v1@test.com")
    owner2 = await make_user(email="v2@test.com")
    await _make_vendor_row(db_session, owner1, cat.key, "Paris", "Dream Events")
    await _make_vendor_row(db_session, owner2, cat.key, "London", "Royal Weddings")

    resp = await ssr_client.get(f"/vendors/{cat.url_slug}")
    assert resp.status_code == 200
    assert "Paris" in resp.text
    assert "London" in resp.text
    assert 'application/ld+json' in resp.text


async def test_category_index_404_for_unknown_slug(ssr_client, db_session):
    resp = await ssr_client.get("/vendors/does-not-exist")
    assert resp.status_code == 404


# ── Listing ───────────────────────────────────────────────────────────────────

async def test_listing_shows_verified_vendors_only(ssr_client, db_session, make_user):
    cat = await _make_category(db_session)
    owner1 = await make_user(email="v3@test.com")
    owner2 = await make_user(email="v4@test.com")
    await _make_vendor_row(db_session, owner1, cat.key, "Paris", "Dream Events", tagline="Luxury weddings")
    unverified = await _make_vendor_row(db_session, owner2, cat.key, "Paris", "Sketchy Events")
    unverified.is_verified = False
    await db_session.commit()

    resp = await ssr_client.get(f"/vendors/{cat.url_slug}/paris")
    assert resp.status_code == 200
    assert "Dream Events" in resp.text
    assert "Sketchy Events" not in resp.text
    assert "ItemList" in resp.text
    assert "FAQPage" in resp.text


async def test_listing_empty_city_still_renders(ssr_client, db_session):
    cat = await _make_category(db_session)
    resp = await ssr_client.get(f"/vendors/{cat.url_slug}/nowhere")
    assert resp.status_code == 200
    assert "no verified" in resp.text.lower()


# ── Detail ────────────────────────────────────────────────────────────────────

async def test_detail_page_renders_vendor_and_schema(ssr_client, db_session, make_user):
    cat = await _make_category(db_session, key="photographer", name="Photographers", url_slug="photographers")
    owner = await make_user(email="v5@test.com")
    vendor = await _make_vendor_row(
        db_session, owner, cat.key, "Mumbai", "Great Shots",
        bio="We shoot beautiful weddings.", phone="9999999999", email="hi@greatshots.com",
    )
    db_session.add(VendorReview(vendor_id=vendor.id, rating=5, comment="Amazing!", is_approved=True))
    await db_session.commit()

    resp = await ssr_client.get(f"/vendors/{cat.url_slug}/mumbai/{vendor.slug}")
    assert resp.status_code == 200
    assert "Great Shots" in resp.text
    assert "Amazing!" in resp.text
    assert "tel:9999999999" in resp.text
    assert "mailto:hi@greatshots.com" in resp.text
    assert "LocalBusiness" in resp.text
    assert "aggregateRating" in resp.text


async def test_detail_page_404_for_unknown_vendor(ssr_client, db_session):
    cat = await _make_category(db_session)
    resp = await ssr_client.get(f"/vendors/{cat.url_slug}/paris/does-not-exist")
    assert resp.status_code == 404


# ── Meta generation path scheme ──────────────────────────────────────────────

async def test_build_vendor_meta_uses_new_ssr_path(db_session, make_user):
    cat = await _make_category(db_session, key="venue", name="Venues", url_slug="venues")
    owner = await make_user(email="v6@test.com")
    vendor = await _make_vendor_row(db_session, owner, cat.key, "Delhi", "Grand Hall")

    seo = await build_vendor_meta(db_session, vendor)
    assert f"/vendors/venues/delhi/{vendor.slug}" in seo.canonical_url


# ── Query helpers ─────────────────────────────────────────────────────────────

async def test_get_ratings_for_vendors_aggregates_correctly(db_session, make_user):
    cat = await _make_category(db_session)
    owner = await make_user(email="v7@test.com")
    vendor = await _make_vendor_row(db_session, owner, cat.key, "Pune", "Test Vendor")
    db_session.add_all([
        VendorReview(vendor_id=vendor.id, rating=4, comment="Good", is_approved=True),
        VendorReview(vendor_id=vendor.id, rating=5, comment="Great", is_approved=True),
        VendorReview(vendor_id=vendor.id, rating=1, comment="Unapproved", is_approved=False),
    ])
    await db_session.commit()

    ratings = await q.get_ratings_for_vendors(db_session, [vendor.id])
    assert ratings[vendor.id].average == 4.5
    assert ratings[vendor.id].count == 2


async def test_list_related_cities_excludes_current(db_session, make_user):
    cat = await _make_category(db_session)
    owner1 = await make_user(email="v8@test.com")
    owner2 = await make_user(email="v9@test.com")
    await _make_vendor_row(db_session, owner1, cat.key, "Paris", "A")
    await _make_vendor_row(db_session, owner2, cat.key, "Berlin", "B")

    related = await q.list_related_cities(db_session, cat.key, "paris")
    assert "Berlin" in related
    assert "Paris" not in related
