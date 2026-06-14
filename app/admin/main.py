"""
Three SQLAdmin instances, one per original Django admin site.
Authentication is done via AdminAuth (session-based, separate from JWT).
"""
from sqladmin import Admin
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.core.config import settings
from app.core.security import verify_password
from app.database.base import engine

# ── Auth backend ──────────────────────────────────────────────────────────────

class PlanazoAdminAuth(AuthenticationBackend):
    """Shared session-based auth for all admin sites.
    User must be ADMIN role (or superuser) to access.
    """

    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get("username", "")
        password = form.get("password", "")

        # Import here to avoid circular import at module load
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.database.base import AsyncSessionLocal
        from app.models.user import User

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.email == email)
            )
            user = result.scalar_one_or_none()

        if not user:
            return False
        if not verify_password(password, user.password):
            return False
        if not (user.is_superuser or user.role == "ADMIN"):
            return False

        request.session.update({"admin_user": user.id, "admin_role": user.role})
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return "admin_user" in request.session


# ── Three Admin instances ─────────────────────────────────────────────────────

_auth = PlanazoAdminAuth(secret_key=settings.SECRET_KEY)

# Main wedding admin — mounts at /admin
admin = Admin(
    engine=engine,
    title="Planazo Admin",
    base_url="/admin",
    authentication_backend=_auth,
)

# Vendor admin — mounts at /vendor-admin
vendor_admin = Admin(
    engine=engine,
    title="Vendor Admin",
    base_url="/vendor-admin",
    authentication_backend=_auth,
)

# Gift admin — mounts at /gift-admin
gift_admin = Admin(
    engine=engine,
    title="Gift Admin",
    base_url="/gift-admin",
    authentication_backend=_auth,
)
