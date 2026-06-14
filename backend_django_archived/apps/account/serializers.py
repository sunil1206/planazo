from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "password", "full_name", "role"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")
        data["user"] = user
        return data


class GoogleAuthSerializer(serializers.Serializer):
    """
    Receives the Google id_token from NextAuth.js frontend.
    Verifies it, creates or retrieves the user, returns JWT.
    """
    id_token = serializers.CharField()

    def validate(self, data):
        try:
            info = id_token.verify_oauth2_token(
                data["id_token"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            raise serializers.ValidationError("Invalid Google token.")

        google_id = info["sub"]
        email     = info.get("email", "")
        name      = info.get("name", "")
        avatar    = info.get("picture", "")

        user, _ = User.objects.get_or_create(
            google_id=google_id,
            defaults={"email": email, "full_name": name, "avatar_url": avatar},
        )
        # Update email/avatar if changed
        if user.email != email or user.avatar_url != avatar:
            user.email = email
            user.avatar_url = avatar
            user.save(update_fields=["email", "avatar_url"])

        data["user"] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    subscription_plan = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "avatar_url",
                  "subscription_plan", "created_at"]

    def get_subscription_plan(self, obj):
        sub = getattr(obj, "subscription", None)
        if sub and sub.is_active:
            return sub.plan
        return "FREE"


def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    return {
        "access":  str(refresh.access_token),
        "refresh": str(refresh),
        "user":    UserSerializer(user).data,
    }
