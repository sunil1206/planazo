"""
Auth router — mirrors backend/apps/account/views.py exactly.

Endpoints:
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/google
  POST /api/auth/token/refresh
  GET  /api/auth/me
  PUT  /api/auth/me
  POST /api/auth/send-otp
  POST /api/auth/verify-otp
  POST /api/auth/forgot-password
  POST /api/auth/reset-password
  POST /api/auth/change-password
  POST /api/auth/logout
"""
import json
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.models.user import User
from app.core.security import (
    verify_password, hash_password, needs_rehash,
    create_access_token, create_refresh_token, decode_token, token_response,
)
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.schemas.user import (
    RegisterRequest, LoginRequest, GoogleAuthRequest,
    SendOtpRequest, VerifyOtpRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
    UserPublic, UserUpdate, TokenResponse, RefreshRequest,
    AccessTokenResponse, MessageResponse,
)

import redis.asyncio as aioredis
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Redis helpers ─────────────────────────────────────────────────────────────

async def get_redis():
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield r
    finally:
        await r.aclose()


OTP_TTL = 300        # 5 minutes
RESET_TTL = 3600     # 1 hour


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        role=body.role.upper(),
        password=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return token_response(user)


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account is disabled")

    # Upgrade hash from PBKDF2 → bcrypt on first login after migration
    if needs_rehash(user.password):
        user.password = hash_password(body.password)
        await db.commit()

    return token_response(user)


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(
            body.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(401, f"Invalid Google token: {exc}")

    google_id = idinfo["sub"]
    email = idinfo.get("email", "")
    full_name = idinfo.get("name", "")

    # Look up by google_id first, then by email
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if user:
        if not user.google_id:
            user.google_id = google_id
            await db.commit()
    else:
        user = User(
            email=email,
            full_name=full_name,
            google_id=google_id,
            role=body.role.upper(),
            password="!",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return token_response(user)


# ── Token refresh ─────────────────────────────────────────────────────────────

@router.post("/token/refresh", response_model=AccessTokenResponse)
@limiter.limit("30/minute")
async def refresh_token(request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid or expired refresh token")

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")

    token_version = payload.get("tv", 0)
    if token_version != (user.token_version or 0):
        raise HTTPException(401, "Session has been revoked — please log in again")

    access = create_access_token(user.id, user.role, user.token_version or 0)
    return {"access": access}


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserPublic)
async def update_me(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(user, field, val)
    await db.commit()
    await db.refresh(user)
    return user


# ── OTP (email verification) ──────────────────────────────────────────────────

@router.post("/send-otp", response_model=MessageResponse)
@limiter.limit("3/minute")
async def send_otp(
    request: Request,
    body: SendOtpRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    import random, resend as resend_sdk
    result = await db.execute(select(User).where(User.email == body.email))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "No account with that email")

    otp = str(random.randint(100000, 999999))
    await redis.setex(f"otp:{body.email}", OTP_TTL, otp)

    resend_sdk.api_key = settings.RESEND_API_KEY
    resend_sdk.Emails.send({
        "from": settings.EMAIL_FROM,
        "to": [body.email],
        "subject": "Your OTP",
        "html": f"<p>Your OTP is <b>{otp}</b>. Valid for 5 minutes.</p>",
    })
    return {"detail": "OTP sent"}


@router.post("/verify-otp", response_model=MessageResponse)
@limiter.limit("10/minute")
async def verify_otp(request: Request, body: VerifyOtpRequest, redis=Depends(get_redis)):
    stored = await redis.get(f"otp:{body.email}")
    if not stored or stored != body.otp:
        raise HTTPException(400, "Invalid or expired OTP")
    await redis.delete(f"otp:{body.email}")
    return {"detail": "OTP verified"}


# ── Forgot / Reset password ───────────────────────────────────────────────────

@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    import resend as resend_sdk
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    # Always return 200 to avoid email enumeration
    if not user:
        return {"detail": "If the email exists, a reset link has been sent"}

    token = str(uuid.uuid4())
    await redis.setex(f"pwd_reset:{token}", RESET_TTL, body.email)

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    resend_sdk.api_key = settings.RESEND_API_KEY
    resend_sdk.Emails.send({
        "from": settings.EMAIL_FROM,
        "to": [body.email],
        "subject": "Reset your password",
        "html": f"<p><a href='{reset_url}'>Click here</a> to reset your password. Link expires in 1 hour.</p>",
    })
    return {"detail": "If the email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    email = await redis.get(f"pwd_reset:{body.token}")
    if not email:
        raise HTTPException(400, "Invalid or expired reset token")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    user.password = hash_password(body.new_password)
    user.token_version = (user.token_version or 0) + 1  # revoke any sessions from before the reset
    await db.commit()
    await redis.delete(f"pwd_reset:{body.token}")
    return {"detail": "Password reset successful"}


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.old_password, user.password):
        raise HTTPException(400, "Incorrect current password")
    user.password = hash_password(body.new_password)
    user.token_version = (user.token_version or 0) + 1  # revoke any other sessions
    await db.commit()
    return {"detail": "Password changed"}


# ── Logout (real revocation via token_version) ────────────────────────────────
# Bumping token_version invalidates every access + refresh token issued before
# this call, immediately — not just the one the client happens to send.

@router.post("/logout", response_model=MessageResponse)
async def logout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.token_version = (user.token_version or 0) + 1
    await db.commit()
    return {"detail": "Logged out"}
