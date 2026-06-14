from django.contrib import admin
from django.utils.html import format_html
from .models import (
    VendorCategory, VendorThemePreset,
    VendorWebsite, VendorPortfolioImage, VendorEnquiry, VendorReview,
    PortfolioCategory, VendorPackage, SubscriptionPlan, VendorSubscription,
    VendorFavorite,
)


# ── Dynamic Category & Theme (new) ────────────────────────────────────────────

@admin.register(VendorCategory)
class VendorCategoryAdmin(admin.ModelAdmin):
    list_display  = ["name", "key", "order", "is_active"]
    list_editable = ["order", "is_active"]
    search_fields = ["name", "key"]
    ordering      = ["order", "name"]


@admin.register(VendorThemePreset)
class VendorThemePresetAdmin(admin.ModelAdmin):
    list_display  = ["name", "hex_color", "order", "is_active"]
    list_editable = ["order", "is_active"]
    ordering      = ["order", "name"]


# ── Inline helpers ─────────────────────────────────────────────────────────────

class PackageInline(admin.TabularInline):
    model  = VendorPackage
    extra  = 0
    fields = ["name", "price", "is_popular", "is_available", "max_hours", "delivery_days"]

class PortfolioInline(admin.TabularInline):
    model  = VendorPortfolioImage
    extra  = 0
    fields = ["title", "picture", "category"]
    readonly_fields = ["picture"]


# ── Main vendor admin ──────────────────────────────────────────────────────────

@admin.register(VendorWebsite)
class VendorAdmin(admin.ModelAdmin):
    list_display   = ["thumbnail_preview", "title", "category", "city", "is_verified",
                       "is_active", "avg_rating", "review_count_display", "subscription_tier_display", "created_at"]
    list_filter    = ["category", "is_verified", "is_active"]
    search_fields  = ["title", "account__email", "city"]
    readonly_fields = ["avg_rating", "created_at", "thumbnail_preview"]
    inlines        = [PackageInline, PortfolioInline]
    actions        = ["verify_vendors", "deactivate_vendors"]

    fieldsets = (
        ("Identity", {
            "fields": ("account", "title", "tagline", "bio", "category", "city", "address"),
        }),
        ("Media", {
            "fields": ("thumbnail", "cover_image", "theme_color"),
        }),
        ("Contact", {
            "fields": ("phone", "email", "website", "instagram"),
        }),
        ("Status", {
            "fields": ("is_active", "is_verified", "slug", "avg_rating", "created_at"),
        }),
    )

    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html(
                '<img src="{}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" />',
                obj.thumbnail.url,
            )
        return "—"
    thumbnail_preview.short_description = ""

    def review_count_display(self, obj):
        return obj.reviews.filter(is_approved=True).count()
    review_count_display.short_description = "Reviews"

    def subscription_tier_display(self, obj):
        try:
            tier = obj.subscription.plan.tier
        except Exception:
            tier = "FREE"
        colors = {"FREE": "#6b7280", "PRO": "#3b82f6", "PREMIUM": "#f59e0b"}
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">{}</span>',
            colors.get(tier, "#6b7280"), tier,
        )
    subscription_tier_display.short_description = "Plan"

    def verify_vendors(self, request, qs):
        qs.update(is_verified=True)
        self.message_user(request, f"{qs.count()} vendor(s) marked as verified.")
    verify_vendors.short_description = "✅ Mark as Verified"

    def deactivate_vendors(self, request, qs):
        qs.update(is_active=False)
        self.message_user(request, f"{qs.count()} vendor(s) deactivated.")
    deactivate_vendors.short_description = "⛔ Deactivate"


@admin.register(VendorEnquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display  = ["name", "vendor", "email", "phone", "status", "event_date", "created_at"]
    list_filter   = ["status", "created_at"]
    search_fields = ["name", "email", "vendor__title"]
    date_hierarchy = "created_at"
    list_editable  = ["status"]
    ordering       = ["-created_at"]


@admin.register(VendorReview)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ["reviewer", "vendor", "star_display", "is_approved", "created_at"]
    list_filter   = ["is_approved", "rating"]
    search_fields = ["reviewer__email", "vendor__title"]
    actions       = ["approve_reviews"]

    def star_display(self, obj):
        return "⭐" * obj.rating
    star_display.short_description = "Rating"

    def approve_reviews(self, request, qs):
        qs.update(is_approved=True)
        self.message_user(request, f"{qs.count()} review(s) approved.")
    approve_reviews.short_description = "✅ Approve selected reviews"


@admin.register(VendorPackage)
class PackageAdmin(admin.ModelAdmin):
    list_display  = ["name", "vendor", "price_display", "is_popular", "is_available", "created_at"]
    list_filter   = ["is_popular", "is_available"]
    search_fields = ["name", "vendor__title"]


@admin.register(PortfolioCategory)
class PortfolioCategoryAdmin(admin.ModelAdmin):
    list_display  = ["name", "vendor", "emoji", "order"]
    search_fields = ["name", "vendor__title"]


@admin.register(VendorPortfolioImage)
class PortfolioImageAdmin(admin.ModelAdmin):
    list_display  = ["title", "vendor", "category", "created_at"]
    list_filter   = ["vendor__category"]
    search_fields = ["title", "vendor__title"]
    readonly_fields = ["created_at"]


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display  = ["name", "tier", "price_monthly", "price_yearly", "featured_placement",
                      "max_packages", "max_portfolio_images"]
    list_editable = ["price_monthly", "price_yearly"]


@admin.register(VendorSubscription)
class VendorSubscriptionAdmin(admin.ModelAdmin):
    list_display  = ["vendor", "plan", "status", "is_yearly", "current_period_end", "created_at"]
    list_filter   = ["status", "is_yearly", "plan__tier"]
    search_fields = ["vendor__title", "vendor__account__email"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(VendorFavorite)
class VendorFavoriteAdmin(admin.ModelAdmin):
    list_display  = ["user", "vendor", "created_at"]
    search_fields = ["user__email", "vendor__title"]
    readonly_fields = ["created_at"]
