"""Tests for app/seo/ — meta generation, overrides, sitemap, robots.txt.

Reuses the db_session/make_wedding/make_birthday/make_vendor fixtures from
conftest.py (in-memory SQLite via StaticPool) rather than hitting a router,
since app/seo/generator.py's build_*_meta() functions are called directly
by app/routers/invitations.py and app/routers/birthday.py, not exposed as
their own endpoint.
"""
from __future__ import annotations

import pytest

from app.seo.models import SeoMetaOverride, SeoRobotsRule
from app.seo.generator import build_wedding_meta, build_birthday_meta, build_vendor_meta
from app.seo.sitemap import collect_sitemap_urls, render_sitemap_xml
from app.seo.robots import build_robots_txt, DEFAULT_DISALLOW


pytestmark = pytest.mark.asyncio


# ── Meta generation ─────────────────────────────────────────────────────────

async def test_wedding_meta_defaults(db_session, make_user, make_wedding):
    owner = await make_user(email="w1@test.com")
    website = await make_wedding(owner, couple="Priya & Arjun")

    seo = await build_wedding_meta(db_session, website)

    assert "Priya & Arjun" in seo.title
    assert seo.canonical_url.endswith(f"/invite/{website.slug}")
    assert seo.robots == "noindex,nofollow"  # is_published defaults False
    assert any(s["@type"] == "Event" for s in seo.json_ld)
    assert any(s["@type"] == "BreadcrumbList" for s in seo.json_ld)


async def test_wedding_meta_published_is_indexable(db_session, make_user, make_wedding):
    owner = await make_user(email="w2@test.com")
    website = await make_wedding(owner, couple="Neha & Raj")
    website.is_published = True
    await db_session.commit()

    seo = await build_wedding_meta(db_session, website)
    assert seo.robots == "index,follow"


async def test_birthday_meta_defaults(db_session, make_user, make_birthday):
    owner = await make_user(email="b1@test.com")
    page = await make_birthday(owner, title="Aarav Turns 5")

    seo = await build_birthday_meta(db_session, page)

    assert "Aarav Turns 5" in seo.title
    assert seo.canonical_url.endswith(f"/birthday/{page.slug}")
    assert seo.robots == "noindex,nofollow"


async def test_vendor_meta_local_business_schema(db_session, make_vendor):
    vendor = await make_vendor(title="Royal Events", city="Paris", category="photographer")

    seo = await build_vendor_meta(db_session, vendor)

    assert "Royal Events" in seo.title
    assert "Paris" in seo.title
    local_business = next(s for s in seo.json_ld if s["@type"] == "LocalBusiness")
    assert local_business["address"]["addressLocality"] == "Paris"


# ── Admin override ──────────────────────────────────────────────────────────

async def test_override_replaces_title_and_robots(db_session, make_user, make_wedding):
    owner = await make_user(email="w3@test.com")
    website = await make_wedding(owner, couple="Override Test")

    db_session.add(SeoMetaOverride(
        path=f"/invite/{website.slug}",
        title="Custom Hand-Written Title | Planazo",
        robots="noindex,nofollow",
    ))
    await db_session.commit()

    seo = await build_wedding_meta(db_session, website)
    assert seo.title == "Custom Hand-Written Title | Planazo"
    assert seo.og_title == "Custom Hand-Written Title | Planazo"
    assert seo.robots == "noindex,nofollow"


# ── Sitemap ─────────────────────────────────────────────────────────────────

async def test_sitemap_includes_only_published(db_session, make_user, make_wedding, make_birthday):
    owner = await make_user(email="s1@test.com")
    published = await make_wedding(owner, couple="Published Couple")
    published.is_published = True
    unpublished = await make_wedding(owner, couple="Draft Couple")
    bday = await make_birthday(owner, title="Published Bday")
    bday.is_published = True
    await db_session.commit()

    urls = await collect_sitemap_urls(db_session)
    locs = [u.loc for u in urls]

    assert any(published.slug in loc for loc in locs)
    assert not any(unpublished.slug in loc for loc in locs)
    assert any(bday.slug in loc for loc in locs)


async def test_sitemap_xml_is_well_formed(db_session, make_user, make_wedding):
    owner = await make_user(email="s2@test.com")
    w = await make_wedding(owner, couple="XML Test")
    w.is_published = True
    await db_session.commit()

    urls = await collect_sitemap_urls(db_session)
    xml_content = render_sitemap_xml(urls)

    assert xml_content.startswith('<?xml version="1.0" encoding="UTF-8"?>')
    assert "<urlset" in xml_content
    assert w.slug in xml_content
    import xml.etree.ElementTree as ET
    ET.fromstring(xml_content)  # raises if malformed


# ── robots.txt ──────────────────────────────────────────────────────────────

async def test_robots_txt_default_fallback(db_session):
    content = await build_robots_txt(db_session)
    assert "User-agent: *" in content
    assert "Allow: /" in content
    for path in DEFAULT_DISALLOW:
        assert f"Disallow: {path}" in content
    assert "Sitemap:" in content


async def test_robots_txt_uses_admin_rule_when_present(db_session):
    db_session.add(SeoRobotsRule(
        user_agent="Googlebot",
        allow_paths=["/"],
        disallow_paths=["/secret"],
        is_active=True,
    ))
    await db_session.commit()

    content = await build_robots_txt(db_session)
    assert "User-agent: Googlebot" in content
    assert "Disallow: /secret" in content
    # default fallback rule should NOT appear once a real rule exists
    assert "User-agent: *" not in content
