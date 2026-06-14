from rest_framework import serializers
from .models import (
    BirthdayPage, BirthdayEvent, BirthdayStory,
    BirthdayWish, BirthdayRSVP, BirthdayCountdown,
)


class BirthdayEventSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BirthdayEvent
        fields = "__all__"
        read_only_fields = ["page"]


class BirthdayStorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model  = BirthdayStory
        fields = "__all__"
        read_only_fields = ["page"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class BirthdayWishSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model  = BirthdayWish
        fields = ["id", "name", "relation", "message", "photo_url", "created_at"]

    def get_photo_url(self, obj):
        request = self.context.get("request")
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None


class BirthdayRSVPSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BirthdayRSVP
        fields = "__all__"
        read_only_fields = ["page"]


class BirthdayCountdownSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BirthdayCountdown
        fields = "__all__"
        read_only_fields = ["page"]


class BirthdayPageListSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()
    rsvp_count    = serializers.SerializerMethodField()
    wish_count    = serializers.SerializerMethodField()

    class Meta:
        model  = BirthdayPage
        fields = [
            "id", "title", "celebrant", "slug", "theme",
            "date", "venue", "is_published",
            "thumbnail_url", "rsvp_count", "wish_count", "created_at",
        ]

    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return None

    def get_rsvp_count(self, obj):
        return obj.rsvps.filter(attending=True).count()

    def get_wish_count(self, obj):
        return obj.wishes.filter(is_approved=True).count()


class BirthdayPageDetailSerializer(BirthdayPageListSerializer):
    events    = BirthdayEventSerializer(many=True, read_only=True)
    stories   = BirthdayStorySerializer(many=True, read_only=True)
    wishes    = BirthdayWishSerializer(many=True, read_only=True)
    countdown = BirthdayCountdownSerializer(read_only=True)

    class Meta(BirthdayPageListSerializer.Meta):
        fields = BirthdayPageListSerializer.Meta.fields + [
            "time", "venue_map", "description", "events", "stories",
            "wishes", "countdown", "updated_at",
        ]
