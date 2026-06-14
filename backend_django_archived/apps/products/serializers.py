"""DRF serializers for the products app."""
from __future__ import annotations

from rest_framework import serializers

from apps.products.models import Category, Product, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    icon_url = serializers.SerializerMethodField()
    banner_url = serializers.SerializerMethodField()
    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "description",
            "icon_url", "banner_url",
            "sort_order", "product_count",
        ]

    def get_icon_url(self, obj):
        return obj.icon.url if obj.icon else None

    def get_banner_url(self, obj):
        return obj.banner.url if obj.banner else None


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "url", "alt_text", "sort_order", "is_cover"]

    def get_url(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class ProductVariantSerializer(serializers.ModelSerializer):
    effective_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = ProductVariant
        fields = [
            "id", "name", "sku", "price_override", "effective_price",
            "stock_quantity", "is_active", "attributes",
        ]


class VendorMiniSerializer(serializers.Serializer):
    """Lightweight vendor info nested inside a product."""
    id = serializers.IntegerField()
    slug = serializers.CharField()
    name = serializers.CharField(source="business_name")
    avg_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    city = serializers.CharField()


class ProductListSerializer(serializers.ModelSerializer):
    """Stripped-down for grid listings — fast, minimal payload."""
    category = serializers.SlugRelatedField(read_only=True, slug_field="slug")
    cover_image = serializers.SerializerMethodField()
    discount_percent = serializers.IntegerField(read_only=True)
    vendor = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "slug", "name", "short_description", "category",
            "price", "compare_at_price", "currency", "discount_percent",
            "cover_image", "vendor",
            "avg_rating", "review_count", "is_in_stock", "is_featured",
        ]

    def get_cover_image(self, obj):
        # Use prefetched cover_images if available, else first image
        images = list(obj.images.all()[:1])
        if not images:
            return None
        request = self.context.get("request")
        url = images[0].image.url if images[0].image else None
        return request.build_absolute_uri(url) if (request and url) else url

    def get_vendor(self, obj):
        v = obj.vendor
        return {
            "id": v.id, "slug": v.slug, "name": v.business_name,
            "city": v.city, "avg_rating": str(v.avg_rating),
        }


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full payload for /products/<slug>/."""
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    vendor = serializers.SerializerMethodField()
    discount_percent = serializers.IntegerField(read_only=True)
    is_on_sale = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "slug", "name", "short_description", "description",
            "category", "product_type", "sku",
            "price", "compare_at_price", "currency",
            "discount_percent", "is_on_sale",
            "stock_quantity", "is_in_stock", "allow_backorder",
            "is_customizable",
            "weight_grams", "dimensions_cm",
            "is_active", "is_featured",
            "view_count", "avg_rating", "review_count",
            "images", "variants", "vendor",
            "created_at", "updated_at",
        ]

    def get_vendor(self, obj):
        v = obj.vendor
        return {
            "id": v.id, "slug": v.slug,
            "name": v.business_name,
            "description": v.description,
            "city": v.city, "state": v.state,
            "avg_rating": str(v.avg_rating),
            "review_count": v.review_count,
            "year_established": v.year_established,
            "logo_url": v.logo.url if v.logo else None,
        }
