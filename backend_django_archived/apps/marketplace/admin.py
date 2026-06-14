from django.contrib import admin
from django.utils.html import format_html

from apps.marketplace.models import Banner


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ["title", "placement", "is_active", "priority", "start_at", "end_at", "is_live", "preview"]
    list_filter = ["placement", "is_active"]
    search_fields = ["title", "cta_label"]
    list_editable = ["is_active", "priority"]
    readonly_fields = ["created_at", "updated_at", "preview"]
    fieldsets = (
        ("Content", {"fields": ("title", "placement", "category")}),
        ("Images", {"fields": ("desktop_image", "mobile_image", "preview")}),
        ("Call to action", {"fields": ("cta_label", "cta_url", "open_in_new_tab")}),
        ("Schedule & priority", {"fields": ("start_at", "end_at", "priority", "is_active")}),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )

    def preview(self, obj):
        if obj.desktop_image:
            return format_html(
                '<img src="{}" style="max-width:240px;border-radius:8px"/>',
                obj.desktop_image.url,
            )
        return "-"
    preview.short_description = "Desktop preview"

    def is_live(self, obj):
        return obj.is_live
    is_live.boolean = True
