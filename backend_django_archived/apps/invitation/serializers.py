from rest_framework import serializers
from .models import (
    CoupleWebsite, BrideGroom, BrideGroomStory,
    BrideGroomEvent, WeddingCountdown, InvitationRSVP,
    Makeyourwish, WeddingGalleryPhoto, WeddingVendor,
)


class BrideGroomSerializer(serializers.ModelSerializer):
    bride_photo  = serializers.SerializerMethodField()
    groom_photo  = serializers.SerializerMethodField()

    class Meta:
        model  = BrideGroom
        fields = "__all__"
        read_only_fields = ["website"]

    def _abs(self, img):
        request = self.context.get("request")
        if img and request:
            return request.build_absolute_uri(img.url)
        return str(img.url) if img else None

    def get_bride_photo(self, obj): return self._abs(obj.bride_image)
    def get_groom_photo(self, obj): return self._abs(obj.groom_image)


class StorySerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    desc = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model  = BrideGroomStory
        fields = ["id", "title", "photo", "date", "order", "desc"]
        read_only_fields = ["website"]

    def get_photo(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return str(obj.image.url) if obj.image else None

    def to_representation(self, instance):
        r = super().to_representation(instance)
        # Map 'desc' model field → 'description' for frontend
        r["description"] = instance.desc
        return r


class EventSerializer(serializers.ModelSerializer):
    venue = serializers.SerializerMethodField()
    location_name = serializers.CharField(required=False, allow_blank=True, default="")
    desc = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model  = BrideGroomEvent
        fields = ["id", "title", "date", "time", "venue", "order", "location_link", "location_name", "desc"]
        read_only_fields = ["website"]

    def get_venue(self, obj):
        return obj.location_name

    def to_representation(self, instance):
        r = super().to_representation(instance)
        r["description"] = instance.desc
        return r


class CountdownSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WeddingCountdown
        fields = "__all__"
        read_only_fields = ["website"]


class RSVPSerializer(serializers.ModelSerializer):
    guests = serializers.IntegerField(required=False, default=1)
    meal_preference = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model  = InvitationRSVP
        fields = ["id", "name", "phone", "email", "attendance", "guests", "meal_preference", "message", "created_at"]


class WishSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Makeyourwish
        fields = ["id", "name", "relationship", "image", "message", "verified", "created_at"]


class WeddingGalleryPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model  = WeddingGalleryPhoto
        fields = ["id", "image", "image_url", "tag", "caption", "uploader_name", "created_at"]
        read_only_fields = ["created_at"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return str(obj.image.url) if obj.image else None


class WeddingVendorSerializer(serializers.ModelSerializer):
    """Minimal vendor info for public invitation page."""
    vendor_id       = serializers.IntegerField(source="vendor.id", read_only=True)
    title           = serializers.CharField(source="vendor.title", read_only=True)
    category        = serializers.CharField(source="vendor.category", read_only=True)
    category_label  = serializers.SerializerMethodField()
    thumbnail       = serializers.SerializerMethodField()
    slug            = serializers.CharField(source="vendor.slug", read_only=True)
    city            = serializers.CharField(source="vendor.city", read_only=True)
    tagline         = serializers.CharField(source="vendor.tagline", read_only=True)
    instagram       = serializers.URLField(source="vendor.instagram", read_only=True)

    CATEGORY_LABELS = {
        "PHOTOGRAPHER": "Photographer",
        "EVENT":        "Event Manager",
        "DECOR":        "Decorator",
        "CATERING":     "Caterer",
        "MAKEUP":       "Makeup Artist",
        "MUSIC":        "DJ / Music",
    }

    class Meta:
        model  = WeddingVendor
        fields = [
            "id", "vendor_id", "title", "category", "category_label",
            "thumbnail", "slug", "city", "tagline", "instagram", "service_note",
        ]

    def get_category_label(self, obj):
        return self.CATEGORY_LABELS.get(obj.vendor.category, obj.vendor.category)

    def get_thumbnail(self, obj):
        request = self.context.get("request")
        if obj.vendor.thumbnail and request:
            return request.build_absolute_uri(obj.vendor.thumbnail.url)
        return str(obj.vendor.thumbnail.url) if obj.vendor.thumbnail else None


class CoupleWebsiteSerializer(serializers.ModelSerializer):
    """Used for list / create / update"""
    class Meta:
        model  = CoupleWebsite
        fields = ["id", "couple", "bride_info", "groom_info", "theme",
                  "thumbnail", "is_published", "slug", "gallery_token", "views", "created_at"]
        read_only_fields = ["slug", "gallery_token", "views", "created_at"]


class CoupleWebsiteDetailSerializer(serializers.ModelSerializer):
    """Full nested data for public invitation page — enriched with all sections."""
    bridegroom       = BrideGroomSerializer(read_only=True)
    stories          = StorySerializer(many=True, read_only=True)
    events           = EventSerializer(many=True, read_only=True)
    countdown        = CountdownSerializer(read_only=True)
    wishes           = serializers.SerializerMethodField()
    gallery_images   = serializers.SerializerMethodField()
    gallery_count    = serializers.SerializerMethodField()
    vendors          = serializers.SerializerMethodField()
    # Derived convenience fields for the invite page
    wedding_date     = serializers.SerializerMethodField()
    venue            = serializers.SerializerMethodField()
    background_image = serializers.SerializerMethodField()

    class Meta:
        model  = CoupleWebsite
        fields = [
            "id", "couple", "bride_info", "groom_info", "theme",
            "thumbnail", "background_image", "slug", "gallery_token",
            "views", "is_published", "wedding_date", "venue",
            "bridegroom", "stories", "events", "countdown",
            "wishes", "gallery_images", "gallery_count", "vendors",
        ]

    def get_wishes(self, obj):
        qs = obj.wishes.all().order_by("-created_at")[:20]
        return WishSerializer(qs, many=True).data

    def get_gallery_images(self, obj):
        """Return up to 6 preview photos for the invite page hero."""
        qs = obj.guest_photos.all()[:6]
        request = self.context.get("request")
        return [
            {
                "id": p.id,
                "image": request.build_absolute_uri(p.image.url) if request else str(p.image.url),
                "tag": p.tag,
                "caption": p.caption,
            }
            for p in qs
        ]

    def get_gallery_count(self, obj):
        return obj.guest_photos.all().count()

    def get_vendors(self, obj):
        qs = obj.wedding_vendors.select_related("vendor").order_by("order", "created_at")
        return WeddingVendorSerializer(qs, many=True, context=self.context).data

    def get_wedding_date(self, obj):
        """Get the main wedding event date, or countdown date."""
        event = obj.events.filter(title__icontains="wedding").first() or obj.events.first()
        if event and event.date:
            return event.date.isoformat()
        try:
            return obj.countdown.event_date.isoformat()
        except Exception:
            return None

    def get_venue(self, obj):
        event = obj.events.filter(title__icontains="wedding").first() or obj.events.first()
        return event.location_name if event else None

    def get_background_image(self, obj):
        request = self.context.get("request")
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return str(obj.thumbnail.url) if obj.thumbnail else None
