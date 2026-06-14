from __future__ import annotations
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, HttpUrl


# ── BrideGroom ───────────────────────────────────────────────────────────────

class BrideGroomBase(BaseModel):
    groom_name: str
    groom_description: str = ""
    groom_image: Optional[str] = None
    groom_instagram: Optional[str] = None
    bride_name: str
    bride_description: str = ""
    bride_image: Optional[str] = None
    bride_instagram: Optional[str] = None


class BrideGroomRead(BrideGroomBase):
    id: int
    model_config = {"from_attributes": True}


class BrideGroomUpsert(BrideGroomBase):
    pass


# ── Story ─────────────────────────────────────────────────────────────────────

class StoryBase(BaseModel):
    title: str
    image: Optional[str] = None
    date: Optional[datetime] = None
    desc: str = ""
    order: int = 0


class StoryRead(StoryBase):
    id: int
    model_config = {"from_attributes": True}


class StoryCreate(StoryBase):
    pass


class StoryUpdate(BaseModel):
    title: Optional[str] = None
    image: Optional[str] = None
    date: Optional[datetime] = None
    desc: Optional[str] = None
    order: Optional[int] = None


# ── Event ─────────────────────────────────────────────────────────────────────

class EventBase(BaseModel):
    title: str
    image: Optional[str] = None
    date: Optional[datetime] = None
    time: str = ""
    desc: str = ""
    location_name: str = ""
    location_link: Optional[str] = None
    order: int = 0


class EventRead(EventBase):
    id: int
    model_config = {"from_attributes": True}


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    image: Optional[str] = None
    date: Optional[datetime] = None
    time: Optional[str] = None
    desc: Optional[str] = None
    location_name: Optional[str] = None
    location_link: Optional[str] = None
    order: Optional[int] = None


# ── WeddingCountdown ──────────────────────────────────────────────────────────

class CountdownBase(BaseModel):
    heading: str = "We Are Getting Married!"
    event_date: datetime
    background_image: Optional[str] = None


class CountdownRead(CountdownBase):
    id: int
    model_config = {"from_attributes": True}


class CountdownUpsert(CountdownBase):
    pass


# ── RSVP ──────────────────────────────────────────────────────────────────────

class RSVPCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    attendance: str = "YES"
    guests: int = 1
    meal_preference: str = ""
    message: str = ""


class RSVPRead(RSVPCreate):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Wish ──────────────────────────────────────────────────────────────────────

class WishCreate(BaseModel):
    name: str
    relationship: str = ""
    image: Optional[str] = None
    message: str


class WishRead(WishCreate):
    id: int
    verified: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── WeddingGalleryPhoto ───────────────────────────────────────────────────────

class WeddingPhotoRead(BaseModel):
    id: int
    image: str
    thumbnail: Optional[str] = None
    tag: str
    caption: str
    uploader_name: str
    is_approved: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── WeddingVendor ─────────────────────────────────────────────────────────────

class WeddingVendorAdd(BaseModel):
    vendor_id: int
    service_note: str = ""
    order: int = 0


class WeddingVendorRead(WeddingVendorAdd):
    id: int
    model_config = {"from_attributes": True}


# ── CoupleWebsite ─────────────────────────────────────────────────────────────

class CoupleWebsiteCreate(BaseModel):
    couple: str
    bride_info: str = ""
    groom_info: str = ""
    theme: str = "modern_minimal"
    slug: str


class CoupleWebsiteUpdate(BaseModel):
    couple: Optional[str] = None
    bride_info: Optional[str] = None
    groom_info: Optional[str] = None
    theme: Optional[str] = None
    thumbnail: Optional[str] = None
    is_published: Optional[bool] = None


class CoupleWebsiteRead(BaseModel):
    id: int
    couple: str
    bride_info: str
    groom_info: str
    theme: str
    thumbnail: Optional[str]
    is_published: bool
    slug: str
    gallery_token: str
    views: int
    created_at: datetime
    model_config = {"from_attributes": True}


class CoupleWebsiteDetail(CoupleWebsiteRead):
    """Full website with nested sections."""
    bridegroom: Optional[BrideGroomRead] = None
    stories: List[StoryRead] = []
    events: List[EventRead] = []
    countdown: Optional[CountdownRead] = None
