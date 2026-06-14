"""URL routes for the products app."""
from rest_framework.routers import DefaultRouter

from apps.products.views import CategoryViewSet, ProductViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="marketplace-category")
router.register(r"products", ProductViewSet, basename="marketplace-product")

urlpatterns = router.urls
