from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, computed_field

EVENT_TYPES = ("wedding", "birthday", "custom")
CHECKLIST_STATUSES = ("PENDING", "IN_PROGRESS", "DONE")
CHECKLIST_PRIORITIES = ("LOW", "MEDIUM", "HIGH", "CRITICAL")
RSVP_STATUSES = ("PENDING", "ACCEPTED", "DECLINED")
VENDOR_BOOKING_STATUSES = ("ENQUIRED", "CONFIRMED", "CANCELLED", "COMPLETED")


# ── Unified events listing ───────────────────────────────────────────────────

class EventSummary(BaseModel):
    id: int
    title: str
    event_type: str
    event_date: Optional[datetime] = None
    cover_image: Optional[str] = None
    status: str
    location: Optional[str] = None

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    items: List[EventSummary]
    total: int
    page: int
    page_size: int
    pages: int


# ── Checklist ─────────────────────────────────────────────────────────────────

class ChecklistItemCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "General"
    status: Optional[str] = "PENDING"
    priority: Optional[str] = "MEDIUM"
    due_date: Optional[date] = None
    order: Optional[int] = 0


class ChecklistItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    order: Optional[int] = None


class ChecklistItemRead(BaseModel):
    id: int
    event_type: str
    event_id: int
    title: str
    description: str
    category: str
    status: str
    priority: str
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    order: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Budget ────────────────────────────────────────────────────────────────────

class BudgetItemCreate(BaseModel):
    category: str
    title: Optional[str] = ""
    planned_amount: float = Field(0, ge=0)
    spent_amount: float = Field(0, ge=0)
    notes: Optional[str] = ""


class BudgetItemUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    planned_amount: Optional[float] = Field(None, ge=0)
    spent_amount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class BudgetItemRead(BaseModel):
    id: int
    event_type: str
    event_id: int
    category: str
    title: str
    planned_amount: float
    spent_amount: float
    notes: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def remaining(self) -> float:
        return float(self.planned_amount or 0) - float(self.spent_amount or 0)


# ── Guests ────────────────────────────────────────────────────────────────────

class GuestCreate(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    family: Optional[str] = ""
    side: Optional[str] = ""
    plus_one: Optional[bool] = False
    meal_preference: Optional[str] = ""
    rsvp: Optional[str] = "PENDING"
    notes: Optional[str] = ""


class GuestUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    family: Optional[str] = None
    side: Optional[str] = None
    plus_one: Optional[bool] = None
    meal_preference: Optional[str] = None
    rsvp: Optional[str] = None
    notes: Optional[str] = None


class GuestRead(BaseModel):
    id: int
    event_type: str
    event_id: int
    name: str
    phone: str
    email: str
    family: str
    side: str
    plus_one: bool
    meal_preference: str
    rsvp: str
    notes: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GuestSummary(BaseModel):
    total: int
    accepted: int
    declined: int
    pending: int


# ── Vendor bookings ───────────────────────────────────────────────────────────

class VendorBookingCreate(BaseModel):
    vendor_id: Optional[int] = None
    vendor_name: str
    category: Optional[str] = ""
    booking_status: Optional[str] = "ENQUIRED"
    price: float = Field(0, ge=0)
    advance_paid: float = Field(0, ge=0)
    notes: Optional[str] = ""


class VendorBookingUpdate(BaseModel):
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    category: Optional[str] = None
    booking_status: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    advance_paid: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class VendorBookingRead(BaseModel):
    id: int
    event_type: str
    event_id: int
    vendor_id: Optional[int] = None
    vendor_name: str
    category: str
    booking_status: str
    price: float
    advance_paid: float
    notes: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def remaining(self) -> float:
        return float(self.price or 0) - float(self.advance_paid or 0)


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_tasks: int
    completed_tasks: int
    completion_percentage: float
    budget_used: float
    budget_total: float
    budget_remaining: float
    guest_count: int
    accepted_guests: int
    pending_guests: int
    declined_guests: int
    vendor_count: int
    confirmed_vendors: int


class PlanningDashboard(BaseModel):
    event: EventSummary
    stats: DashboardStats


# ── Vendor search (Find Vendors) ─────────────────────────────────────────────

class VendorSearchResult(BaseModel):
    id: int
    slug: str
    title: str
    category: str
    city: str
    thumbnail: Optional[str] = None
    theme_color: str
    is_verified: bool

    model_config = {"from_attributes": True}


class VendorSearchResponse(BaseModel):
    items: List[VendorSearchResult]
    total: int
    page: int
    page_size: int
    pages: int
