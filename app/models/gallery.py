from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text,
    ForeignKey, JSON, Table
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

# Many-to-many: GuestSelfieMatch ↔ GalleryImage
selfie_match_images = Table(
    "gallery_guestselfie_matched_images",
    Base.metadata,
    Column("guestselfie_id", Integer, ForeignKey("guest_selfie_matches.id"), primary_key=True),
    Column("galleryimage_id", Integer, ForeignKey("gallery_images.id"), primary_key=True),
)


class GalleryCategory(Base):
    __tablename__ = "gallery_categories"

    id         = Column(Integer, primary_key=True)
    name       = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship("GalleryImage", back_populates="category")


class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id             = Column(Integer, primary_key=True, index=True)
    website_id     = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    category_id    = Column(Integer, ForeignKey("gallery_categories.id", ondelete="SET NULL"), nullable=True)
    gallery_type   = Column(String(20), default="INVITATION", index=True)
    title          = Column(String(255), default="")
    picture        = Column(String(200), nullable=False)
    thumb_small    = Column(String(200), nullable=True)
    thumb_medium   = Column(String(200), nullable=True)
    face_embedding = Column(JSON, nullable=True)
    download_count = Column(Integer, default=0)
    slug           = Column(String(200), unique=True, nullable=False, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    modified_at    = Column(DateTime(timezone=True), onupdate=func.now())

    website     = relationship("CoupleWebsite",  back_populates="gallery_images")
    category    = relationship("GalleryCategory",back_populates="images")
    uploaded_by = relationship("User",           back_populates="gallery_uploads")
    selfie_matches = relationship("GuestSelfieMatch", secondary=selfie_match_images, back_populates="matched_images")


class GuestSelfieMatch(Base):
    __tablename__ = "guest_selfie_matches"

    id               = Column(Integer, primary_key=True)
    website_id       = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    selfie           = Column(String(200), nullable=False)
    selfie_embedding = Column(JSON, nullable=True)
    status           = Column(String(10), default="PENDING")
    error            = Column(Text, default="")
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    website        = relationship("CoupleWebsite",  back_populates="selfie_matches")
    matched_images = relationship("GalleryImage",   secondary=selfie_match_images, back_populates="selfie_matches")
