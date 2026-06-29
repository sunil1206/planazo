from __future__ import annotations
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr


class GrantPermissionRequest(BaseModel):
    user_email: EmailStr
    role: str                           # one of EventRole.*
    # Optional fine-grained overrides
    can_upload:             Optional[bool] = None
    can_edit:               Optional[bool] = None
    can_delete:             Optional[bool] = None
    can_download:           Optional[bool] = None
    can_approve:            Optional[bool] = None
    can_publish:            Optional[bool] = None
    can_share:              Optional[bool] = None
    can_manage_permissions: Optional[bool] = None


class UpdatePermissionRequest(BaseModel):
    role:                   Optional[str]  = None
    can_upload:             Optional[bool] = None
    can_edit:               Optional[bool] = None
    can_delete:             Optional[bool] = None
    can_download:           Optional[bool] = None
    can_approve:            Optional[bool] = None
    can_publish:            Optional[bool] = None
    can_share:              Optional[bool] = None
    can_manage_permissions: Optional[bool] = None


class PermissionRead(BaseModel):
    id:                     int
    event_type:             str
    event_id:               int
    user_id:                int
    role:                   str
    can_upload:             Optional[bool]
    can_edit:               Optional[bool]
    can_delete:             Optional[bool]
    can_download:           Optional[bool]
    can_approve:            Optional[bool]
    can_publish:            Optional[bool]
    can_share:              Optional[bool]
    can_manage_permissions: Optional[bool]
    accepted_at:            Optional[datetime]
    created_at:             datetime
    model_config = {"from_attributes": True}


# ── Photographer schemas ──────────────────────────────────────────────────────

class PhotographerProfileCreate(BaseModel):
    display_name:    str
    bio:             str = ""
    website_url:     str = ""
    instagram_url:   str = ""
    years_exp:       int = 0
    base_city:       str = ""
    specializations: str = ""
    starting_price:  Optional[int] = None


class PhotographerProfileRead(PhotographerProfileCreate):
    id:            int
    user_id:       int
    avatar:        Optional[str] = None
    cover_image:   Optional[str] = None
    storage_used_mb: int
    total_uploads: int
    total_events:  int
    rating:        int
    is_verified:   bool
    is_available:  bool
    created_at:    datetime
    model_config = {"from_attributes": True}


class AssignPhotographerRequest(BaseModel):
    photographer_id: int
    event_type:      str   # WEDDING / BIRTHDAY
    event_id:        int
    notes:           str = ""
    shoot_date:      Optional[datetime] = None


class AssignmentRead(BaseModel):
    id:              int
    photographer_id: int
    event_type:      str
    event_id:        int
    status:          str
    notes:           str
    shoot_date:      Optional[datetime]
    created_at:      datetime
    model_config = {"from_attributes": True}
