"""
Vendor router — mirrors backend/apps/vendor/views.py.

Endpoints:
  GET  /api/vendors/categories/
  GET  /api/vendors/themes/
  GET  /api/vendors/plans/
  GET/POST/PUT /api/vendors/website/
  POST /api/vendors/website/portfolio/
  DELETE /api/vendors/website/portfolio/{id}/
  GET/POST /api/vendors/website/packages/
  PUT/DELETE /api/vendors/website/packages/{id}/
  GET/POST /api/vendors/website/portfolio-categories/
  GET  /api/vendors/              (public listing)
  GET  /api/vendors/{slug}/       (public detail)
  POST /api/vendors/{slug}/enquire/
  POST /api/vendors/{slug}/review/
  GET/POST/DELETE /api/vendors/favorites/
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.base import get_db
from app.models.vendor import (
    VendorCategory, VendorThemePreset, VendorWebsite, PortfolioCategory,
    VendorPackage, VendorPortfolioImage, VendorEnquiry, VendorReview,
    SubscriptionPlan, VendorSubscription, VendorFavorite,
)
from app.models.user import User
from app.core.dependencies import get_current_user, require_role
from app.schemas.vendor import (
    VendorCategoryRead, VendorThemePresetRead, SubscriptionPlanRead,
    VendorWebsiteCreate, VendorWebsiteUpdate, VendorWebsiteRead, VendorWebsiteDetail,
    VendorPackageCreate, VendorPackageUpdate, VendorPackageRead,
    PortfolioCategoryCreate, PortfolioCategoryRead, PortfolioImageRead,
    EnquiryCreate, EnquiryRead, ReviewCreate, ReviewRead,
    VendorFavoriteRead,
)

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


# ── Reference data ────────────────────────────────────────────────────────────

@router.get("/categories/", response_model=List[VendorCategoryRead])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VendorCategory).where(VendorCategory.is_active == True)
        .order_by(VendorCategory.order)
    )
    return result.scalars().all()


@router.get("/themes/", response_model=List[VendorThemePresetRead])
async def list_themes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VendorThemePreset).where(VendorThemePreset.is_active == True)
        .order_by(VendorThemePreset.order)
    )
    return result.scalars().all()


@router.get("/plans/", response_model=List[SubscriptionPlanRead])
async def list_plans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SubscriptionPlan))
    return result.scalars().all()


# ── My vendor website ─────────────────────────────────────────────────────────

@router.get("/website/", response_model=VendorWebsiteDetail)
async def my_vendor_website(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite)
        .where(VendorWebsite.account_id == user.id)
        .options(
            selectinload(VendorWebsite.portfolio_categories),
            selectinload(VendorWebsite.packages),
            selectinload(VendorWebsite.portfolio),
            selectinload(VendorWebsite.subscription),
        )
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website found")
    return website


@router.post("/website/", response_model=VendorWebsiteRead, status_code=201)
async def create_vendor_website(
    body: VendorWebsiteCreate,
    user: User = Depends(require_role("VENDOR", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Vendor website already exists")

    slug_check = await db.execute(
        select(VendorWebsite).where(VendorWebsite.slug == body.slug)
    )
    if slug_check.scalar_one_or_none():
        raise HTTPException(400, "Slug already taken")

    website = VendorWebsite(**body.model_dump(), account_id=user.id)
    db.add(website)
    await db.commit()
    await db.refresh(website)
    return website


@router.put("/website/", response_model=VendorWebsiteRead)
async def update_vendor_website(
    body: VendorWebsiteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(website, field, val)
    await db.commit()
    await db.refresh(website)
    return website


# ── Portfolio categories ───────────────────────────────────────────────────────

@router.get("/website/portfolio-categories/", response_model=List[PortfolioCategoryRead])
async def list_portfolio_categories(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website")
    result2 = await db.execute(
        select(PortfolioCategory).where(PortfolioCategory.vendor_id == website.id)
    )
    return result2.scalars().all()


@router.post("/website/portfolio-categories/", response_model=PortfolioCategoryRead, status_code=201)
async def create_portfolio_category(
    body: PortfolioCategoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website")
    cat = PortfolioCategory(**body.model_dump(), vendor_id=website.id)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


# ── Packages ──────────────────────────────────────────────────────────────────

@router.get("/website/packages/", response_model=List[VendorPackageRead])
async def list_packages(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website")
    result2 = await db.execute(
        select(VendorPackage).where(VendorPackage.vendor_id == website.id)
    )
    return result2.scalars().all()


@router.post("/website/packages/", response_model=VendorPackageRead, status_code=201)
async def create_package(
    body: VendorPackageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website")
    pkg = VendorPackage(**body.model_dump(), vendor_id=website.id)
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return pkg


@router.put("/website/packages/{pkg_id}/", response_model=VendorPackageRead)
async def update_package(
    pkg_id: int,
    body: VendorPackageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website")
    result2 = await db.execute(
        select(VendorPackage).where(
            VendorPackage.id == pkg_id, VendorPackage.vendor_id == website.id
        )
    )
    pkg = result2.scalar_one_or_none()
    if not pkg:
        raise HTTPException(404, "Package not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(pkg, field, val)
    await db.commit()
    await db.refresh(pkg)
    return pkg


@router.delete("/website/packages/{pkg_id}/", status_code=204)
async def delete_package(
    pkg_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website")
    result2 = await db.execute(
        select(VendorPackage).where(
            VendorPackage.id == pkg_id, VendorPackage.vendor_id == website.id
        )
    )
    pkg = result2.scalar_one_or_none()
    if not pkg:
        raise HTTPException(404, "Package not found")
    await db.delete(pkg)
    await db.commit()


# ── Portfolio images ──────────────────────────────────────────────────────────

@router.get("/website/portfolio/", response_model=List[PortfolioImageRead])
async def list_portfolio(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website")
    result2 = await db.execute(
        select(VendorPortfolioImage).where(VendorPortfolioImage.vendor_id == website.id)
    )
    return result2.scalars().all()


@router.delete("/website/portfolio/{image_id}/", status_code=204)
async def delete_portfolio_image(
    image_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.account_id == user.id)
    )
    website = result.scalar_one_or_none()
    if not website:
        raise HTTPException(404, "No vendor website")
    result2 = await db.execute(
        select(VendorPortfolioImage).where(
            VendorPortfolioImage.id == image_id,
            VendorPortfolioImage.vendor_id == website.id,
        )
    )
    img = result2.scalar_one_or_none()
    if not img:
        raise HTTPException(404, "Image not found")
    await db.delete(img)
    await db.commit()


# ── Public listing ────────────────────────────────────────────────────────────

@router.get("/", response_model=List[VendorWebsiteRead])
async def list_vendors(
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = select(VendorWebsite).where(
        VendorWebsite.is_active == True,
        VendorWebsite.is_verified == True,
    )
    if category:
        q = q.where(VendorWebsite.category == category)
    if city:
        q = q.where(VendorWebsite.city.ilike(f"%{city}%"))
    if search:
        q = q.where(VendorWebsite.title.ilike(f"%{search}%"))
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{slug}/", response_model=VendorWebsiteDetail)
async def get_vendor(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VendorWebsite)
        .where(VendorWebsite.slug == slug, VendorWebsite.is_active == True)
        .options(
            selectinload(VendorWebsite.portfolio_categories),
            selectinload(VendorWebsite.packages),
            selectinload(VendorWebsite.portfolio),
            selectinload(VendorWebsite.subscription),
        )
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    return vendor


# ── Enquiry & Review (public) ─────────────────────────────────────────────────

@router.post("/{slug}/enquire/", response_model=EnquiryRead, status_code=201)
async def create_enquiry(
    slug: str,
    body: EnquiryCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.slug == slug)
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    enq = VendorEnquiry(**body.model_dump(), vendor_id=vendor.id)
    db.add(enq)
    await db.commit()
    await db.refresh(enq)
    return enq


@router.post("/{slug}/review/", response_model=ReviewRead, status_code=201)
async def create_review(
    slug: str,
    body: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorWebsite).where(VendorWebsite.slug == slug)
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    review = VendorReview(**body.model_dump(), vendor_id=vendor.id, reviewer_id=user.id)
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


# ── Favorites ─────────────────────────────────────────────────────────────────

@router.get("/favorites/", response_model=List[VendorFavoriteRead])
async def list_favorites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorFavorite).where(VendorFavorite.user_id == user.id)
    )
    return result.scalars().all()


@router.post("/favorites/{vendor_id}/", response_model=VendorFavoriteRead, status_code=201)
async def add_favorite(
    vendor_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(
        select(VendorFavorite).where(
            VendorFavorite.user_id == user.id,
            VendorFavorite.vendor_id == vendor_id,
        )
    )
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Already in favorites")
    fav = VendorFavorite(user_id=user.id, vendor_id=vendor_id)
    db.add(fav)
    await db.commit()
    await db.refresh(fav)
    return fav


@router.delete("/favorites/{vendor_id}/", status_code=204)
async def remove_favorite(
    vendor_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VendorFavorite).where(
            VendorFavorite.user_id == user.id,
            VendorFavorite.vendor_id == vendor_id,
        )
    )
    fav = result.scalar_one_or_none()
    if not fav:
        raise HTTPException(404, "Not in favorites")
    await db.delete(fav)
    await db.commit()
