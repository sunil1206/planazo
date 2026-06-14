"""
Register models into the 3 custom admin sites.
Import this module from core/apps.py ready() or core/urls.py
so registrations happen after all apps are loaded.
"""
from django.utils.html import format_html
from django.contrib import admin
from core.admin_sites import vendor_admin_site, gift_admin_site, wedding_admin_site


# ============================================================
# VENDOR ADMIN — /vendor-admin/
# ============================================================

def register_vendor_admin():
    from apps.vendor.models import (
        VendorCategory, VendorThemePreset, VendorWebsite,
        VendorPackage, VendorPortfolioImage, PortfolioCategory,
        VendorEnquiry, VendorReview, SubscriptionPlan, VendorSubscription,
        VendorFavorite,
    )
    from apps.vendor.admin import (
        VendorAdmin, EnquiryAdmin, ReviewAdmin, PackageAdmin,
        PortfolioCategoryAdmin, PortfolioImageAdmin,
        SubscriptionPlanAdmin, VendorSubscriptionAdmin, VendorFavoriteAdmin,
    )

    # Dynamic category/theme — custom inline admin
    class VendorCategoryAdmin(admin.ModelAdmin):
        list_display  = ["name", "key", "order", "is_active"]
        list_editable = ["order", "is_active"]
        search_fields = ["name", "key"]

    class VendorThemePresetAdmin(admin.ModelAdmin):
        list_display  = ["name", "hex_color", "order", "is_active"]
        list_editable = ["order", "is_active"]

    vendor_admin_site.register(VendorCategory,     VendorCategoryAdmin)
    vendor_admin_site.register(VendorThemePreset,  VendorThemePresetAdmin)
    vendor_admin_site.register(VendorWebsite,      VendorAdmin)
    vendor_admin_site.register(VendorPackage,      PackageAdmin)
    vendor_admin_site.register(PortfolioCategory,  PortfolioCategoryAdmin)
    vendor_admin_site.register(VendorPortfolioImage, PortfolioImageAdmin)
    vendor_admin_site.register(VendorEnquiry,      EnquiryAdmin)
    vendor_admin_site.register(VendorReview,       ReviewAdmin)
    vendor_admin_site.register(SubscriptionPlan,   SubscriptionPlanAdmin)
    vendor_admin_site.register(VendorSubscription, VendorSubscriptionAdmin)
    vendor_admin_site.register(VendorFavorite,     VendorFavoriteAdmin)


# ============================================================
# GIFT ADMIN — /gift-admin/
# ============================================================

