from __future__ import annotations
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class BirthdayEventBase(BaseModel):
    title: str
    image: Optional[str] = None
    date: Optional[datetime] = None
    time: str = ""
    desc: str = ""
    location_name: str = ""
    location_link: Optional[str] = None
    order: int = 0


class BirthdayEventRead(BirthdayEventBase):
    id: int
    model_config = {"from_attributes": True}


class BirthdayStoryBase(BaseModel):
    title: str
    image: Optional[str] = None
    date: Optional[datetime] = None
    desc: str = ""
    order: int = 0


class BirthdayStoryRead(BirthdayStoryBase):
    id: int
    model_config = {"from_attributes": True}


class BirthdayWishCreate(BaseModel):
    name: str
    relationship: str = ""
    image: Optional[str] = None
    message: str


class BirthdayWishRead(BirthdayWishCreate):
    id: int
    verified: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class BirthdayRSVPCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    attendance: str = "YES"
    guests: int = 1
    meal_preference: str = ""
    message: str = ""


class BirthdayRSVPRead(BirthdayRSVPCreate):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class BirthdayCountdownBase(BaseModel):
    heading: str = "Countdown to the Big Day!"
    event_date: datetime
    background_image: Optional[str] = None


class BirthdayCountdownRead(BirthdayCountdownBase):
    id: int
    model_config = {"from_attributes": True}


class BirthdayPageCreate(BaseModel):
    title: str
    honoree_name: str
    slug: str
    theme: str = "classic"
    theme_color: str = "#FF6B6B"
    bio: str = ""


class BirthdayPageUpdate(BaseModel):
    title: Optional[str] = None
    honoree_name: Optional[str] = None
    honoree_image: Optional[str] = None
    cover_image: Optional[str] = None
    theme: Optional[str] = None
    theme_color: Optional[str] = None
    bio: Optional[str] = None
    is_published: Optional[bool] = None


class BirthdayPageRead(BaseModel):
    id: int
    title: str
    honoree_name: str
    honoree_image: Optional[str] = None
    cover_image: Optional[str] = None
    theme: str
    theme_color: str
    bio: str
    slug: str
    is_published: bool
    views: int
    created_at: datetime
    model_config = {"from_attributes": True}


class BirthdayPageDetail(BirthdayPageRead):
    events: List[BirthdayEventRead] = []
    stories: List[BirthdayStoryRead] = []
    wishes: List[BirthdayWishRead] = []
    countdown: Optional[BirthdayCountdownRead] = None
