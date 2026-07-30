"""Tests for app/seo/ — meta generation, overrides, sitemap, robots.txt.

Reuses the db_session/make_wedding/make_birthday/make_vendor fixtures from
conftest.py (in-memory SQLite via StaticPool) rather than hitting a router,
since app/seo/generator.py's build_*_meta() functions are called directly
by app/routers/invitations.py and app/routers/birthday.py, not exposed as
their own endpoint.
"""
from __future__ import annotations

import pytest

from app.seo.models import SeoMetaOverride, SeoRobotsRule, SeoRedirect
from app.seo.generator import build_wedding_meta, build_birthday_meta, build_vendor_meta
from app.seo.sitemap import collect_sitemap_urls, render_sitemap_xml
from app.seo.robots import build_robots_txt, DEFAULT_DISALLOW
from app.seo.analysis import analyze_seo, flesch_reading_ease
from app.seo.redirects import find_active_redirect, record_hit


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


async def test_sitemap_includes_vendor_pages_with_at_least_one_vendor(db_session):
    from app.models.vendor import VendorCategory, VendorWebsite
    from app.models.user import User

    cat = VendorCategory(key="caterer", name="Caterers", url_slug="caterers", is_active=True)
    db_session.add(cat)
    await db_session.flush()
    owner = User(email="cat-owner@test.com", password="!", full_name="Cat Owner", role="VENDOR", is_active=True)
    db_session.add(owner)
    await db_session.flush()
    vendor = VendorWebsite(
        account_id=owner.id, category="caterer", city="Goa", title="Best Caterers",
        slug="best-caterers", is_active=True, is_verified=True,
    )
    db_session.add(vendor)
    await db_session.commit()

    urls = await collect_sitemap_urls(db_session)
    locs = [u.loc for u in urls]
    assert any("/vendors/caterers" == u.loc.rsplit("planazo.in", 1)[-1] or u.loc.endswith("/vendors/caterers") for u in urls)
    assert any(u.loc.endswith("/vendors/caterers/goa") for u in urls)
    assert any(u.loc.endswith("/vendors/caterers/goa/best-caterers") for u in urls)


async def test_sitemap_excludes_categories_with_no_vendors(db_session):
    from app.models.vendor import VendorCategory

    db_session.add(VendorCategory(key="empty_cat", name="Empty Category", url_slug="empty-category", is_active=True))
    await db_session.commit()

    urls = await collect_sitemap_urls(db_session)
    assert not any("empty-category" in u.loc for u in urls)


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


# ── On-page SEO analysis ─────────────────────────────────────────────────────

def test_analyze_seo_flags_missing_everything():
    result = analyze_seo(title="", meta_description="", slug="", content="", focus_keyword="")
    assert result.seo_score < 50
    assert result.seo_rating == "bad"
    ids = {c.id for c in result.checks}
    assert "title_length" in ids
    assert "meta_length" in ids
    assert "content_length" in ids


def test_analyze_seo_good_title_and_meta_score_well():
    title = "Priya & Arjun's Wedding Invitation — RSVP Now | Planazo"  # ~56 chars
    meta = ("Join Priya and Arjun as they celebrate their wedding. "
            "See the schedule, RSVP online, and share your wishes with the couple today.")  # ~130 chars
    result = analyze_seo(title=title, meta_description=meta, slug="priya-arjun", content="", focus_keyword="")
    title_check = next(c for c in result.checks if c.id == "title_length")
    meta_check = next(c for c in result.checks if c.id == "meta_length")
    assert title_check.status == "good"
    assert meta_check.status == "good"


def test_analyze_seo_focus_keyword_checklist():
    content = ("Priya and Arjun met in college and have been inseparable ever since. " * 10)
    result = analyze_seo(
        title="Priya & Arjun Wedding",
        meta_description="Priya & Arjun's wedding — RSVP and celebrate with us.",
        slug="priya-arjun-wedding",
        content=content,
        focus_keyword="Priya & Arjun",
    )
    kw_title = next(c for c in result.checks if c.id == "keyword_in_title")
    kw_meta = next(c for c in result.checks if c.id == "keyword_in_meta")
    assert kw_title.status == "good"
    assert kw_meta.status == "good"


def test_analyze_seo_keyword_absent_is_flagged_bad():
    result = analyze_seo(
        title="Our Big Day",
        meta_description="Come celebrate with us.",
        slug="our-big-day",
        content="Some unrelated filler content that never mentions the topic at all. " * 5,
        focus_keyword="Priya Arjun",
    )
    kw_title = next(c for c in result.checks if c.id == "keyword_in_title")
    kw_density = next(c for c in result.checks if c.id == "keyword_density")
    assert kw_title.status == "bad"
    assert kw_density.status == "bad"


def test_flesch_reading_ease_simple_text_scores_higher_than_complex():
    simple = "The cat sat on the mat. It was a good day. The sun was warm."
    complex_text = ("The multifaceted ramifications of epistemological indeterminacy "
                     "necessitate a fundamentally interdisciplinary methodological approach.")
    assert flesch_reading_ease(simple) > flesch_reading_ease(complex_text)


# ── Redirects ─────────────────────────────────────────────────────────────────

async def test_find_active_redirect_matches_source_path(db_session):
    db_session.add(SeoRedirect(source_path="/invite/old-slug", target_path="/invite/new-slug", status_code=301))
    await db_session.commit()

    found = await find_active_redirect(db_session, "/invite/old-slug")
    assert found is not None
    assert found.target_path == "/invite/new-slug"

    missing = await find_active_redirect(db_session, "/invite/does-not-exist")
    assert missing is None


async def test_inactive_redirect_is_not_matched(db_session):
    db_session.add(SeoRedirect(source_path="/invite/paused", target_path="/invite/new", is_active=False))
    await db_session.commit()

    found = await find_active_redirect(db_session, "/invite/paused")
    assert found is None


async def test_record_hit_increments_counter(db_session):
    redirect = SeoRedirect(source_path="/invite/x", target_path="/invite/y")
    db_session.add(redirect)
    await db_session.commit()
    await db_session.refresh(redirect)

    await record_hit(db_session, redirect)
    await record_hit(db_session, redirect)
    assert redirect.hit_count == 2


# ── Owner-scoped SEO settings + focus_keyword round-trip ───────────────────────

async def test_seo_meta_override_stores_focus_keyword(db_session, make_user, make_wedding):
    owner = await make_user(email="w4@test.com")
    website = await make_wedding(owner, couple="Keyword Test")

    db_session.add(SeoMetaOverride(
        path=f"/invite/{website.slug}",
        title="Custom Title",
        focus_keyword="keyword test wedding",
    ))
    await db_session.commit()

    result = await db_session.execute(
        SeoMetaOverride.__table__.select().where(SeoMetaOverride.path == f"/invite/{website.slug}")
    )
    row = result.fetchone()
    assert row.focus_keyword == "keyword test wedding"
