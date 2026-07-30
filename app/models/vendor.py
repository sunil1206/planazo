from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text,
    ForeignKey, Numeric, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class VendorCategory(Base):
    __tablename__ = "vendor_categories"

    id          = Column(Integer, primary_key=True)
    key         = Column(String(30), unique=True, nullable=False)
    name        = Column(String(100), nullable=False)
    icon_image  = Column(String(200), nullable=True)
    description = Column(Text, default="")
    order       = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    # SEO-friendly URL segment for the server-rendered vendor landing pages
    # (see app/ssr/), e.g. "wedding-planners" for key="wedding_planner".
    # Backfilled from `key` in migration 0005; editable via /admin.
    url_slug    = Column(String(50), unique=True, nullable=True)

    vendors = relationship("VendorWebsite", back_populates="category_obj")


class VendorThemePreset(Base):
    __tablename__ = "vendor_theme_presets"

    id            = Column(Integer, primary_key=True)
    name          = Column(String(100), nullable=False)
    hex_color     = Column(String(20), nullable=False)
    preview_image = Column(String(200), nullable=True)
    order         = Column(Integer, default=0)
    is_active     = Column(Boolean, default=True)

    vendors = relationship("VendorWebsite", back_populates="theme_preset")


class VendorWebsite(Base):
    __tablename__ = "vendor_websites"

    id              = Column(Integer, primary_key=True, index=True)
    account_id      = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), unique=True, nullable=False)
    category_obj_id = Column(Integer, ForeignKey("vendor_categories.id", ondelete="SET NULL"), nullable=True)
    category        = Column(String(20), default="")
    theme_preset_id = Column(Integer, ForeignKey("vendor_theme_presets.id", ondelete="SET NULL"), nullable=True)
    title           = Column(String(255), nullable=False)
    bio             = Column(Text, nullable=False, default="")
    tagline         = Column(String(255), default="")
    thumbnail       = Column(String(200), nullable=True)
    cover_image     = Column(String(200), nullable=True)
    theme_color     = Column(String(20), default="#C9952A")
    phone           = Column(String(20), nullable=False, default="")
    email           = Column(String(254), nullable=False, default="")
    city            = Column(String(100), default="")
    address         = Column(Text, default="")
    website         = Column(String(200), nullable=True)
    instagram       = Column(String(200), nullable=True)
    is_active       = Column(Boolean, default=True)
    is_verified     = Column(Boolean, default=False)
    slug            = Column(String(150), unique=True, nullable=False, index=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    account             = relationship("User",                back_populates="vendor_website")
    category_obj        = relationship("VendorCategory",      back_populates="vendors")
    theme_preset        = relationship("VendorThemePreset",   back_populates="vendors")
    portfolio_categories= relationship("PortfolioCategory",   back_populates="vendor", cascade="all, delete-orphan")
    packages            = relationship("VendorPackage",       back_populates="vendor", cascade="all, delete-orphan")
    portfolio           = relationship("VendorPortfolioImage",back_populates="vendor", cascade="all, delete-orphan")
    enquiries           = relationship("VendorEnquiry",       back_populates="vendor", cascade="all, delete-orphan")
    reviews             = relationship("VendorReview",        back_populates="vendor", cascade="all, delete-orphan")
    subscription        = relationship("VendorSubscription",  back_populates="vendor", uselist=False)
    favorited_by        = relationship("VendorFavorite",      back_populates="vendor", cascade="all, delete-orphan")
    wedding_bookings    = relationship("WeddingVendor",       back_populates="vendor")


class PortfolioCategory(Base):
    __tablename__ = "vendor_portfolio_categories"

    id         = Column(Integer, primary_key=True)
    vendor_id  = Column(Integer, ForeignKey("vendor_websites.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(100), nullable=False)
    emoji      = Column(String(10), default="")
    icon_image = Column(String(200), nullable=True)
    order      = Column(Integer, default=0)

    vendor = relationship("VendorWebsite", back_populates="portfolio_categories")
    images = relationship("VendorPortfolioImage", back_populates="category")


class VendorPackage(Base):
    __tablename__ = "vendor_packages"

    id            = Column(Integer, primary_key=True)
    vendor_id     = Column(Integer, ForeignKey("vendor_websites.id", ondelete="CASCADE"), nullable=False)
    name          = Column(String(100), nullable=False)
    price         = Column(Numeric(10, 2), nullable=False)
    description   = Column(String(500), default="")
    features      = Column(JSON, default=list)
    max_hours     = Column(Integer, nullable=True)
    delivery_days = Column(Integer, nullable=True)
    is_popular    = Column(Boolean, default=False)
    allows_custom = Column(Boolean, default=True)
    is_available  = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    vendor = relationship("VendorWebsite", back_populates="packages")


class VendorPortfolioImage(Base):
    __tablename__ = "vendor_portfolio"

    id          = Column(Integer, primary_key=True)
    vendor_id   = Column(Integer, ForeignKey("vendor_websites.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("vendor_portfolio_categories.id", ondelete="SET NULL"), nullable=True)
    title       = Column(String(255), default="")
    picture     = Column(String(200), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    vendor   = relationship("VendorWebsite",      back_populates="portfolio")
    category = relationship("PortfolioCategory",  back_populates="images")


class VendorEnquiry(Base):
    __tablename__ = "vendor_enquiries"

    id         = Column(Integer, primary_key=True)
    vendor_id  = Column(Integer, ForeignKey("vendor_websites.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(255), nullable=False)
    email      = Column(String(254), nullable=False)
    phone      = Column(String(20), default="")
    event_date = Column(DateTime(timezone=True), nullable=True)
    message    = Column(Text, nullable=False)
    status     = Column(String(10), default="NEW")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vendor = relationship("VendorWebsite", back_populates="enquiries")


class VendorReview(Base):
    __tablename__ = "vendor_reviews"

    id          = Column(Integer, primary_key=True)
    vendor_id   = Column(Integer, ForeignKey("vendor_websites.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    rating      = Column(Integer, nullable=False)
    comment     = Column(Text, nullable=False)
    is_approved = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    vendor   = relationship("VendorWebsite", back_populates="reviews")
    reviewer = relationship("User")


class SubscriptionPlan(Base):
    __tablename__ = "vendor_subscription_plans"

    id                   = Column(Integer, primary_key=True)
    tier                 = Column(String(10), unique=True, nullable=False)
    name                 = Column(String(50), nullable=False)
    price_monthly        = Column(Numeric(8, 2), default=0)
    price_yearly         = Column(Numeric(8, 2), default=0)
    max_packages         = Column(Integer, default=2)
    max_portfolio_images = Column(Integer, default=10)
    featured_placement   = Column(Boolean, default=False)
    analytics_access     = Column(Boolean, default=False)
    enquiry_management   = Column(Boolean, default=True)
    custom_theme         = Column(Boolean, default=False)
    priority_support     = Column(Boolean, default=False)
    razorpay_plan_id     = Column(String(100), default="")
    description          = Column(Text, default="")
    features_list        = Column(JSON, default=list)

    subscriptions = relationship("VendorSubscription", back_populates="plan")


class VendorSubscription(Base):
    __tablename__ = "vendor_subscriptions"

    id                       = Column(Integer, primary_key=True)
    vendor_id                = Column(Integer, ForeignKey("vendor_websites.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_id                  = Column(Integer, ForeignKey("vendor_subscription_plans.id", ondelete="RESTRICT"), nullable=False)
    status                   = Column(String(10), default="ACTIVE")
    is_yearly                = Column(Boolean, default=False)
    razorpay_subscription_id = Column(String(100), default="")
    razorpay_payment_id      = Column(String(100), default="")
    current_period_start     = Column(DateTime(timezone=True), server_default=func.now())
    current_period_end       = Column(DateTime(timezone=True), nullable=True)
    created_at               = Column(DateTime(timezone=True), server_default=func.now())
    updated_at               = Column(DateTime(timezone=True), onupdate=func.now())

    vendor = relationship("VendorWebsite",   back_populates="subscription")
    plan   = relationship("SubscriptionPlan",back_populates="subscriptions")


class VendorFavorite(Base):
    __tablename__ = "vendor_favorites"
    __table_args__ = (UniqueConstraint("user_id", "vendor_id"),)

    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False)
    vendor_id  = Column(Integer, ForeignKey("vendor_websites.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user   = relationship("User",          back_populates="vendor_favorites")
    vendor = relationship("VendorWebsite", back_populates="favorited_by")
