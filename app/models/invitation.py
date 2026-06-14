from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class CoupleWebsite(Base):
    __tablename__ = "couple_websites"

    id             = Column(Integer, primary_key=True, index=True)
    account_id     = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False, index=True)
    theme          = Column(String(50), default="modern_minimal")
    couple         = Column(String(255), nullable=False)
    bride_info     = Column(String(255), default="")
    groom_info     = Column(String(255), default="")
    thumbnail      = Column(String(200), nullable=True)
    is_published   = Column(Boolean, default=False)
    views          = Column(Integer, default=0)
    slug           = Column(String(150), unique=True, nullable=False, index=True)
    gallery_token  = Column(String(12), unique=True, nullable=False, index=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())

    account         = relationship("User",               back_populates="couple_websites")
    bridegroom      = relationship("BrideGroom",         back_populates="website", uselist=False, cascade="all, delete-orphan")
    stories         = relationship("BrideGroomStory",    back_populates="website", cascade="all, delete-orphan", order_by="BrideGroomStory.order")
    events          = relationship("BrideGroomEvent",    back_populates="website", cascade="all, delete-orphan", order_by="BrideGroomEvent.order")
    countdown       = relationship("WeddingCountdown",   back_populates="website", uselist=False, cascade="all, delete-orphan")
    rsvps           = relationship("InvitationRSVP",     back_populates="website", cascade="all, delete-orphan")
    wishes          = relationship("Makeyourwish",       back_populates="website", cascade="all, delete-orphan")
    visits          = relationship("PageVisit",          back_populates="website", cascade="all, delete-orphan")
    guest_photos    = relationship("WeddingGalleryPhoto",back_populates="website", cascade="all, delete-orphan")
    wedding_vendors = relationship("WeddingVendor",      back_populates="website", cascade="all, delete-orphan")
    gallery_images  = relationship("GalleryImage",       back_populates="website", cascade="all, delete-orphan")
    gift_orders     = relationship("GiftOrder",          back_populates="website")
    selfie_matches  = relationship("GuestSelfieMatch",   back_populates="website", cascade="all, delete-orphan")
    scheduled_deliveries = relationship("ScheduledDelivery", back_populates="website")


class BrideGroom(Base):
    __tablename__ = "bride_groom"

    id                = Column(Integer, primary_key=True)
    website_id        = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), unique=True, nullable=False)
    groom_name        = Column(String(255), nullable=False)
    groom_description = Column(Text, default="")
    groom_image       = Column(String(200), nullable=True)
    groom_instagram   = Column(String(200), nullable=True)
    bride_name        = Column(String(255), nullable=False)
    bride_description = Column(Text, default="")
    bride_image       = Column(String(200), nullable=True)
    bride_instagram   = Column(String(200), nullable=True)

    website = relationship("CoupleWebsite", back_populates="bridegroom")


class BrideGroomStory(Base):
    __tablename__ = "stories"

    id         = Column(Integer, primary_key=True)
    website_id = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    title      = Column(String(255), nullable=False)
    image      = Column(String(200), nullable=True)
    date       = Column(DateTime(timezone=True), nullable=True)
    desc       = Column(Text, default="")
    order      = Column(Integer, default=0)

    website = relationship("CoupleWebsite", back_populates="stories")


class BrideGroomEvent(Base):
    __tablename__ = "events"

    id            = Column(Integer, primary_key=True)
    website_id    = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    title         = Column(String(255), nullable=False)
    image         = Column(String(200), nullable=True)
    date          = Column(DateTime(timezone=True), nullable=True)
    time          = Column(String(100), default="")
    desc          = Column(Text, default="")
    location_name = Column(String(255), default="")
    location_link = Column(String(200), nullable=True)
    order         = Column(Integer, default=0)

    website = relationship("CoupleWebsite", back_populates="events")


class WeddingCountdown(Base):
    __tablename__ = "wedding_countdown"

    id               = Column(Integer, primary_key=True)
    website_id       = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), unique=True, nullable=False)
    heading          = Column(String(255), default="We Are Getting Married!")
    event_date       = Column(DateTime(timezone=True), nullable=False)
    background_image = Column(String(200), nullable=True)

    website = relationship("CoupleWebsite", back_populates="countdown")


class InvitationRSVP(Base):
    __tablename__ = "invitation_rsvps"

    id              = Column(Integer, primary_key=True)
    website_id      = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    name            = Column(String(255), nullable=False)
    phone           = Column(String(20), default="")
    email           = Column(String(254), default="")
    attendance      = Column(String(10), default="YES")
    guests          = Column(Integer, default=1)
    meal_preference = Column(String(20), default="")
    message         = Column(Text, default="")
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    website = relationship("CoupleWebsite", back_populates="rsvps")


class Makeyourwish(Base):
    __tablename__ = "wishes"

    id           = Column(Integer, primary_key=True)
    website_id   = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String(255), nullable=False)
    relationship = Column(String(255), default="")
    image        = Column(String(200), nullable=True)
    message      = Column(Text, nullable=False)
    verified     = Column(Boolean, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    website = relationship("CoupleWebsite", back_populates="wishes")


class PageVisit(Base):
    __tablename__ = "page_visits"

    id         = Column(Integer, primary_key=True)
    website_id = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    ip_address = Column(String(39), nullable=False)
    visited_at = Column(DateTime(timezone=True), server_default=func.now())

    website = relationship("CoupleWebsite", back_populates="visits")


class WeddingGalleryPhoto(Base):
    __tablename__ = "wedding_gallery_photos"

    id            = Column(Integer, primary_key=True)
    website_id    = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    image         = Column(String(200), nullable=False)
    thumbnail     = Column(String(200), nullable=True)
    tag           = Column(String(20), default="other")
    caption       = Column(String(255), default="")
    uploader_name = Column(String(100), default="Guest")
    is_approved   = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    website = relationship("CoupleWebsite", back_populates="guest_photos")


class WeddingVendor(Base):
    __tablename__ = "wedding_vendors"
    __table_args__ = (UniqueConstraint("website_id", "vendor_id"),)

    id           = Column(Integer, primary_key=True)
    website_id   = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    vendor_id    = Column(Integer, ForeignKey("vendor_websites.id", ondelete="CASCADE"), nullable=False)
    service_note = Column(String(255), default="")
    order        = Column(Integer, default=0)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    website = relationship("CoupleWebsite", back_populates="wedding_vendors")
    vendor  = relationship("VendorWebsite", back_populates="wedding_bookings")
