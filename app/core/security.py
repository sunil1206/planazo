"""
JWT creation / verification and password hashing.

Password compat strategy:
  - Django stored PBKDF2-SHA256 hashes (scheme: "django_pbkdf2_sha256")
  - passlib supports this natively via passlib[django]
  - On first login after migration: verify with PBKDF2 → re-hash with bcrypt
  - After 90+ days: remove django_pbkdf2_sha256 from schemes
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Password hashing ──────────────────────────────────────────────────────────
# Supports both new bcrypt hashes AND legacy Django PBKDF2 hashes
pwd_context = CryptContext(
    schemes=["bcrypt", "django_pbkdf2_sha256"],
    deprecated="auto",
    bcrypt__rounds=12,
)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception as e:
        logger.warning("Password verify failed: %s", e)
        return False


def needs_rehash(hashed: str) -> bool:
    """True when a Django PBKDF2 hash should be upgraded to bcrypt."""
    return pwd_context.needs_update(hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


# ── JWT ───────────────────────────────────────────────────────────────────────
ALGORITHM = settings.JWT_ALGORITHM


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def create_access_token(user_id: int, role: str) -> str:
    expire = _now() + settings.access_token_expire
    payload = {
        "sub":  str(user_id),
        "role": role,
        "type": "access",
        "exp":  expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int, role: str) -> str:
    expire = _now() + settings.refresh_token_expire
    payload = {
        "sub":  str(user_id),
        "role": role,
        "type": "refresh",
        "exp":  expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def token_response(user) -> dict:
    """Build the standard { access, refresh, user } dict returned by auth endpoints."""
    from app.schemas.user import UserOut  # avoid circular
    return {
        "access":  create_access_token(user.id, user.role),
        "refresh": create_refresh_token(user.id, user.role),
        "user":    UserOut.model_validate(user).model_dump(),
    }
