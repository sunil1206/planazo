"""SEO module — sitemap.xml generation.

Only includes page types that currently have BOTH a real slug and a live
public frontend route: CoupleWebsite (/invite/:slug) and BirthdayPage
(/birthday/:slug). Vendor and product pages are deliberately left out for
now — there's no frontend page to render them yet (see SEO_ROADMAP.md), and
listing a URL in a sitemap that 404s is worse for SEO than not listing it at
all. Adding a source is a ~5-line addition to SITEMAP_SOURCES once its
frontend page exists.
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
