"""SEO module — redirect lookup.

Checked from app/routers/invitations.py / birthday.py when a slug lookup
comes up empty, so retiring or renaming a published page's slug doesn't
have to cost its indexed URL — the same job Yoast Premium's redirect
manager or the standalone Redirection plugin does in WordPress.

Scope note: this only covers the two page types that have a real slug-based
lookup today (wedding invites, birthday pages) because those are the only
requests that already round-trip through the API before rendering. A fully
general "redirect any path on the site" manager would need nginx (or the SPA
itself) to consult this table on every navigation, not just the two dynamic
detail routes — see SEO_ROADMAP.md.
"""
from __future__ import annotations
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.seo.models import SeoRedirect


async def find_active_redirect(db: AsyncSession, source_path: str) -> Optional[SeoRedirect]:
    result = await db.execute(
        select(SeoRedirect).where(
            SeoRedirect.source_path == source_path,
            SeoRedirect.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def record_hit(db: AsyncSession, redirect: SeoRedirect) -> None:
    redirect.hit_count = (redirect.hit_count or 0) + 1
    await db.commit()
