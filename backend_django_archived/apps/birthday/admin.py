from django.contrib import admin
from .models import (
    BirthdayPage, BirthdayEvent, BirthdayStory,
    BirthdayWish, BirthdayRSVP, BirthdayCountdown,
)


class BirthdayEventInline(admin.TabularInline):
    model = BirthdayEvent
    extra = 1


class BirthdayStoryInline(admin.TabularInline):
    model = BirthdayStory
    extra = 1


@admin.register(BirthdayPage)
class BirthdayPageAdmin(admin.ModelAdmin):
    list_display  = ["celebrant", "title", "slug", "theme", "date", "is_published", "owner"]
    list_filter   = ["theme", "is_published"]
    search_fields = ["celebrant", "title", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [BirthdayEventInline, BirthdayStoryInline]


@admin.register(BirthdayWish)
class BirthdayWishAdmin(admin.ModelAdmin):
    list_display = ["name", "relation", "page", "is_approved", "created_at"]
    list_filter  = ["is_approved"]
    actions      = ["approve"]

    def approve(self, request, queryset):
        queryset.update(is_approved=True)
    approve.short_description = "Approve selected wishes"


@admin.register(BirthdayRSVP)
class BirthdayRSVPAdmin(admin.ModelAdmin):
    list_display = ["name", "page", "attending", "guests", "meal_pref", "created_at"]
    list_filter  = ["attending", "meal_pref"]
