from django.contrib import admin
from django.utils.html import format_html

from apps.vendors.models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = [
        "business_name", "city", "is_active", "is_verified", "is_featured",
        "avg_rating", "review_count", "total_products",
    ]
    list_filter = ["is_active", "is_verified", "is_featured", "state", "city"]
    search_fields = ["business_name", "slug", "user__email", "user__username", "pincode"]
    prepopulated_fields = {"slug": ("business_name",)}
    list_editable = ["is_active", "is_verified", "is_featured"]
    autocomplete_fields = ["user"]
    readonly_fields = ["avg_rating", "review_count", "total_products", "total_orders", "created_at", "updated_at"]
    fieldsets = (
        ("Account", {"fields": ("user", "is_active", "is_verified", "is_featured")}),
        ("Branding", {"fields": ("business_name", "slug", "tagline", "description", "logo", "cover_image")}),
        ("Contact", {"fields": ("contact_email", "contact_phone", "whatsapp_number")}),
        ("Location", {"fields": ("address_line", "city", "state", "pincode", "country")}),
        ("Business", {"fields": ("gst_number", "pan_number", "year_established", "commission_percent", "payout_schedule")}),
        ("Stats", {"fields": ("avg_rating", "review_count", "total_products", "total_orders", "created_at", "updated_at")}),
    )
