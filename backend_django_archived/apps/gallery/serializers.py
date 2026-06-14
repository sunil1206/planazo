from rest_framework import serializers
from .models import GalleryCategory, GalleryImage, GuestSelfieMatch


class GalleryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryCategory
        fields = ["id", "name"]


def _abs_url(request, file_field):
    """Return an absolute URL for an ImageField (None if empty)."""
    if not file_field:
        return None
    try:
        url = file_field.url
    except Exception:
        return None
    return request.build_absolute_uri(url) if request is not None else url


class GalleryImageSerializer(serializers.ModelSerializer):
    """
    READ contract (used everywhere a photo is rendered):
        id, title, picture, picture_url, thumbnail_url, thumb_small, thumb_medium,
        category_id, category_name, gallery_type, download_count, slug, created_at, uploaded_by

    `picture_url` and `thumbnail_url` are ALWAYS absolute URLs when a request is in
    context, so the frontend never needs to concat a base URL.
    """
    picture_url   = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    category_id   = serializers.IntegerField(source="category.id", read_only=True, allow_null=True)
    category_name = serializers.CharField(source="category.name", read_only=True, allow_null=True)

    def get_picture_url(self, obj):
        return _abs_url(self.context.get("request"), obj.picture)

    def get_thumbnail_url(self, obj):
        # best-available thumbnail as absolute URL
        for fld in (obj.thumb_small, obj.thumb_medium, obj.picture):
            if fld:
                return _abs_url(self.context.get("request"), fld)
        return None

    class Meta:
        model  = GalleryImage
        fields = [
            "id", "title", "picture", "picture_url", "thumb_small", "thumb_medium",
            "thumbnail_url", "category", "category_id", "category_name",
            "gallery_type", "slug", "download_count", "created_at", "uploaded_by",
        ]
        read_only_fields = [
            "slug", "thumb_small", "thumb_medium", "download_count",
            "created_at", "uploaded_by", "picture_url", "thumbnail_url",
            "category_id", "category_name",
        ]


class GalleryImageUploadSerializer(serializers.ModelSerializer):
    """
    WRITE contract (used by /api/gallery/images/ POST):
        picture (file), website (FK id), category (FK id, optional), title (optional),
        gallery_type (one of INVITATION | ALBUM | PRIVATE, default INVITATION).

    `category` accepts a numeric ID -- frontends MUST send an integer, not a name.
    """
    category     = serializers.PrimaryKeyRelatedField(
        queryset=GalleryCategory.objects.all(), required=False, allow_null=True
    )
    gallery_type = serializers.ChoiceField(
        choices=GalleryImage.GALLERY_TYPE_CHOICES,
        default=GalleryImage.GALLERY_INVITATION,
    )

    class Meta:
        model  = GalleryImage
        fields = ["id", "title", "picture", "category", "gallery_type", "website",
                  "slug", "uploaded_by"]
        read_only_fields = ["slug", "uploaded_by"]


class SelfieMatchSerializer(serializers.ModelSerializer):
    matched_images = GalleryImageSerializer(many=True, read_only=True)

    class Meta:
        model  = GuestSelfieMatch
        fields = ["id", "selfie", "status", "error", "matched_images", "created_at"]
        read_only_fields = ["status", "error", "matched_images", "created_at"]
