"""
Event Permission System

Each event (wedding invitation, birthday page, etc.) has a permission table
that maps (user, role) → a set of capability flags.

Event types:
    WEDDING     — couple_websites.id
    BIRTHDAY    — birthday_pages.id
    CORPORATE   — future
    TRIP        — future

Roles (ordered from most to least privileged):
    OWNER       — the couple / event creator (auto-assigned on creation)
    CO_OWNER    — co-organizer with full write access
    ORGANIZER   — can manage content but not permissions
    PHOTOGRAPHER— can upload, create albums, not delete others' work
    VIDEOGRAPHER— same as photographer for video content
    FAMILY      — can upload + view private gallery
    VENDOR      — limited: view only
    GUEST       — upload guest photos, view public gallery
    VIEWER      — read-only (shareable link access)
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


# ── Role constants ────────────────────────────────────────────────────────────

class EventRole:
    OWNER        = "OWNER"
    CO_OWNER     = "CO_OWNER"
    ORGANIZER    = "ORGANIZER"
    PHOTOGRAPHER = "PHOTOGRAPHER"
    VIDEOGRAPHER = "VIDEOGRAPHER"
    FAMILY       = "FAMILY"
    VENDOR       = "VENDOR"
    GUEST        = "GUEST"
    VIEWER       = "VIEWER"

    ALL = [OWNER, CO_OWNER, ORGANIZER, PHOTOGRAPHER, VIDEOGRAPHER,
           FAMILY, VENDOR, GUEST, VIEWER]

    # Default capability presets per role
    DEFAULTS: dict = {
        OWNER:        dict(can_upload=True,  can_edit=True,  can_delete=True,  can_download=True,  can_approve=True,  can_publish=True,  can_share=True,  can_manage_permissions=True),
        CO_OWNER:     dict(can_upload=True,  can_edit=True,  can_delete=True,  can_download=True,  can_approve=True,  can_publish=True,  can_share=True,  can_manage_permissions=False),
        ORGANIZER:    dict(can_upload=True,  can_edit=True,  can_delete=False, can_download=True,  can_approve=True,  can_publish=True,  can_share=True,  can_manage_permissions=False),
        PHOTOGRAPHER: dict(can_upload=True,  can_edit=True,  can_delete=False, can_download=True,  can_approve=False, can_publish=False, can_share=False, can_manage_permissions=False),
        VIDEOGRAPHER: dict(can_upload=True,  can_edit=True,  can_delete=False, can_download=True,  can_approve=False, can_publish=False, can_share=False, can_manage_permissions=False),
        FAMILY:       dict(can_upload=True,  can_edit=False, can_delete=False, can_download=True,  can_approve=False, can_publish=False, can_share=True,  can_manage_permissions=False),
        VENDOR:       dict(can_upload=False, can_edit=False, can_delete=False, can_download=False, can_approve=False, can_publish=False, can_share=False, can_manage_permissions=False),
        GUEST:        dict(can_upload=True,  can_edit=False, can_delete=False, can_download=False, can_approve=False, can_publish=False, can_share=True,  can_manage_permissions=False),
        VIEWER:       dict(can_upload=False, can_edit=False, can_delete=False, can_download=False, can_approve=False, can_publish=False, can_share=False, can_manage_permissions=False),
    }


class EventPermission(Base):
    """One row per (event, user). Stores role + fine-grained capability overrides."""
    __tablename__ = "event_permissions"
    __table_args__ = (
        UniqueConstraint("event_type", "event_id", "user_id", name="uq_event_permission"),
    )

    id         = Column(Integer, primary_key=True)
    event_type = Column(String(20), nullable=False, index=True)   # WEDDING / BIRTHDAY
    event_id   = Column(Integer,   nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False)
    role       = Column(String(20), nullable=False)

    # Fine-grained overrides (NULL = use role default)
    can_upload              = Column(Boolean, nullable=True)
    can_edit                = Column(Boolean, nullable=True)
    can_delete              = Column(Boolean, nullable=True)
    can_download            = Column(Boolean, nullable=True)
    can_approve             = Column(Boolean, nullable=True)
    can_publish             = Column(Boolean, nullable=True)
    can_share               = Column(Boolean, nullable=True)
    can_manage_permissions  = Column(Boolean, nullable=True)

    invited_by_id = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    invite_token  = Column(String(64), nullable=True, unique=True, index=True)
    accepted_at   = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    user       = relationship("User", foreign_keys=[user_id],       back_populates="event_permissions")
    invited_by = relationship("User", foreign_keys=[invited_by_id])

    def effective(self, cap: str) -> bool:
        """Return the effective capability: override if set, else role default."""
        override = getattr(self, cap, None)
        if override is not None:
            return override
        return EventRole.DEFAULTS.get(self.role, {}).get(cap, False)


# ── Photographer profile ──────────────────────────────────────────────────────

class PhotographerProfile(Base):
    """Extended profile for users with role=PHOTOGRAPHER."""
    __tablename__ = "photographer_profiles"

    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name    = Column(String(255), nullable=False)
    bio             = Column(String(1000), default="")
    avatar          = Column(String(200), nullable=True)
    cover_image     = Column(String(200), nullable=True)
    website_url     = Column(String(200), default="")
    instagram_url   = Column(String(200), default="")
    years_exp       = Column(Integer, default=0)
    base_city       = Column(String(100), default="")
    specializations = Column(String(500), default="")   # comma-separated: wedding,portrait
    starting_price  = Column(Integer, nullable=True)     # in INR
    storage_used_mb = Column(Integer, default=0)
    total_uploads   = Column(Integer, default=0)
    total_events    = Column(Integer, default=0)
    rating          = Column(Integer, default=0)         # 0–50 (×10 for 1 decimal)
    is_verified     = Column(Boolean, default=False)
    is_available    = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    user        = relationship("User", back_populates="photographer_profile")
    assignments = relationship("PhotographerAssignment", back_populates="photographer", cascade="all, delete-orphan")


class PhotographerAssignment(Base):
    """Assigns a photographer to an event."""
    __tablename__ = "photographer_assignments"
    __table_args__ = (
        UniqueConstraint("photographer_id", "event_type", "event_id", name="uq_photographer_event"),
    )

    id               = Column(Integer, primary_key=True)
    photographer_id  = Column(Integer, ForeignKey("photographer_profiles.id", ondelete="CASCADE"), nullable=False)
    event_type       = Column(String(20), nullable=False)   # WEDDING / BIRTHDAY
    event_id         = Column(Integer,   nullable=False)
    assigned_by_id   = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    status           = Column(String(15), default="PENDING")  # PENDING / ACCEPTED / DECLINED
    notes            = Column(String(500), default="")
    shoot_date       = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    photographer = relationship("PhotographerProfile", back_populates="assignments")
    assigned_by  = relationship("User", foreign_keys=[assigned_by_id])
