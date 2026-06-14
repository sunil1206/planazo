"""DRF serializers for vendors."""
from rest_framework import serializers

from apps.vendors.models import Vendor


class VendorListSerializer(serializers.ModelSerializer):
    """Card-sized payload for vendor grids."""
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            "id", "slug", "business_name", "tagline",
            "city", "state",
            "is_verified", "is_featured",
            "avg_rating", "review_count", "total_products",
            "logo_url",
        ]

    def get_logo_url(self, obj):
        return obj.logo.url if obj.logo else None


class VendorDetailSerializer(serializers.ModelSerializer):
    """Full vendor profile."""
    logo_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            "id", "slug", "business_name", "description", "tagline",
            "logo_url", "cover_url",
            "city", "state", "pincode", "country",
            "year_established",
            "is_verified", "is_featured",
            "avg_rating", "review_count", "total_products",
            "whatsapp_number",  # public contact
            "created_at",
        ]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if not obj.logo:
            return None
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url

    def get_cover_url(self, obj):
        request = self.context.get("request")
        if not obj.cover_image:
            return None
        return request.build_absolute_uri(obj.cover_image.url) if request else obj.cover_image.url
