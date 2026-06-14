"""DRF viewsets for vendors."""
from django.db.models import Count, Q
from rest_framework import filters, mixins, viewsets
from rest_framework.permissions import AllowAny

from apps.vendors.models import Vendor
from apps.vendors.serializers import VendorDetailSerializer, VendorListSerializer


class VendorViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    GET /api/marketplace/vendors/         — list active vendors
    GET /api/marketplace/vendors/<slug>/  — single vendor detail (includes their products)
    """
    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ["avg_rating", "review_count", "created_at"]
    ordering = ["-is_featured", "-avg_rating"]
    search_fields = ["business_name", "tagline", "city"]

    def get_queryset(self):
        return (
            Vendor.objects
            .filter(is_active=True)
            .annotate(
                product_count=Count(
                    "products", filter=Q(products__is_active=True), distinct=True
                )
            )
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VendorDetailSerializer
        return VendorListSerializer
