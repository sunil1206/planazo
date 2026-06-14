from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CoupleWebsiteViewSet, PublicInviteView

router = DefaultRouter()
router.register(r"", CoupleWebsiteViewSet, basename="invitation")

public_router = DefaultRouter()
public_router.register(r"invite", PublicInviteView, basename="public-invite")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(public_router.urls)),
]