def register_gift_admin():
    from apps.gift.models import (
        GiftCategory, GiftProduct, GiftOrder, GiftSeller,
        ProductImage, ProductVariant, ProductReview,
        Cart, CartItem, MarketplaceOrder, MarketplaceOrderItem,
        ScheduledDelivery,
    )
    from apps.gift.admin import (
        GiftSellerAdmin, GiftCategoryAdmin, GiftProductAdmin, GiftOrderAdmin,
    )

    class ScheduledDeliveryAdmin(admin.ModelAdmin):
        list_display   = [
            "id", "delivery_type", "sender_name", "recipient_name",
            "scheduled_date", "payment_status", "fulfilment_status", "created_at",
        ]
        list_filter    = ["delivery_type", "payment_status", "fulfilment_status", "scheduled_date"]
        search_fields  = ["sender_name", "sender_email", "recipient_name", "recipient_email"]
        list_editable  = ["fulfilment_status"]
        readonly_fields = ["razorpay_order_id", "razorpay_payment_id", "created_at", "updated_at"]
        date_hierarchy = "scheduled_date"
        ordering       = ["scheduled_date"]

        fieldsets = (
            ("Delivery Info", {
                "fields": ("delivery_type", "product", "product_qty",
                           "postcard_message", "postcard_template",
                           "occasion", "scheduled_date", "notes_for_team"),
            }),
            ("Sender", {
                "fields": ("user", "sender_name", "sender_email", "sender_phone",
                           "sender_address_line1", "sender_address_line2",
                           "sender_city", "sender_state", "sender_pincode"),
            }),
            ("Recipient", {
                "fields": ("recipient_name", "recipient_email", "recipient_phone",
                           "recipient_address_line1", "recipient_address_line2",
                           "recipient_city", "recipient_state",
                           "recipient_pincode", "recipient_country"),
            }),
            ("Payment", {
                "fields": ("amount", "payment_status",
                           "razorpay_order_id", "razorpay_payment_id"),
            }),
            ("Fulfilment", {
                "fields": ("fulfilment_status", "tracking_info", "dispatched_at",
                           "website", "is_subscription"),
            }),
            ("Timestamps", {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            }),
        )

        actions = ["mark_dispatched", "mark_delivered"]

        def mark_dispatched(self, request, queryset):
            from django.utils import timezone
            queryset.update(fulfilment_status="DISPATCHED", dispatched_at=timezone.now())
            self.message_user(request, f"{queryset.count()} delivery(ies) marked as Dispatched.")
        mark_dispatched.short_description = "Mark selected as Dispatched"

        def mark_delivered(self, request, queryset):
            queryset.update(fulfilment_status="DELIVERED")
            self.message_user(request, f"{queryset.count()} delivery(ies) marked as Delivered.")
        mark_delivered.short_description = "Mark selected as Delivered"

    class MarketplaceOrderAdmin(admin.ModelAdmin):
        list_display   = ["order_number", "buyer_name", "buyer_email", "total_amount", "status", "created_at"]
        list_filter    = ["status", "created_at"]
        search_fields  = ["order_number", "buyer_name", "buyer_email"]
        readonly_fields = ["order_number", "razorpay_order_id", "razorpay_payment_id", "created_at"]
        list_editable  = ["status"]

    gift_admin_site.register(GiftCategory,      GiftCategoryAdmin)
    gift_admin_site.register(GiftProduct,        GiftProductAdmin)
    gift_admin_site.register(GiftOrder,          GiftOrderAdmin)
    gift_admin_site.register(GiftSeller,         GiftSellerAdmin)
    gift_admin_site.register(MarketplaceOrder,   MarketplaceOrderAdmin)
    gift_admin_site.register(ScheduledDelivery,  ScheduledDeliveryAdmin)


# ============================================================
# WEDDING ADMIN — /wedding-admin/
# ============================================================

def register_wedding_admin():
    from apps.invitation.models import (
        CoupleWebsite, BrideGroom, BrideGroomStory, BrideGroomEvent,
        WeddingCountdown, InvitationRSVP, Makeyourwish,
        WeddingGalleryPhoto, WeddingVendor,
    )
    from apps.invitation.admin import (
        CoupleWebsiteAdmin, RSVPAdmin, WishAdmin, GalleryPhotoAdmin,
        WeddingVendorAdmin, BrideGroomAdmin,
    )
    from apps.birthday.models import BirthdayWebsite, BirthdayRSVP, BirthdayWish

    class BirthdayWebsiteAdmin(admin.ModelAdmin):
        list_display  = ["title", "account", "theme", "is_published", "created_at"]
        list_filter   = ["theme", "is_published"]
        search_fields = ["title", "account__email"]

    class BirthdayRSVPAdmin(admin.ModelAdmin):
        list_display  = ["name", "website", "attendance", "created_at"]
        list_filter   = ["attendance"]
        search_fields = ["name", "email", "website__title"]

    wedding_admin_site.register(CoupleWebsite,      CoupleWebsiteAdmin)
    wedding_admin_site.register(BrideGroom,         BrideGroomAdmin)
    wedding_admin_site.register(BrideGroomStory)
    wedding_admin_site.register(BrideGroomEvent)
    wedding_admin_site.register(WeddingCountdown)
    wedding_admin_site.register(InvitationRSVP,     RSVPAdmin)
    wedding_admin_site.register(Makeyourwish,       WishAdmin)
    wedding_admin_site.register(WeddingGalleryPhoto, GalleryPhotoAdmin)
    wedding_admin_site.register(WeddingVendor,      WeddingVendorAdmin)
    wedding_admin_site.register(BirthdayWebsite,    BirthdayWebsiteAdmin)
    wedding_admin_site.register(BirthdayRSVP,       BirthdayRSVPAdmin)
    wedding_admin_site.register(BirthdayWish)


# Run all registrations
try:
    register_vendor_admin()
    register_gift_admin()
    register_wedding_admin()
except Exception:
    pass   # Avoid crashing during migrations / tests
