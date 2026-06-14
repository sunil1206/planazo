from __future__ import annotations
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel


class GalleryCategoryRead(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class GalleryImageRead(BaseModel):
    id: int
    website_id: int
    category_id: Optional[int] = None
    gallery_type: str
    title: str
    picture: str
    thumb_small: Optional[str] = None
    thumb_medium: Optional[str] = None
    download_count: int
    slug: str
    created_at: datetime
    model_config = {"from_attributes": True}


class GalleryImageUpload(BaseModel):
    title: str = ""
    gallery_type: str = "INVITATION"
    category_id: Optional[int] = None


class SelfieMatchCreate(BaseModel):
    gallery_token: str           # identifies the couple website
    # selfie file is sent as multipart — only metadata here


class SelfieMatchRead(BaseModel):
    id: int
    status: str
    matched_images: List[GalleryImageRead] = []
    error: str
    created_at: datetime
    model_config = {"from_attributes": True}
