"""
Planning Suite models — Checklist, Budget, Guest List, Vendor Bookings.

Planning Suite is deliberately NOT tied to a single event table. Wedding
(``couple_websites``), Birthday (``birthday_birthdaypage``) and Custom Events
(``custom_events``) are three separate, already-existing tables — there is no
single ``events`` table that spans all of them.

Rather than forcing a schema migration on those three modules (which would
risk breaking the Wedding/Birthday flows explicitly called out as
off-limits), every Planning Suite row carries a lightweight polymorphic
reference:

    event_type  — one of EVENT_TYPES ("wedding" | "birthday" | "custom")
    event_id    — the primary key row in the corresponding table

This is resolved/validated by app/dependencies/planning_deps.py on every
request (ownership is re-checked against the *actual* owning table each
time — event_type/event_id are never trusted blindly). ``owner_id`` is
denormalized onto each row at creation time purely as a fast filter/index
for "give me everything this user owns" queries; the source of truth for
ownership is always the resolved event row.
"""
from __future__ import annotations

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey,
    Numeric, Date, CheckConstraint, Index
)
from sqlalchemy.sql import func
from app.database.base import Base

EVENT_TYPES = ("wedding", "birthday", "custom")

_EVENT_TYPE_CHECK = "event_type IN ('wedding','birthday','custom')"


class PlanningChecklistItem(Base):
    """Planning Suite checklist task — distinct from app.models.custom_event.ChecklistItem
    (that one is embedded in the lightweight Custom Events dashboard). This one is the
    cross-event-type checklist used by the global Planning Suite."""
    __tablename__ = "planning_checklist_items"
    __table_args__ = (
        CheckConstraint(_EVENT_TYPE_CHECK, name="ck_planning_checklist_event_type"),
        Index("ix_planning_checklist_event", "event_type", "event_id"),
    )

    id             = Column(Integer, primary_key=True, index=True)
    owner_id       = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type     = Column(String(20), nullable=False)
    event_id       = Column(Integer, nullable=False)
    title          = Column(String(255), nullable=False)
    description    = Column(Text, default="")
    category       = Column(String(50), default="General")
    status         = Column(String(20), default="PENDING")     # PENDING | IN_PROGRESS | DONE
    priority       = Column(String(20), default="MEDIUM")      # LOW | MEDIUM | HIGH | CRITICAL
    due_date       = Column(Date, nullable=True)
    completed_at   = Column(DateTime(timezone=True), nullable=True)
    order          = Column(Integer, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())


class PlanningBudgetItem(Base):
    """Planning Suite budget line — distinct from app.models.custom_event.BudgetItem."""
    __tablename__ = "planning_budget_items"
    __table_args__ = (
        CheckConstraint(_EVENT_TYPE_CHECK, name="ck_planning_budget_event_type"),
        Index("ix_planning_budget_event", "event_type", "event_id"),
    )

    id              = Column(Integer, primary_key=True, index=True)
    owner_id        = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type      = Column(String(20), nullable=False)
    event_id        = Column(Integer, nullable=False)
    category        = Column(String(100), nullable=False)
    title           = Column(String(255), default="")
    planned_amount  = Column(Numeric(12, 2), nullable=False, default=0)
    spent_amount    = Column(Numeric(12, 2), nullable=False, default=0)
    notes           = Column(Text, default="")
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())


class Guest(Base):
    __tablename__ = "planning_guests"
    __table_args__ = (
        CheckConstraint(_EVENT_TYPE_CHECK, name="ck_planning_guest_event_type"),
        CheckConstraint("rsvp IN ('PENDING','ACCEPTED','DECLINED')", name="ck_planning_guest_rsvp"),
        Index("ix_planning_guest_event", "event_type", "event_id"),
    )

    id              = Column(Integer, primary_key=True, index=True)
    owner_id        = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type      = Column(String(20), nullable=False)
    event_id        = Column(Integer, nullable=False)
    name            = Column(String(255), nullable=False)
    phone           = Column(String(20), default="")
    email           = Column(String(254), default="")
    family          = Column(String(100), default="")
    side            = Column(String(30), default="")          # e.g. bride/groom/host/mutual — free text
    plus_one        = Column(Boolean, default=False)
    meal_preference = Column(String(50), default="")
    rsvp            = Column(String(20), default="PENDING")   # PENDING | ACCEPTED | DECLINED
    notes           = Column(Text, default="")
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())


class VendorBooking(Base):
    __tablename__ = "planning_vendor_bookings"
    __table_args__ = (
        CheckConstraint(_EVENT_TYPE_CHECK, name="ck_planning_vendorbooking_event_type"),
        Index("ix_planning_vendorbooking_event", "event_type", "event_id"),
    )

    id             = Column(Integer, primary_key=True, index=True)
    owner_id       = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type     = Column(String(20), nullable=False)
    event_id       = Column(Integer, nullable=False)
    # Optional link into the real vendor marketplace — nullable because a user
    # can also book a vendor who isn't listed on Planazo yet (vendor_name covers that case).
    vendor_id      = Column(Integer, ForeignKey("vendor_websites.id", ondelete="SET NULL"), nullable=True, index=True)
    vendor_name    = Column(String(255), nullable=False)
    category       = Column(String(50), default="")
    booking_status = Column(String(20), default="ENQUIRED")   # ENQUIRED | CONFIRMED | CANCELLED | COMPLETED
    price          = Column(Numeric(12, 2), nullable=False, default=0)
    advance_paid   = Column(Numeric(12, 2), nullable=False, default=0)
    notes          = Column(Text, default="")
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def remaining(self) -> float:
        return float(self.price or 0) - float(self.advance_paid or 0)
