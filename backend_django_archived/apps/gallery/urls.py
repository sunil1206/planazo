from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GalleryCategoryViewSet, GalleryImageViewSet, PublicGalleryView,
    PublicGalleryByWebsiteView, SelfieMatchViewSet
)

router = DefaultRouter()
router.register(r"categories", GalleryCategoryViewSet, basename="gallery-category")
router.register(r"images",     GalleryImageViewSet,    basename="gallery-image")
router.register(r"selfie",     SelfieMatchViewSet,     basename="selfie-match")

urlpatterns = [
    path("", include(router.urls)),
    # Public gallery for a specific wedding by slug
    path("public/<slug:slug>/", PublicGalleryView.as_view({"get": "list"}), name="public-gallery"),
    # Public gallery images by website ID (no auth)
    path("images/by-website/", PublicGalleryByWebsiteView.as_view({"get": "list"}), name="gallery-by-website"),
]
