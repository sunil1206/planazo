from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BirthdayPageViewSet,
    PublicBirthdayView,
    PublicBirthdayWishView,
    PublicBirthdayRSVPView,
)

router = DefaultRouter()
router.register("pages", BirthdayPageViewSet, basename="birthday-page")

urlpatterns = [
    path("", include(router.urls)),
    # Public endpoints
    path("public/<slug:slug>/",      PublicBirthdayView.as_view(),     name="public-birthday"),
    path("public/<slug:slug>/wish/", PublicBirthdayWishView.as_view(), name="public-birthday-wish"),
    path("public/<slug:slug>/rsvp/", PublicBirthdayRSVPView.as_view(), name="public-birthday-rsvp"),
]
