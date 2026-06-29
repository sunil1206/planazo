from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text,
    ForeignKey, JSON, Table, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

# Many-to-many: GuestSelfieMatch ↔ GalleryImage
selfie_match_images = Table(
    "gallery_guestselfie_matched_images",
    Base.metadata,
    Column("guestselfie_id",  Integer, ForeignKey("guest_selfie_matches.id"), primary_key=True),
    Column("galleryimage_id", Integer, ForeignKey("gallery_images.id"),       primary_key=True),
)


class GalleryCategory(Base):
    __tablename__ = "gallery_categories"

    id         = Column(Integer, primary_key=True)
    name       = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship("GalleryImage", back_populates="category")


# ── Gallery Album ─────────────────────────────────────────────────────────────

class GalleryAlbum(Base):
    """Named album within an event gallery (e.g. 'Ceremony', 'Reception')."""
    __tablename__ = "gallery_albums"

    id           = Column(Integer, primary_key=True)
    website_id   = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False, index=True)
    name         = Column(String(255), nullable=False)
    description  = Column(String(500), default="")
    cover_image  = Column(String(500), nullable=True)
    order        = Column(Integer, default=0)
    is_published = Column(Boolean, default=True)
    # Privacy: PUBLIC / FAMILY / PRIVATE
    privacy      = Column(String(10), default="PUBLIC")
    created_by_id= Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    website    = relationship("CoupleWebsite", back_populates="albums")
    created_by = relationship("User")
    images     = relationship("GalleryImage", back_populates="album", cascade="all, delete-orphan")


# ── Gallery Image (extended) ──────────────────────────────────────────────────

class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id             = Column(Integer, primary_key=True, index=True)
    website_id     = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    album_id       = Column(Integer, ForeignKey("gallery_albums.id", ondelete="SET NULL"), nullable=True)
    category_id    = Column(Integer, ForeignKey("gallery_categories.id", ondelete="SET NULL"), nullable=True)

    # Media type: IMAGE / VIDEO / AUDIO / VIDEO_360 / LIVE_PHOTO
    media_type     = Column(String(15), default="IMAGE", index=True)
    gallery_type   = Column(String(20), default="INVITATION", index=True)

    title          = Column(String(255), default="")
    caption        = Column(String(500), default="")

    # Storage keys / URLs
    picture        = Column(String(500), nullable=False)      # original (local path or S3 key)
    storage_key    = Column(String(500), nullable=True)       # S3/R2 key
    cdn_url        = Column(String(500), nullable=True)       # public CDN URL
    thumb_small    = Column(String(500), nullable=True)       # 150×150
    thumb_medium   = Column(String(500), nullable=True)       # 600×600
    thumb_webp     = Column(String(500), nullable=True)       # 800px WebP
    watermarked_url= Column(String(500), nullable=True)       # watermarked version
    file_size_kb   = Column(Integer, nullable=True)
    width          = Column(Integer, nullable=True)
    height         = Column(Integer, nullable=True)
    duration_sec   = Column(Integer, nullable=True)           # for video/audio

    # AI metadata
    face_embedding  = Column(JSON, nullable=True)
    ai_tags         = Column(JSON, nullable=True)             # ["bride","outdoor","sunset"]
    ai_scene        = Column(String(100), nullable=True)      # "ceremony","reception","portrait"
    ai_quality_score= Column(Integer, nullable=True)          # 0–100
    ai_is_duplicate = Column(Boolean, default=False)
    ai_is_blurry    = Column(Boolean, default=False)
    ai_processed    = Column(Boolean, default=False)

    # Status / workflow
    is_approved    = Column(Boolean, default=True)
    is_featured    = Column(Boolean, default=False)
    is_pinned      = Column(Boolean, default=False)
    is_highlighted = Column(Boolean, default=False)
    is_hidden      = Column(Boolean, default=False)
    # Privacy: PUBLIC / FAMILY / PRIVATE
    privacy        = Column(String(10), default="PUBLIC")

    # Engagement
    download_count = Column(Integer, default=0)
    likes_count    = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)

    slug           = Column(String(200), unique=True, nullable=False, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    modified_at    = Column(DateTime(timezone=True), onupdate=func.now())

    website        = relationship("CoupleWebsite",    back_populates="gallery_images")
    album          = relationship("GalleryAlbum",     back_populates="images")
    category       = relationship("GalleryCategory",  back_populates="images")
    uploaded_by    = relationship("User",             back_populates="gallery_uploads")
    selfie_matches = relationship("GuestSelfieMatch", secondary=selfie_match_images, back_populates="matched_images")
    likes          = relationship("GalleryMediaLike",    back_populates="image", cascade="all, delete-orphan")
    comments       = relationship("GalleryMediaComment", back_populates="image", cascade="all, delete-orphan")


# ── Likes ─────────────────────────────────────────────────────────────────────

class GalleryMediaLike(Base):
    __tablename__ = "gallery_media_likes"

    id         = Column(Integer, primary_key=True)
    image_id   = Column(Integer, ForeignKey("gallery_images.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("account_user.id",   ondelete="CASCADE"), nullable=True)
    guest_name = Column(String(100), default="")   # for unauthenticated guests
    ip_hash    = Column(String(64),  default="")   # deduplicate anonymous likes
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    image = relationship("GalleryImage", back_populates="likes")
    user  = relationship("User")


# ── Comments ──────────────────────────────────────────────────────────────────

class GalleryMediaComment(Base):
    __tablename__ = "gallery_media_comments"

    id         = Column(Integer, primary_key=True)
    image_id   = Column(Integer, ForeignKey("gallery_images.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("account_user.id",   ondelete="SET NULL"), nullable=True)
    guest_name = Column(String(100), default="")
    text       = Column(Text, nullable=False)
    is_approved= Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    image = relationship("GalleryImage", back_populates="comments")
    user  = relationship("User")


# ── Guest Selfie Match (unchanged) ────────────────────────────────────────────

class GuestSelfieMatch(Base):
    __tablename__ = "guest_selfie_matches"

    id               = Column(Integer, primary_key=True)
    website_id       = Column(Integer, ForeignKey("couple_websites.id", ondelete="CASCADE"), nullable=False)
    selfie           = Column(String(500), nullable=False)
    selfie_embedding = Column(JSON, nullable=True)
    status           = Column(String(10), default="PENDING")
    error            = Column(Text, default="")
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    website        = relationship("CoupleWebsite",  back_populates="selfie_matches")
    matched_images = relationship("GalleryImage",   secondary=selfie_match_images, back_populates="selfie_matches")
