"""SSR module — DB access for the vendor SEO landing pages.

Cities are free-text (VendorWebsite.city), not a separate slugged column, so
URL <-> city matching slugifies both sides and compares in Python rather
than at the SQL layer — fine at marketplace scale; would want a stored
city_slug column if this ever needs to scale to tens of thousands of rows.

Every query below filters to is_active + is_verified vendors with both a
category and a city actually set — an incomplete vendor profile doesn't get
an SEO landing page yet, exactly the same "don't generate thin/fake pages"
principle as the rest of app/seo/.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, List, Dict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.vendor import VendorCategory, VendorWebsite, VendorReview, VendorPortfolioImage
from app.seo.models import BlogPost
from app.seo.slugs import slugify


@dataclass
class VendorRating:
    average: Optional[float]
    count: int


async def get_category_by_url_slug(db: AsyncSession, url_slug: str) -> Optional[VendorCategory]:
    result = await db.execute(
        select(VendorCategory).where(VendorCategory.url_slug == url_slug, VendorCategory.is_active.is_(True))
    )
    return result.scalar_one_or_none()


async def get_all_active_categories(db: AsyncSession) -> List[VendorCategory]:
    result = await db.execute(
        select(VendorCategory).where(VendorCategory.is_active.is_(True)).order_by(VendorCategory.order)
    )
    return list(result.scalars().all())


def _base_vendor_query():
    return select(VendorWebsite).where(
        VendorWebsite.is_active.is_(True),
        VendorWebsite.is_verified.is_(True),
        VendorWebsite.category != "",
        VendorWebsite.city != "",
    )


async def list_vendors_for_category(db: AsyncSession, category_key: str) -> List[VendorWebsite]:
    result = await db.execute(_base_vendor_query().where(VendorWebsite.category == category_key))
    return list(result.scalars().all())


async def list_vendors_for_category_and_city(
    db: AsyncSession, category_key: str, city_slug: str
) -> List[VendorWebsite]:
    all_in_category = await list_vendors_for_category(db, category_key)
    return [v for v in all_in_category if slugify(v.city) == city_slug]


async def get_vendor_detail(db: AsyncSession, category_key: str, city_slug: str, slug: str) -> Optional[VendorWebsite]:
    result = await db.execute(
        _base_vendor_query()
        .where(VendorWebsite.category == category_key, VendorWebsite.slug == slug)
        .options(
            selectinload(VendorWebsite.portfolio),
            selectinload(VendorWebsite.packages),
        )
    )
    vendor = result.scalar_one_or_none()
    if not vendor or slugify(vendor.city) != city_slug:
        return None
    return vendor


async def get_ratings_for_vendors(db: AsyncSession, vendor_ids: List[int]) -> Dict[int, VendorRating]:
    if not vendor_ids:
        return {}
    result = await db.execute(
        select(
            VendorReview.vendor_id,
            func.avg(VendorReview.rating),
            func.count(VendorReview.id),
        )
        .where(VendorReview.vendor_id.in_(vendor_ids), VendorReview.is_approved.is_(True))
        .group_by(VendorReview.vendor_id)
    )
    return {
        row[0]: VendorRating(average=round(float(row[1]), 1) if row[1] is not None else None, count=row[2])
        for row in result.all()
    }


async def get_approved_reviews(db: AsyncSession, vendor_id: int, limit: int = 20) -> list[VendorReview]:
    result = await db.execute(
        select(VendorReview)
        .where(VendorReview.vendor_id == vendor_id, VendorReview.is_approved.is_(True))
        .order_by(VendorReview.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_related_cities(db: AsyncSession, category_key: str, exclude_city_slug: str, limit: int = 8) -> List[str]:
    """Real, distinct cities (original casing) with at least one vendor in
    this category, excluding the current one — for internal linking."""
    vendors = await list_vendors_for_category(db, category_key)
    seen: dict[str, str] = {}
    for v in vendors:
        cs = slugify(v.city)
        if cs and cs != exclude_city_slug and cs not in seen:
            seen[cs] = v.city
    return list(seen.values())[:limit]


async def list_related_categories_in_city(
    db: AsyncSession, city_slug: str, exclude_category_key: str, limit: int = 6
) -> List[VendorCategory]:
    """Real categories that have at least one vendor in this same city,
    excluding the current category — for internal linking."""
    categories = await get_all_active_categories(db)
    related = []
    for cat in categories:
        if cat.key == exclude_category_key:
            continue
        vendors = await list_vendors_for_category(db, cat.key)
        if any(slugify(v.city) == city_slug for v in vendors):
            related.append(cat)
        if len(related) >= limit:
            break
    return related


async def get_portfolio_images(db: AsyncSession, vendor_id: int, limit: int = 12) -> List[VendorPortfolioImage]:
    result = await db.execute(
        select(VendorPortfolioImage)
        .where(VendorPortfolioImage.vendor_id == vendor_id)
        .order_by(VendorPortfolioImage.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_published_blog_posts(db: AsyncSession, limit: int = 50) -> List[BlogPost]:
    result = await db.execute(
        select(BlogPost)
        .where(BlogPost.status == "published")
        .order_by(BlogPost.published_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_published_blog_post(db: AsyncSession, slug: str) -> Optional[BlogPost]:
    result = await db.execute(
        select(BlogPost).where(BlogPost.slug == slug, BlogPost.status == "published")
    )
    return result.scalar_one_or_none()
