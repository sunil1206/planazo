from __future__ import annotations
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel

# Suggested types shown in the "New Event" picker — users can also type their own.
EVENT_TYPES = [
    "Travel", "Vacation", "Festival", "Road Trip", "College Event", "Family Function",
    "Housewarming", "Meetup", "Reunion", "Picnic", "Office Event", "Workshop",
    "Conference", "Exhibition", "Concert", "Religious Event", "Sports Event",
    "Charity Event", "Personal Project", "Celebration", "Anniversary", "Engagement",
    "Baby Shower", "Graduation", "Farewell", "Other",
]


# ── CustomEvent ─────────────────────────────────────────────────────────────────

class CustomEventCreate(BaseModel):
    title: str
    event_type: str = "Other"
    description: str = ""
    location: str = ""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    cover_image: Optional[str] = None
    color_theme: str = "#7c3aed"
    visibility: str = "PRIVATE"
    status: str = "PLANNING"


class CustomEventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    cover_image: Optional[str] = None
    color_theme: Optional[str] = None
    visibility: Optional[str] = None
    status: Optional[str] = None


class CustomEventRead(BaseModel):
    id: int
    title: str
    event_type: str
    description: str
    location: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    cover_image: Optional[str] = None
    color_theme: str
    visibility: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Checklist ────────────────────────────────────────────────────────────────────

class ChecklistItemCreate(BaseModel):
    task: str
    priority: str = "MEDIUM"
    due_date: Optional[datetime] = None
    order: int = 0


class ChecklistItemUpdate(BaseModel):
    task: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    order: Optional[int] = None


class ChecklistItemRead(BaseModel):
    id: int
    task: str
    completed: bool
    priority: str
    due_date: Optional[datetime] = None
    order: int
    model_config = {"from_attributes": True}


# ── Budget ────────────────────────────────────────────────────────────────────────

class BudgetItemCreate(BaseModel):
    category: str
    estimated: Decimal = Decimal("0")
    spent: Decimal = Decimal("0")
    notes: str = ""


class BudgetItemUpdate(BaseModel):
    category: Optional[str] = None
    estimated: Optional[Decimal] = None
    spent: Optional[Decimal] = None
    notes: Optional[str] = None


class BudgetItemRead(BaseModel):
    id: int
    category: str
    estimated: Decimal
    spent: Decimal
    notes: str
    model_config = {"from_attributes": True}


# ── Notes ─────────────────────────────────────────────────────────────────────────

class EventNoteCreate(BaseModel):
    title: str = "Untitled Note"
    content: str = ""


class EventNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class EventNoteRead(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Gallery ───────────────────────────────────────────────────────────────────────

class EventGalleryCreate(BaseModel):
    file_url: str
    media_type: str = "image"
    caption: str = ""


class EventGalleryRead(BaseModel):
    id: int
    file_url: str
    media_type: str
    caption: str
    uploaded_at: datetime
    model_config = {"from_attributes": True}


# ── Files ─────────────────────────────────────────────────────────────────────────

class EventFileCreate(BaseModel):
    file_url: str
    file_name: str
    file_type: str = "other"
    size_kb: Optional[int] = None


class EventFileRead(BaseModel):
    id: int
    file_url: str
    file_name: str
    file_type: str
    size_kb: Optional[int] = None
    uploaded_at: datetime
    model_config = {"from_attributes": True}


# ── Members ───────────────────────────────────────────────────────────────────────

class EventMemberCreate(BaseModel):
    name: str
    email: str
    role: str = "VIEWER"


class EventMemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


class EventMemberRead(BaseModel):
    id: int
    name: str
    email: str
    role: str
    status: str
    model_config = {"from_attributes": True}


# ── Dashboard summary ─────────────────────────────────────────────────────────────

class ChecklistSummary(BaseModel):
    completed: int
    total: int


class BudgetSummary(BaseModel):
    estimated: float
    spent: float
    remaining: float


class DashboardSummary(BaseModel):
    progress: int
    days_remaining: Optional[int] = None
    checklist: ChecklistSummary
    budget: BudgetSummary
    gallery_count: int
    files: int
    members: int


class CustomEventDashboard(BaseModel):
    event: CustomEventRead
    summary: DashboardSummary
