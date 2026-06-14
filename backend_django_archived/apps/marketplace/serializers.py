from rest_framework import serializers

from apps.marketplace.models import Banner


class BannerSerializer(serializers.ModelSerializer):
    desktop_url = serializers.SerializerMethodField()
    mobile_url = serializers.SerializerMethodField()
    is_live = serializers.BooleanField(read_only=True)

    class Meta:
        model = Banner
        fields = [
            "id", "title", "placement",
            "desktop_url", "mobile_url",
            "cta_label", "cta_url", "open_in_new_tab",
            "priority", "is_live",
        ]

    def get_desktop_url(self, obj):
        request = self.context.get("request")
        if not obj.desktop_image:
            return None
        return request.build_absolute_uri(obj.desktop_image.url) if request else obj.desktop_image.url

    def get_mobile_url(self, obj):
        request = self.context.get("request")
        if not obj.mobile_image:
            return None
        return request.build_absolute_uri(obj.mobile_image.url) if request else obj.mobile_image.url
