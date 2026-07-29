from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.base import get_db
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"})
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # "tv" (token_version) lets logout/password-change revoke every
    # previously-issued token at once. Tokens minted before this claim
    # existed have no "tv" — treated as version 0 so they still work.
    token_version = payload.get("tv", 0)
    if token_version != (user.token_version or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Session has been revoked — please log in again",
                            headers={"WWW-Authenticate": "Bearer"})
    return user


async def get_current_user_optional(
    token: str = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)),
    db: AsyncSession = Depends(get_db),
):
    """Returns user or None — for endpoints that work with or without auth."""
    if not token:
        return None
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None


def require_role(*roles: str):
    async def checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"Requires role: {', '.join(roles)}")
        return current_user
    return checker
