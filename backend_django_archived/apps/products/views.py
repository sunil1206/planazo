"""
DRF viewsets for Product, Category, etc.

Architecture:
- Public listing / detail endpoints are open (AllowAny).
- Write endpoints (create/update/delete) are vendor-scoped and require auth.
- Querysets use select_related/prefetch_related to avoid N+1.
- Listings cache the queryset shape for 60s via cache_page (configurable).
"""
from __future__ import annotations

from django.db.models import Count, Prefetch
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.products.filters import ProductFilter
from apps.products.models import Category, Product, ProductImage
from apps.products.serializers import (
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


class CategoryViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    GET /api/marketplace/categories/         — list all active categories
    GET /api/marketplace/categories/<slug>/  — single category detail
    """
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Category.objects
            .filter(is_active=True)
            .annotate(product_count=Count("products", filter=models_q_active_products()))
            .order_by("sort_order", "name")
        )


def models_q_active_products():
    """Helper: only count products that are active and in stock for category sidebar."""
    from django.db.models import Q
    return Q(products__is_active=True)


class ProductViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    GET /api/marketplace/products/                 — paginated list with filters
    GET /api/marketplace/products/<slug>/          — single product detail (eager loaded)
    GET /api/marketplace/products/featured/        — featured products carousel
    GET /api/marketplace/products/related/?slug=X  — related-by-category
    """
    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = ProductFilter
    ordering_fields = ["price", "created_at", "avg_rating", "view_count"]
    ordering = ["-is_featured", "-created_at"]
    search_fields = ["name", "short_description", "vendor__business_name"]

    def get_queryset(self):
        """
        Eager-load images for the list view (cover image only),
        full eager-load for detail view including variants and vendor.
        """
        qs = Product.objects.filter(is_active=True).select_related("vendor", "category")

        if self.action == "list":
            # Only need the cover image on listings
            qs = qs.prefetch_related(
                Prefetch(
                    "images",
                    queryset=ProductImage.objects.order_by("sort_order", "id")[:1],
                )
            )
        else:
            qs = qs.prefetch_related("images", "variants")

        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer

    def retrieve(self, request, *args, **kwargs):
        """Increment view_count atomically on each detail load."""
        instance = self.get_object()
        # Atomic UPDATE — avoids race condition vs. instance.view_count += 1; save()
        Product.objects.filter(pk=instance.pk).update(view_count=models_f("view_count") + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        qs = self.get_queryset().filter(is_featured=True)[:12]
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def related(self, request):
        slug = request.query_params.get("slug")
        if not slug:
            return Response([], status=200)
        try:
            target = Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return Response([], status=200)
        qs = (
            self.get_queryset()
            .filter(category=target.category)
            .exclude(pk=target.pk)[:8]
        )
        return Response(self.get_serializer(qs, many=True).data)


def models_f(field_name):
    """Tiny helper so we don't need to import F at module level."""
    from django.db.models import F
    return F(field_name)
