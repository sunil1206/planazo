from rest_framework import serializers
from .models import VendorWebsite, VendorPortfolioImage, VendorEnquiry, VendorReview, PortfolioCategory, VendorPackage, SubscriptionPlan, VendorSubscription, VendorFavorite


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SubscriptionPlan
        fields = [
            "id", "tier", "name", "price_monthly", "price_yearly",
            "max_packages", "max_portfolio_images", "featured_placement",
            "analytics_access", "enquiry_management", "custom_theme",
            "priority_support", "description", "features_list",
        ]


class VendorSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model  = VendorSubscription
        fields = [
            "id", "plan", "status", "is_yearly",
            "razorpay_subscription_id", "current_period_start",
            "current_period_end", "is_active", "created_at",
        ]
        read_only_fields = ["created_at", "current_period_start"]


class VendorPackageSerializer(serializers.ModelSerializer):
    price_display = serializers.ReadOnlyField()

    class Meta:
        model  = VendorPackage
        fields = [
            "id", "name", "price", "price_display", "description",
            "features", "max_hours", "delivery_days",
            "is_popular", "allows_custom", "is_available", "created_at",
        ]
        read_only_fields = ["created_at"]


class PortfolioCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = PortfolioCategory
        fields = ["id", "name", "emoji", "order"]


class PortfolioImageSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    class Meta:
        model  = VendorPortfolioImage
        fields = ["id", "title", "picture", "category", "category_name", "created_at"]
        read_only_fields = ["created_at"]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None


class VendorReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model  = VendorReview
        fields = ["id", "reviewer_name", "rating", "comment", "created_at"]

    def get_reviewer_name(self, obj):
        return obj.reviewer.full_name if obj.reviewer else "Anonymous"


class VendorWebsiteSerializer(serializers.ModelSerializer):
    avg_rating        = serializers.ReadOnlyField()
    review_count      = serializers.SerializerMethodField()
    portfolio_count   = serializers.SerializerMethodField()
    starting_price    = serializers.SerializerMethodField()
    subscription_tier = serializers.SerializerMethodField()

    class Meta:
        model  = VendorWebsite
        fields = [
            "id", "title", "category", "bio", "tagline", "thumbnail", "cover_image",
            "theme_color", "phone", "email", "city", "address", "website", "instagram",
            "slug", "is_verified", "is_active", "avg_rating", "review_count",
            "portfolio_count", "starting_price", "subscription_tier", "created_at",
        ]
        read_only_fields = ["slug", "is_verified", "created_at"]

    def get_review_count(self, obj):
        return obj.reviews.filter(is_approved=True).count()

    def get_portfolio_count(self, obj):
        return obj.portfolio.count()

    def get_starting_price(self, obj):
        """Lowest available package price for display on listing cards."""
        pkg = obj.packages.filter(is_available=True).order_by("price").first()
        return float(pkg.price) if pkg else None

    def get_subscription_tier(self, obj):
        try:
            return obj.subscription.plan.tier
        except Exception:
            return "FREE"


class VendorDetailSerializer(VendorWebsiteSerializer):
    """Full detail — includes portfolio + reviews + categories + packages."""
    portfolio            = PortfolioImageSerializer(many=True, read_only=True)
    reviews              = serializers.SerializerMethodField()
    portfolio_categories = PortfolioCategorySerializer(many=True, read_only=True)
    packages             = serializers.SerializerMethodField()

    class Meta(VendorWebsiteSerializer.Meta):
        fields = VendorWebsiteSerializer.Meta.fields + ["portfolio", "reviews", "portfolio_categories", "packages"]

    def get_reviews(self, obj):
        qs = obj.reviews.filter(is_approved=True)
        return VendorReviewSerializer(qs, many=True).data

    def get_packages(self, obj):
        qs = obj.packages.filter(is_available=True)
        return VendorPackageSerializer(qs, many=True).data


class EnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model  = VendorEnquiry
        fields = ["id", "name", "email", "phone", "event_date", "message", "status", "created_at"]
        read_only_fields = ["status", "created_at"]


class VendorFavoriteSerializer(serializers.ModelSerializer):
    vendor = VendorWebsiteSerializer(read_only=True)
    vendor_id = serializers.IntegerField(write_only=True)

    class Meta:
        model  = VendorFavorite
        fields = ["id", "vendor", "vendor_id", "created_at"]
        read_only_fields = ["created_at"]
