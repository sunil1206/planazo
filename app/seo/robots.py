"""SEO module — robots.txt generation.

Reads admin-configured SeoRobotsRule rows; if none exist (fresh install,
zero admin setup done), falls back to DEFAULT_RULES below so the site is
never accidentally left fully open or fully blocked.
"""
from __future__ import annotations
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.seo.models import SeoRobotsRule

# Every authenticated/dashboard/admin surface, plus API routes (never meant
# to be indexed as HTML pages) and the SPA's auth flow pages.
DEFAULT_DISALLOW = [
    "/api/",
    "/admin",
    "/vendor-admin",
    "/gift-admin",
    "/home",
    "/dashboard",
    "/login",
    "/select-role",
    "/weddings",
    "/birthdays",
    "/gallery",
    "/planning",
    "/custom-events",
    "/create-event",
]


async def build_robots_txt(db: AsyncSession) -> str:
    result = await db.execute(select(SeoRobotsRule).where(SeoRobotsRule.is_active.is_(True)))
    rules: List[SeoRobotsRule] = list(result.scalars().all())

    lines: List[str] = []
    if rules:
        for rule in rules:
            lines.append(f"User-agent: {rule.user_agent}")
            for p in rule.allow_paths or []:
                lines.append(f"Allow: {p}")
            for p in rule.disallow_paths or []:
                lines.append(f"Disallow: {p}")
            lines.append("")
    else:
        lines.append("User-agent: *")
        lines.append("Allow: /")
        for p in DEFAULT_DISALLOW:
            lines.append(f"Disallow: {p}")
        lines.append("")

    lines.append(f"Sitemap: {settings.FRONTEND_URL.rstrip('/')}/sitemap.xml")
    return "\n".join(lines) + "\n"
