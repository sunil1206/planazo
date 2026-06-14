from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.marketplace.views import BannerViewSet, marketplace_summary

router = DefaultRouter()
router.register(r"banners", BannerViewSet, basename="marketplace-banner")

urlpatterns = [
    path("summary/", marketplace_summary, name="marketplace-summary"),
] + router.urls
