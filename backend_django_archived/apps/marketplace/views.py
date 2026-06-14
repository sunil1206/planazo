"""Marketplace endpoints — banners, summary, search across products/vendors."""
from django.utils import timezone
from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.marketplace.models import Banner
from apps.marketplace.serializers import BannerSerializer


class BannerViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    GET /api/marketplace/banners/?placement=HOME_HERO
    Returns only banners that are currently within their scheduled window.
    """
    serializer_class = BannerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        now = timezone.now()
        qs = Banner.objects.filter(is_active=True)
        placement = self.request.query_params.get("placement")
        if placement:
            qs = qs.filter(placement=placement.upper())
        # Only banners within their schedule window (or no window set)
        qs = qs.filter(Q(start_at__isnull=True) | Q(start_at__lte=now))
        qs = qs.filter(Q(end_at__isnull=True) | Q(end_at__gte=now))
        return qs.order_by("priority", "-created_at")


@api_view(["GET"])
@permission_classes([AllowAny])
def marketplace_summary(request):
    """
    GET /api/marketplace/summary/
    Returns counts and featured content for the marketplace home page.
    """
    from apps.products.models import Category, Product
    from apps.vendors.models import Vendor
    from apps.products.serializers import ProductListSerializer, CategorySerializer
    from apps.vendors.serializers import VendorListSerializer

    featured_products = (
        Product.objects.filter(is_active=True, is_featured=True)
        .select_related("vendor", "category")
        .prefetch_related("images")[:8]
    )
    featured_vendors = Vendor.objects.filter(is_active=True, is_featured=True)[:8]
    categories = Category.objects.filter(is_active=True).order_by("sort_order")[:12]

    return Response({
        "totals": {
            "products": Product.objects.filter(is_active=True).count(),
            "vendors": Vendor.objects.filter(is_active=True).count(),
            "categories": categories.count(),
        },
        "featured_products": ProductListSerializer(
            featured_products, many=True, context={"request": request}
        ).data,
        "featured_vendors": VendorListSerializer(
            featured_vendors, many=True, context={"request": request}
        ).data,
        "categories": CategorySerializer(
            categories, many=True, context={"request": request}
        ).data,
    })
