from django.contrib import admin
from django.utils import timezone
from .models import GiftCategory, GiftProduct, GiftOrder, GiftSeller, ScheduledDelivery


@admin.register(GiftSeller)
class GiftSellerAdmin(admin.ModelAdmin):
    list_display  = ["business_name", "user", "status", "commission_pct", "created_at"]
    list_filter   = ["status"]
    search_fields = ["business_name", "user__email"]
    list_editable = ["status", "commission_pct"]
    readonly_fields = ["created_at"]


@admin.register(GiftCategory)
class GiftCategoryAdmin(admin.ModelAdmin):
    list_display  = ["name", "order", "icon_image"]
    list_editable = ["order"]
    ordering      = ["order", "name"]


@admin.register(GiftProduct)
class GiftProductAdmin(admin.ModelAdmin):
    list_display  = ["name", "seller", "category", "price", "is_available", "is_featured"]
    list_filter   = ["category", "seller", "is_available", "is_featured"]
    list_editable = ["is_available", "is_featured", "price"]
    search_fields = ["name", "seller__business_name"]


@admin.register(GiftOrder)
class GiftOrderAdmin(admin.ModelAdmin):
    list_display  = ["product", "sender_name", "sender_email", "delivery_type", "status", "amount", "created_at"]
    list_filter   = ["status", "delivery_type"]
    search_fields = ["sender_name", "sender_email", "product__name"]
    readonly_fields = ["razorpay_order_id", "razorpay_payment_id", "amount", "created_at"]


@admin.register(ScheduledDelivery)
class ScheduledDeliveryAdmin(admin.ModelAdmin):
    list_display   = [
        "id", "delivery_type", "sender_name", "recipient_name",
        "scheduled_date", "payment_status", "fulfilment_status", "amount", "created_at",
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

    actions = ["mark_dispatched", "mark_delivered", "mark_cancelled"]

    def mark_dispatched(self, request, queryset):
        queryset.update(fulfilment_status="DISPATCHED", dispatched_at=timezone.now())
        self.message_user(request, f"{queryset.count()} delivery(ies) marked as Dispatched.")
    mark_dispatched.short_description = "Mark as Dispatched"

    def mark_delivered(self, request, queryset):
        queryset.update(fulfilment_status="DELIVERED")
        self.message_user(request, f"{queryset.count()} delivery(ies) marked as Delivered.")
    mark_delivered.short_description = "Mark as Delivered"

    def mark_cancelled(self, request, queryset):
        queryset.update(fulfilment_status="CANCELLED")
        self.message_user(request, f"{queryset.count()} delivery(ies) cancelled.")
    mark_cancelled.short_description = "Cancel selected"
