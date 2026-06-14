from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User

# ── Admin site branding ────────────────────────────────────────────────────────
admin.site.site_header  = "💍 Planazo Admin"
admin.site.site_title   = "Planazo"
admin.site.index_title  = "Planazo Control Panel"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display   = ["email", "full_name", "role_badge", "is_active", "is_staff", "created_at"]
    list_filter    = ["role", "is_active", "is_staff"]
    search_fields  = ["email", "full_name"]
    ordering       = ["-created_at"]
    readonly_fields = ["created_at"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("full_name", "role", "avatar_url", "google_id")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("created_at",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields":  ("email", "full_name", "role", "password1", "password2"),
        }),
    )

    def role_badge(self, obj):
        colors = {
            "COUPLE":  "#8B1A4A",
            "VENDOR":  "#1e40af",
            "SELLER":  "#065f46",
            "ADMIN":   "#1c1c1e",
        }
        role = getattr(obj, "role", "")
        color = colors.get(role, "#6b7280")
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;">{}</span>',
            color, role or "—",
        )
    role_badge.short_description = "Role"
