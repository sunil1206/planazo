from django.contrib import admin
from .models import GalleryCategory, GalleryImage, GuestSelfieMatch

@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    list_display  = ["title", "website", "category", "download_count", "created_at"]
    list_filter   = ["category"]
    search_fields = ["title", "website__couple"]

@admin.register(GuestSelfieMatch)
class SelfieMatchAdmin(admin.ModelAdmin):
    list_display = ["website", "status", "created_at"]
    list_filter  = ["status"]

admin.site.register(GalleryCategory)
