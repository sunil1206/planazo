from __future__ import annotations
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


# ── Album ─────────────────────────────────────────────────────────────────────

class GalleryAlbumCreate(BaseModel):
    name:        str
    description: str = ""
    order:       int = 0
    privacy:     str = "PUBLIC"   # PUBLIC / FAMILY / PRIVATE


class GalleryAlbumUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    order:       Optional[int] = None
    privacy:     Optional[str] = None
    is_published:Optional[bool]= None


class GalleryAlbumRead(GalleryAlbumCreate):
    id:           int
    website_id:   int
    cover_image:  Optional[str] = None
    is_published: bool
    created_at:   datetime
    model_config = {"from_attributes": True}


# ── Gallery Image (v2 read includes new fields) ───────────────────────────────

class GalleryImageV2Read(BaseModel):
    id:              int
    website_id:      int
    album_id:        Optional[int] = None
    media_type:      str
    gallery_type:    str
    title:           str
    caption:         str
    cdn_url:         Optional[str]
    picture:         str
    thumb_small:     Optional[str]
    thumb_medium:    Optional[str]
    thumb_webp:      Optional[str]
    watermarked_url: Optional[str]
    file_size_kb:    Optional[int]
    width:           Optional[int]
    height:          Optional[int]
    duration_sec:    Optional[int]
    ai_tags:         Optional[list] = []
    ai_scene:        Optional[str]
    ai_quality_score:Optional[int]
    ai_is_duplicate: bool
    ai_is_blurry:    bool
    ai_processed:    bool
    is_approved:     bool
    is_featured:     bool
    is_pinned:       bool
    is_highlighted:  bool
    is_hidden:       bool
    privacy:         str
    download_count:  int
    likes_count:     int
    comments_count:  int
    slug:            str
    uploaded_by_id:  Optional[int]
    created_at:      datetime
    model_config = {"from_attributes": True}


class GalleryImageApprovalUpdate(BaseModel):
    is_approved:   Optional[bool] = None
    is_featured:   Optional[bool] = None
    is_pinned:     Optional[bool] = None
    is_highlighted:Optional[bool] = None
    is_hidden:     Optional[bool] = None
    privacy:       Optional[str]  = None
    album_id:      Optional[int]  = None
    caption:       Optional[str]  = None


# ── Presigned upload ──────────────────────────────────────────────────────────

class PresignedUploadRequest(BaseModel):
    filename:     str
    content_type: str
    folder:       str = "gallery"   # gallery / covers / avatars


class PresignedUploadResponse(BaseModel):
    upload_url: str
    cdn_url:    str
    key:        str


# ── Like / Comment ────────────────────────────────────────────────────────────

class LikeCreate(BaseModel):
    guest_name: str = ""


class LikeRead(BaseModel):
    id:         int
    image_id:   int
    user_id:    Optional[int]
    guest_name: str
    created_at: datetime
    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    text:       str
    guest_name: str = ""


class CommentRead(BaseModel):
    id:         int
    image_id:   int
    user_id:    Optional[int]
    guest_name: str
    text:       str
    is_approved:bool
    created_at: datetime
    model_config = {"from_attributes": True}
