"""Django admin for products."""
from django.contrib import admin
from django.utils.html import format_html

from apps.products.models import Category, Product, ProductImage, ProductVariant


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ["preview", "image", "alt_text", "sort_order", "is_cover"]
    readonly_fields = ["preview"]

    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:64px;border-radius:6px"/>', obj.image.url)
        return "-"
    preview.short_description = "Preview"


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0
    fields = ["name", "sku", "price_override", "stock_quantity", "is_active"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "sort_order", "is_active", "parent"]
    list_filter = ["is_active", "parent"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ["sort_order", "is_active"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name", "vendor", "category", "price", "compare_at_price",
        "stock_quantity", "is_in_stock", "is_active", "is_featured", "avg_rating",
    ]
    list_filter = [
        "is_active", "is_featured", "is_in_stock", "is_customizable",
        "category", "product_type",
    ]
    search_fields = ["name", "slug", "sku", "vendor__business_name"]
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ["price", "is_active", "is_featured"]
    list_select_related = ["vendor", "category"]
    autocomplete_fields = ["vendor", "category"]
    inlines = [ProductImageInline, ProductVariantInline]
    readonly_fields = ["view_count", "avg_rating", "review_count", "created_at", "updated_at"]
    fieldsets = (
        ("Basics", {"fields": ("vendor", "category", "name", "slug", "short_description", "description")}),
        ("Pricing", {"fields": ("price", "compare_at_price", "currency")}),
        ("Inventory", {"fields": ("sku", "product_type", "stock_quantity", "is_in_stock", "allow_backorder")}),
        ("Personalization", {"fields": ("is_customizable",)}),
        ("Shipping", {"fields": ("weight_grams", "dimensions_cm")}),
        ("Visibility", {"fields": ("is_active", "is_featured")}),
        ("Stats (read-only)", {"fields": ("view_count", "avg_rating", "review_count", "created_at", "updated_at")}),
    )
