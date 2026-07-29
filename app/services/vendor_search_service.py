"""Enhanced vendor search for the Planning Suite's "Find Vendors" module —
adds price range, rating, verified and featured filters on top of the
existing public listing in app/routers/vendors.py (category/city/search).

Note on ``availability``: there is no vendor calendar/booking-slots table
anywhere in this codebase, so an "is this vendor free on date X" filter has
no data to query. The parameter is accepted (so the frontend can wire it up
without a 422) but is currently a no-op — documented here rather than faked.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select, func, exists, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vendor import VendorWebsite, VendorPackage, VendorReview, VendorSubscription, SubscriptionPlan
from app.utils.pagination import PageParams


class VendorSearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self, *,
        category: Optional[str] = None,
        city: Optional[str] = None,
        location: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        verified: Optional[bool] = None,
        featured: Optional[bool] = None,
        params: PageParams,
    ) -> dict:
        q = select(VendorWebsite).where(VendorWebsite.is_active == True)

        if category:
            q = q.where(VendorWebsite.category == category)
        if city:
            q = q.where(VendorWebsite.city.ilike(f"%{city}%"))
        if location:
            q = q.where(
                VendorWebsite.city.ilike(f"%{location}%") | VendorWebsite.address.ilike(f"%{location}%")
            )
        if verified is not None:
            q = q.where(VendorWebsite.is_verified == verified)

        if featured:
            q = q.where(
                exists(
                    select(1).select_from(VendorSubscription)
                    .join(SubscriptionPlan, SubscriptionPlan.id == VendorSubscription.plan_id)
                    .where(
                        VendorSubscription.vendor_id == VendorWebsite.id,
                        VendorSubscription.status == "ACTIVE",
                        SubscriptionPlan.featured_placement == True,
                    )
                )
            )

        if min_price is not None or max_price is not None:
            conditions = [VendorPackage.vendor_id == VendorWebsite.id]
            if min_price is not None:
                conditions.append(VendorPackage.price >= min_price)
            if max_price is not None:
                conditions.append(VendorPackage.price <= max_price)
            q = q.where(exists(select(1).select_from(VendorPackage).where(and_(*conditions))))

        if min_rating is not None:
            rating_subq = (
                select(VendorReview.vendor_id)
                .where(VendorReview.is_approved == True)
                .group_by(VendorReview.vendor_id)
                .having(func.avg(VendorReview.rating) >= min_rating)
            )
            q = q.where(VendorWebsite.id.in_(rating_subq))

        count_q = select(func.count()).select_from(q.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        q = q.order_by(VendorWebsite.is_verified.desc(), VendorWebsite.created_at.desc())
        q = q.offset(params.offset).limit(params.page_size)
        result = await self.db.execute(q)
        vendors = list(result.scalars().unique().all())

        pages = (total + params.page_size - 1) // params.page_size if params.page_size else 0
        return {
            "items": vendors, "total": total,
            "page": params.page, "page_size": params.page_size, "pages": max(pages, 0),
        }
