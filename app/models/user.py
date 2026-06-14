from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class User(Base):
    __tablename__ = "account_user"

    id           = Column(Integer, primary_key=True, index=True)
    password     = Column(String(128), nullable=False, default="!")
    last_login   = Column(DateTime(timezone=True), nullable=True)
    is_superuser = Column(Boolean, default=False)
    email        = Column(String(254), unique=True, nullable=False, index=True)
    full_name    = Column(String(255), nullable=False, default="")
    role         = Column(String(20), nullable=False, default="COUPLE")
    google_id    = Column(String(255), unique=True, nullable=True)
    phone        = Column(String(20), unique=True, nullable=True)
    avatar_url   = Column(String(200), nullable=True)
    is_active    = Column(Boolean, default=True)
    is_staff     = Column(Boolean, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Relationships ─────────────────────────────────────────────────────────
    couple_websites    = relationship("CoupleWebsite",    back_populates="account",      cascade="all, delete-orphan")
    vendor_website     = relationship("VendorWebsite",    back_populates="account",      uselist=False)
    gallery_uploads    = relationship("GalleryImage",     back_populates="uploaded_by")
    subscription       = relationship("UserSubscription", back_populates="account",      uselist=False)
    vendor_favorites   = relationship("VendorFavorite",   back_populates="user",         cascade="all, delete-orphan")
    birthday_pages     = relationship("BirthdayPage",     back_populates="owner",        cascade="all, delete-orphan")
    seller_profile     = relationship("GiftSeller",       back_populates="user",         uselist=False)
    marketplace_orders = relationship("MarketplaceOrder", back_populates="user")
    transactions       = relationship("Transaction",      back_populates="account")

    # ── Properties ───────────────────────────────────────────────────────────
    @property
    def is_couple(self):
        return self.role == "COUPLE"

    @property
    def is_vendor(self):
        return self.role == "VENDOR"

    def __repr__(self):
        return f"<User {self.email}>"
