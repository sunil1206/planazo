"""SEO module — sitemap.xml generation.

Wedding/birthday pages: CoupleWebsite (/invite/:slug) and BirthdayPage
(/birthday/:slug) — the SPA's own live public routes.

Vendor pages: category index, category+city listing, and vendor detail
pages — the real server-rendered pages in app/ssr/. Product pages are still
left out; no frontend/SSR page renders them yet (see SEO_ROADMAP.md), and
listing a URL that 404s is worse for SEO than not listing it at all.

Listing pages are only included where at least one verified vendor actually
exists for that category+city combination — an empty "0 results" page isn't
worth indexing (thin content), even though the page itself still renders a
200 for a direct visit.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import List, NamedTuple
from xml.sax.saxutils import escape

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.invitation import CoupleWebsite
from app.models.birthday import BirthdayPage
from app.seo.slugs import slugify
from app.ssr import queries as vendor_queries


class SitemapUrl(NamedTuple):
    loc: str
    lastmod: str  # ISO 8601 date, no time
    changefreq: str
    priority: str
    source: str


def _abs(path: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/{path.lstrip('/')}"


def _date(dt) -> str:
    d = dt or datetime.now(timezone.utc)
    return d.date().isoformat()


async def collect_sitemap_urls(db: AsyncSession) -> List[SitemapUrl]:
    # Only the actual public root goes in as a "static" entry — /weddings,
    # /birthdays, /home, etc. are all behind ProtectedRoute (dashboard pages
    # requiring login), so listing them would just send crawlers to a login
    # wall. /select-role and /login are auth flow, not content — also excluded.
    urls: List[SitemapUrl] = [
        SitemapUrl(_abs("/"), _date(None), "weekly", "1.0", "static"),
    ]

    weddings = await db.execute(
        select(CoupleWebsite.slug, CoupleWebsite.updated_at, CoupleWebsite.created_at)
        .where(CoupleWebsite.is_published.is_(True))
    )
    for slug, updated_at, created_at in weddings.all():
        urls.append(SitemapUrl(_abs(f"/invite/{slug}"), _date(updated_at or created_at), "weekly", "0.8", "wedding"))

    birthdays = await db.execute(
        select(BirthdayPage.slug, BirthdayPage.updated_at, BirthdayPage.created_at)
        .where(BirthdayPage.is_published.is_(True))
    )
    for slug, updated_at, created_at in birthdays.all():
        urls.append(SitemapUrl(_abs(f"/birthday/{slug}"), _date(updated_at or created_at), "weekly", "0.8", "birthday"))

    # ── Vendor SEO landing pages (app/ssr/) ────────────────────────────────
    categories = await vendor_queries.get_all_active_categories(db)
    for cat in categories:
        if not cat.url_slug:
            continue
        vendors = await vendor_queries.list_vendors_for_category(db, cat.key)
        if not vendors:
            continue
        urls.append(SitemapUrl(_abs(f"/vendors/{cat.url_slug}"), _date(None), "weekly", "0.6", "vendor-category"))

        cities_seen: dict[str, list] = {}
        for v in vendors:
            cities_seen.setdefault(slugify(v.city), []).append(v)

        for city_slug, city_vendors in cities_seen.items():
            urls.append(SitemapUrl(
                _abs(f"/vendors/{cat.url_slug}/{city_slug}"), _date(None), "weekly", "0.7", "vendor-listing",
            ))
            for v in city_vendors:
                urls.append(SitemapUrl(
                    _abs(f"/vendors/{cat.url_slug}/{city_slug}/{v.slug}"),
                    _date(v.created_at), "monthly", "0.6", "vendor-detail",
                ))

    return urls


def render_sitemap_xml(urls: List[SitemapUrl]) -> str:
    entries = "\n".join(
        f"  <url>\n"
        f"    <loc>{escape(u.loc)}</loc>\n"
        f"    <lastmod>{u.lastmod}</lastmod>\n"
        f"    <changefreq>{u.changefreq}</changefreq>\n"
        f"    <priority>{u.priority}</priority>\n"
        f"  </url>"
        for u in urls
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n"
        "</urlset>\n"
    )
