"""
Custom Events — lightweight planner for travel, festivals, vacations, meetups,
and everyday occasions. Deliberately much simpler than the Wedding module:
one parent event plus a handful of small child tables (checklist, budget,
notes, gallery, files, members), all cascade-deleted with the parent.
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class CustomEvent(Base):
    __tablename__ = "custom_events"

    id          = Column(Integer, primary_key=True, index=True)
    owner_id    = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False, index=True)
    title       = Column(String(255), nullable=False)
    # Free text — one of the suggested EVENT_TYPES (see schemas) or a user's own custom type.
    event_type  = Column(String(100), nullable=False, default="Other")
    description = Column(Text, default="")
    location    = Column(String(255), default="")
    start_date  = Column(DateTime(timezone=True), nullable=True)
    end_date    = Column(DateTime(timezone=True), nullable=True)
    cover_image = Column(String(200), nullable=True)
    color_theme = Column(String(20), default="#7c3aed")
    visibility  = Column(String(20), default="PRIVATE")   # PRIVATE / SHARED / PUBLIC
    status      = Column(String(20), default="PLANNING")  # PLANNING / UPCOMING / ONGOING / COMPLETED / CANCELLED
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    owner     = relationship("User", back_populates="custom_events")
    checklist = relationship("ChecklistItem", back_populates="event", cascade="all, delete-orphan", order_by="ChecklistItem.order")
    budget    = relationship("BudgetItem",    back_populates="event", cascade="all, delete-orphan")
    notes     = relationship("EventNote",     back_populates="event", cascade="all, delete-orphan")
    gallery   = relationship("EventGallery",  back_populates="event", cascade="all, delete-orphan")
    files     = relationship("EventFile",     back_populates="event", cascade="all, delete-orphan")
    members   = relationship("EventMember",   back_populates="event", cascade="all, delete-orphan")


class ChecklistItem(Base):
    __tablename__ = "custom_event_checklist_items"

    id         = Column(Integer, primary_key=True)
    event_id   = Column(Integer, ForeignKey("custom_events.id", ondelete="CASCADE"), nullable=False, index=True)
    task       = Column(String(500), nullable=False)
    completed  = Column(Boolean, default=False)
    priority   = Column(String(10), default="MEDIUM")  # LOW / MEDIUM / HIGH
    due_date   = Column(DateTime(timezone=True), nullable=True)
    order      = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("CustomEvent", back_populates="checklist")


class BudgetItem(Base):
    __tablename__ = "custom_event_budget_items"

    id         = Column(Integer, primary_key=True)
    event_id   = Column(Integer, ForeignKey("custom_events.id", ondelete="CASCADE"), nullable=False, index=True)
    category   = Column(String(150), nullable=False)
    estimated  = Column(Numeric(12, 2), default=0)
    spent      = Column(Numeric(12, 2), default=0)
    notes      = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("CustomEvent", back_populates="budget")


class EventNote(Base):
    __tablename__ = "custom_event_notes"

    id         = Column(Integer, primary_key=True)
    event_id   = Column(Integer, ForeignKey("custom_events.id", ondelete="CASCADE"), nullable=False, index=True)
    title      = Column(String(255), default="Untitled Note")
    content    = Column(Text, default="")  # markdown
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    event = relationship("CustomEvent", back_populates="notes")


class EventGallery(Base):
    __tablename__ = "custom_event_gallery"

    id          = Column(Integer, primary_key=True)
    event_id    = Column(Integer, ForeignKey("custom_events.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url    = Column(String(500), nullable=False)
    media_type  = Column(String(10), default="image")  # image / video
    caption     = Column(String(255), default="")
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("CustomEvent", back_populates="gallery")


class EventFile(Base):
    __tablename__ = "custom_event_files"

    id          = Column(Integer, primary_key=True)
    event_id    = Column(Integer, ForeignKey("custom_events.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url    = Column(String(500), nullable=False)
    file_name   = Column(String(255), nullable=False)
    # pdf / ticket / receipt / passport / booking / other
    file_type   = Column(String(50), default="other")
    size_kb     = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("CustomEvent", back_populates="files")


class EventMember(Base):
    __tablename__ = "custom_event_members"

    id         = Column(Integer, primary_key=True)
    event_id   = Column(Integer, ForeignKey("custom_events.id", ondelete="CASCADE"), nullable=False, index=True)
    name       = Column(String(255), nullable=False)
    email      = Column(String(254), nullable=False)
    role       = Column(String(20), default="VIEWER")    # OWNER / ORGANIZER / VIEWER
    status     = Column(String(20), default="INVITED")   # INVITED / ACCEPTED / DECLINED
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("CustomEvent", back_populates="members")
