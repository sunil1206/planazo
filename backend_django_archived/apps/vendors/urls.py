from rest_framework.routers import DefaultRouter

from apps.vendors.views import VendorViewSet

router = DefaultRouter()
router.register(r"vendors", VendorViewSet, basename="marketplace-vendor")

urlpatterns = router.urls
