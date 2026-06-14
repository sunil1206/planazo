from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Import custom admin sites & model registrations
import core.staff_admin  # noqa: F401 — triggers side-effects
from core.admin_sites import vendor_admin_site, gift_admin_site, wedding_admin_site

urlpatterns = [
    # ── Default Django admin (superuser only) ─────────────────────────────────
    path("admin/",         admin.site.urls),

    # ── Staff-scoped admin panels ─────────────────────────────────────────────
    path("vendor-admin/",  vendor_admin_site.urls),
    path("gift-admin/",    gift_admin_site.urls),
    path("wedding-admin/", wedding_admin_site.urls),

    # ── Auth endpoints ────────────────────────────────────────────────────────
    path("api/auth/", include("apps.account.urls")),

    # ── App endpoints ─────────────────────────────────────────────────────────
    path("api/invitations/", include("apps.invitation.urls")),
    path("api/gallery/",     include("apps.gallery.urls")),
    path("api/vendors/",     include("apps.vendor.urls")),
    path("api/payment/",     include("apps.payment.urls")),
    path("api/gifts/",       include("apps.gift.urls")),
    path("api/birthday/",    include("apps.birthday.urls")),

    # ── Prometheus metrics ────────────────────────────────────────────────────
    path("", include("django_prometheus.urls")),

    # ── Allauth (social login UI — used internally) ───────────────────────────
    path("accounts/", include("allauth.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
