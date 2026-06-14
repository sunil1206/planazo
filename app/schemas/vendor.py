from __future__ import annotations
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


# ── VendorCategory ───────────────────────────────────────────────────────────

class VendorCategoryRead(BaseModel):
    id: int
    key: str
    name: str
    icon_image: Optional[str] = None
    description: str
    order: int
    is_active: bool
    model_config = {"from_attributes": True}


# ── VendorThemePreset ─────────────────────────────────────────────────────────

class VendorThemePresetRead(BaseModel):
    id: int
    name: str
    hex_color: str
    preview_image: Optional[str] = None
    order: int
    is_active: bool
    model_config = {"from_attributes": True}


# ── VendorPackage ─────────────────────────────────────────────────────────────

class VendorPackageBase(BaseModel):
    name: str
    price: Decimal
    description: str = ""
    features: List[str] = []
    max_hours: Optional[int] = None
    delivery_days: Optional[int] = None
    is_popular: bool = False
    allows_custom: bool = True
    is_available: bool = True


class VendorPackageRead(VendorPackageBase):
    id: int
    model_config = {"from_attributes": True}


class VendorPackageCreate(VendorPackageBase):
    pass


class VendorPackageUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[Decimal] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    max_hours: Optional[int] = None
    delivery_days: Optional[int] = None
    is_popular: Optional[bool] = None
    allows_custom: Optional[bool] = None
    is_available: Optional[bool] = None


# ── PortfolioCategory ─────────────────────────────────────────────────────────

class PortfolioCategoryBase(BaseModel):
    name: str
    emoji: str = ""
    icon_image: Optional[str] = None
    order: int = 0


class PortfolioCategoryRead(PortfolioCategoryBase):
    id: int
    model_config = {"from_attributes": True}


class PortfolioCategoryCreate(PortfolioCategoryBase):
    pass


# ── VendorPortfolioImage ──────────────────────────────────────────────────────

class PortfolioImageRead(BaseModel):
    id: int
    category_id: Optional[int] = None
    title: str
    picture: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── VendorEnquiry ─────────────────────────────────────────────────────────────

class EnquiryCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    event_date: Optional[datetime] = None
    message: str


class EnquiryRead(EnquiryCreate):
    id: int
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── VendorReview ──────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating: int
    comment: str


class ReviewRead(ReviewCreate):
    id: int
    is_approved: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── VendorSubscription ────────────────────────────────────────────────────────

class VendorSubscriptionRead(BaseModel):
    id: int
    plan_id: int
    status: str
    is_yearly: bool
    current_period_end: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── SubscriptionPlan ──────────────────────────────────────────────────────────

class SubscriptionPlanRead(BaseModel):
    id: int
    tier: str
    name: str
    price_monthly: Decimal
    price_yearly: Decimal
    max_packages: int
    max_portfolio_images: int
    featured_placement: bool
    analytics_access: bool
    enquiry_management: bool
    custom_theme: bool
    priority_support: bool
    features_list: List[str] = []
    model_config = {"from_attributes": True}


# ── VendorFavorite ────────────────────────────────────────────────────────────

class VendorFavoriteRead(BaseModel):
    id: int
    vendor_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ── VendorWebsite ─────────────────────────────────────────────────────────────

class VendorWebsiteCreate(BaseModel):
    title: str
    bio: str = ""
    tagline: str = ""
    slug: str
    category: str = ""
    category_obj_id: Optional[int] = None
    phone: str = ""
    email: str = ""
    city: str = ""
    address: str = ""
    website: Optional[str] = None
    instagram: Optional[str] = None
    theme_color: str = "#C9952A"
    theme_preset_id: Optional[int] = None


class VendorWebsiteUpdate(BaseModel):
    title: Optional[str] = None
    bio: Optional[str] = None
    tagline: Optional[str] = None
    category: Optional[str] = None
    category_obj_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    theme_color: Optional[str] = None
    theme_preset_id: Optional[int] = None
    thumbnail: Optional[str] = None
    cover_image: Optional[str] = None
    is_active: Optional[bool] = None


class VendorWebsiteRead(BaseModel):
    id: int
    title: str
    bio: str
    tagline: str
    slug: str
    category: str
    phone: str
    email: str
    city: str
    address: str
    website: Optional[str] = None
    instagram: Optional[str] = None
    theme_color: str
    thumbnail: Optional[str] = None
    cover_image: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    subscription: Optional[VendorSubscriptionRead] = None
    model_config = {"from_attributes": True}


class VendorWebsiteDetail(VendorWebsiteRead):
    portfolio_categories: List[PortfolioCategoryRead] = []
    packages: List[VendorPackageRead] = []
    portfolio: List[PortfolioImageRead] = []
