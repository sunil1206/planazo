from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, model_validator
import re


# ── Enums / literals ─────────────────────────────────────────────────────────
ROLE_CHOICES = {"COUPLE", "VENDOR", "ADMIN"}


# ── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "COUPLE"

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        v = v.upper()
        if v not in ROLE_CHOICES:
            raise ValueError(f"role must be one of {ROLE_CHOICES}")
        return v

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    token: str                  # Google ID token
    role: str = "COUPLE"

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        v = v.upper()
        if v not in ROLE_CHOICES:
            raise ValueError(f"role must be one of {ROLE_CHOICES}")
        return v


class SendOtpRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── User read schemas ─────────────────────────────────────────────────────────

class UserBase(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_staff: bool

    model_config = {"from_attributes": True}


class UserPublic(UserBase):
    """Returned in token responses and /me."""
    pass


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Token response ────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access: str
    refresh: str
    user: UserPublic


class RefreshRequest(BaseModel):
    refresh: str


class AccessTokenResponse(BaseModel):
    access: str


class MessageResponse(BaseModel):
    detail: str
