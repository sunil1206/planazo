from django.contrib import admin
from django.utils.html import format_html
from .models import (
    CoupleWebsite, BrideGroom, BrideGroomStory, BrideGroomEvent,
    WeddingCountdown, InvitationRSVP, Makeyourwish, WeddingGalleryPhoto,
    WeddingVendor,
)


# ── Inline helpers ─────────────────────────────────────────────────────────────

class EventInline(admin.TabularInline):
    model  = BrideGroomEvent
    extra  = 0

class WeddingVendorInline(admin.TabularInline):
    model  = WeddingVendor
    extra  = 0
    raw_id_fields = ["vendor"]


# ── CoupleWebsite ──────────────────────────────────────────────────────────────

@admin.register(CoupleWebsite)
class CoupleWebsiteAdmin(admin.ModelAdmin):
    list_display   = ["couple_name", "account", "theme", "published_badge", "views", "rsvp_count", "created_at"]
    list_filter    = ["theme", "is_published"]
    search_fields  = ["couple", "account__email", "slug"]
    readonly_fields = ["slug", "views", "created_at"]
    inlines        = [EventInline, WeddingVendorInline]
    prepopulated_fields = {"slug": ("couple",)}
    actions        = ["publish_websites", "unpublish_websites"]
    date_hierarchy = "created_at"

    fieldsets = (
        ("Couple Info", {
            "fields": ("account", "couple", "slug", "theme"),
        }),
        ("Images", {
            "fields": ("thumbnail",),
        }),
        ("Settings", {
            "fields": ("is_published", "views", "created_at"),
        }),
    )

    def couple_name(self, obj):
        return obj.couple or f"Website #{obj.pk}"
    couple_name.short_description = "Couple"

    def published_badge(self, obj):
        if obj.is_published:
            return format_html(
                '<span style="background:#10b981;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">LIVE</span>'
            )
        return format_html(
            '<span style="background:#e5e7eb;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">DRAFT</span>'
        )
    published_badge.short_description = "Status"

    def rsvp_count(self, obj):
        return obj.rsvps.count()
    rsvp_count.short_description = "RSVPs"

    def publish_websites(self, request, qs):
        qs.update(is_published=True)
        self.message_user(request, f"{qs.count()} website(s) published.")
    publish_websites.short_description = "🌐 Publish selected websites"

    def unpublish_websites(self, request, qs):
        qs.update(is_published=False)
        self.message_user(request, f"{qs.count()} website(s) unpublished.")
    unpublish_websites.short_description = "📴 Unpublish selected websites"


# ── RSVP ──────────────────────────────────────────────────────────────────────

@admin.register(InvitationRSVP)
class RSVPAdmin(admin.ModelAdmin):
    list_display   = ["name", "website", "attendance", "email", "phone", "created_at"]
    list_filter    = ["attendance", "created_at"]
    search_fields  = ["name", "email", "website__couple"]
    date_hierarchy = "created_at"
    ordering       = ["-created_at"]


# ── Wishes ────────────────────────────────────────────────────────────────────

@admin.register(Makeyourwish)
class WishAdmin(admin.ModelAdmin):
    list_display  = ["name", "website", "message_preview", "verified", "created_at"]
    list_filter   = ["verified"]
    search_fields = ["name", "website__couple"]
    actions       = ["approve_wishes"]

    def message_preview(self, obj):
        return (obj.message or "")[:60] + ("…" if len(obj.message or "") > 60 else "")
    message_preview.short_description = "Message"

    def approve_wishes(self, request, queryset):
        queryset.update(verified=True)
        self.message_user(request, f"{queryset.count()} wish(es) approved.")
    approve_wishes.short_description = "✅ Approve selected wishes"


# ── Wedding Vendors ───────────────────────────────────────────────────────────

@admin.register(WeddingVendor)
class WeddingVendorAdmin(admin.ModelAdmin):
    list_display  = ["website", "vendor", "service_note", "order", "created_at"]
    search_fields = ["website__couple", "vendor__title"]
    raw_id_fields = ["website", "vendor"]
    ordering      = ["website", "order"]


# ── Gallery ───────────────────────────────────────────────────────────────────

@admin.register(WeddingGalleryPhoto)
class GalleryPhotoAdmin(admin.ModelAdmin):
    list_display   = ["website", "uploader_name", "tag", "is_approved", "created_at"]
    list_filter    = ["tag", "is_approved"]
    search_fields  = ["website__couple", "uploader_name", "caption"]
    list_editable  = ["is_approved"]
    readonly_fields = ["created_at"]


# ── Simple registrations ──────────────────────────────────────────────────────

@admin.register(BrideGroom)
class BrideGroomAdmin(admin.ModelAdmin):
    list_display  = ["__str__", "website"]
    search_fields = ["groom_name", "bride_name", "website__couple"]


admin.site.register(BrideGroomStory)
admin.site.register(BrideGroomEvent)
admin.site.register(WeddingCountdown)
