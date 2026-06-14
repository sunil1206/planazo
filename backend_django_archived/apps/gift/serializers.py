from rest_framework import serializers
from .models import (
    GiftCategory, GiftProduct, GiftOrder, GiftSeller,
    ProductImage, ProductVariant, ProductReview,
    Cart, CartItem, MarketplaceOrder, MarketplaceOrderItem,
    ScheduledDelivery,
)


class GiftCategorySerializer(serializers.ModelSerializer):
    icon_url = serializers.ReadOnlyField()

    class Meta:
        model  = GiftCategory
        fields = ["id", "name", "emoji", "icon_url", "order"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProductImage
        fields = ["id", "image", "order"]


class ProductVariantSerializer(serializers.ModelSerializer):
    effective_price = serializers.ReadOnlyField()

    class Meta:
        model  = ProductVariant
        fields = ["id", "name", "sku", "price", "effective_price", "stock", "is_active"]


class ProductReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProductReview
        fields = [
            "id", "reviewer_name", "rating", "title", "comment",
            "is_verified_purchase", "created_at",
        ]
        read_only_fields = ["is_verified_purchase", "created_at"]


class GiftProductSerializer(serializers.ModelSerializer):
    """Public product listing."""
    category_name  = serializers.CharField(source="category.name",         read_only=True)
    category_emoji = serializers.CharField(source="category.emoji",        read_only=True)
    seller_name    = serializers.CharField(source="seller.business_name",  read_only=True)
    avg_rating     = serializers.ReadOnlyField()
    review_count   = serializers.ReadOnlyField()
    discount_pct   = serializers.ReadOnlyField()
    images         = ProductImageSerializer(many=True, read_only=True)
    variants       = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model  = GiftProduct
        fields = [
            "id", "slug", "name", "short_desc", "description", "price", "compare_price",
            "image", "stock", "sku", "tags", "is_available", "is_featured", "is_cod",
            "avg_rating", "review_count", "discount_pct",
            "category", "category_name", "category_emoji",
            "seller", "seller_name",
            "images", "variants",
        ]


class GiftProductDetailSerializer(GiftProductSerializer):
    """Full product detail with reviews."""
    reviews = serializers.SerializerMethodField()

    class Meta(GiftProductSerializer.Meta):
        fields = GiftProductSerializer.Meta.fields + ["reviews"]

    def get_reviews(self, obj):
        qs = obj.product_reviews.filter(is_approved=True)[:20]
        return ProductReviewSerializer(qs, many=True).data


class GiftSellerSerializer(serializers.ModelSerializer):
    logo_url      = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model  = GiftSeller
        fields = [
            "id", "business_name", "description", "logo", "logo_url",
            "phone", "email", "gstin", "bank_account", "ifsc",
            "status", "commission_pct", "product_count", "created_at",
        ]
        read_only_fields = ["status", "commission_pct"]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None

    def get_product_count(self, obj):
        return obj.products.count()


class WritableVariantSerializer(serializers.ModelSerializer):
    """Variant serializer that accepts id for updates."""
    id = serializers.IntegerField(required=False)

    class Meta:
        model  = ProductVariant
        fields = ["id", "name", "sku", "price", "stock", "is_active"]


class SellerProductSerializer(serializers.ModelSerializer):
    """Full product serializer for seller CRUD — includes write access + variants."""
    category_name = serializers.CharField(source="category.name", read_only=True)
    avg_rating    = serializers.ReadOnlyField()
    review_count  = serializers.ReadOnlyField()
    discount_pct  = serializers.ReadOnlyField()
    variants      = WritableVariantSerializer(many=True, required=False)

    class Meta:
        model  = GiftProduct
        fields = [
            "id", "slug", "name", "short_desc", "description", "price", "compare_price",
            "image", "stock", "sku", "tags", "is_available", "is_featured", "is_cod",
            "avg_rating", "review_count", "discount_pct",
            "category", "category_name", "created_at", "updated_at",
            "variants",
        ]
        read_only_fields = ["slug", "created_at", "updated_at"]

    def _sync_variants(self, product, variants_data):
        """Create, update, or leave existing variants; don't delete unmentioned ones."""
        for v_data in variants_data:
            v_id = v_data.pop("id", None)
            if v_id:
                ProductVariant.objects.filter(id=v_id, product=product).update(**v_data)
            else:
                ProductVariant.objects.create(product=product, **v_data)

    def create(self, validated_data):
        variants_data = validated_data.pop("variants", [])
        product = super().create(validated_data)
        self._sync_variants(product, variants_data)
        return product

    def update(self, instance, validated_data):
        variants_data = validated_data.pop("variants", None)
        product = super().update(instance, validated_data)
        if variants_data is not None:
            self._sync_variants(product, variants_data)
        return product


class GiftOrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = GiftOrder
        fields = [
            "product", "website", "sender_name", "sender_email", "sender_phone",
            "message", "delivery_type",
            "recipient_name", "address_line1", "address_line2",
            "city", "state", "pincode", "country",
        ]


class GiftOrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model  = GiftOrder
        fields = [
            "id", "product", "product_name", "sender_name", "sender_email",
            "message", "status", "amount", "delivery_address", "created_at",
        ]


# ── Cart ──────────────────────────────────────────────────────────────────────

class CartItemSerializer(serializers.ModelSerializer):
    product_name  = serializers.CharField(source="product.name",   read_only=True)
    product_image = serializers.ImageField(source="product.image",  read_only=True)
    variant_name  = serializers.CharField(source="variant.name",   read_only=True, allow_null=True)
    unit_price    = serializers.ReadOnlyField()
    line_total    = serializers.ReadOnlyField()

    class Meta:
        model  = CartItem
        fields = [
            "id", "product", "product_name", "product_image",
            "variant", "variant_name", "quantity", "unit_price", "line_total",
        ]


class CartSerializer(serializers.ModelSerializer):
    items      = CartItemSerializer(many=True, read_only=True)
    total      = serializers.ReadOnlyField()
    item_count = serializers.ReadOnlyField()

    class Meta:
        model  = Cart
        fields = ["id", "items", "total", "item_count", "updated_at"]


# ── Marketplace Order ─────────────────────────────────────────────────────────

class MarketplaceOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketplaceOrderItem
        fields = [
            "id", "product_name", "variant_name", "unit_price",
            "quantity", "line_total", "item_status", "tracking_url",
        ]


class MarketplaceOrderSerializer(serializers.ModelSerializer):
    items = MarketplaceOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model  = MarketplaceOrder
        fields = [
            "id", "order_number", "buyer_name", "buyer_email", "buyer_phone",
            "address_line1", "address_line2", "city", "state", "pincode", "country",
            "subtotal", "shipping_charge", "discount", "total_amount",
            "razorpay_order_id", "status", "notes", "items", "created_at", "updated_at",
        ]
        read_only_fields = ["order_number", "created_at", "updated_at"]


class MarketplaceOrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketplaceOrder
        fields = [
            "buyer_name", "buyer_email", "buyer_phone",
            "address_line1", "address_line2", "city", "state", "pincode", "country",
            "notes",
        ]


# ── Scheduled Delivery ─────────────────────────────────────────────────────────

class ScheduledDeliverySerializer(serializers.ModelSerializer):
    product_name      = serializers.CharField(source="product.name", read_only=True)
    product_image_url = serializers.SerializerMethodField()
    delivery_type_display = serializers.CharField(source="get_delivery_type_display", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    fulfilment_status_display = serializers.CharField(source="get_fulfilment_status_display", read_only=True)

    class Meta:
        model  = ScheduledDelivery
        fields = [
            "id", "delivery_type", "delivery_type_display",
            "product", "product_name", "product_image_url", "product_qty",
            "postcard_message", "postcard_template",
            "occasion", "scheduled_date", "notes_for_team",
            # Sender
            "sender_name", "sender_email", "sender_phone",
            "sender_address_line1", "sender_address_line2",
            "sender_city", "sender_state", "sender_pincode",
            # Recipient
            "recipient_name", "recipient_email", "recipient_phone",
            "recipient_address_line1", "recipient_address_line2",
            "recipient_city", "recipient_state", "recipient_pincode", "recipient_country",
            # Payment
            "amount", "payment_status", "payment_status_display",
            "razorpay_order_id", "razorpay_payment_id",
            # Fulfilment
            "fulfilment_status", "fulfilment_status_display",
            "tracking_info", "dispatched_at",
            "website", "is_subscription",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "razorpay_order_id", "razorpay_payment_id",
            "payment_status", "fulfilment_status",
            "dispatched_at", "created_at", "updated_at",
        ]

    def get_product_image_url(self, obj):
        if obj.product and obj.product.image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.product.image.url)
        return None


class ScheduledDeliveryCreateSerializer(serializers.ModelSerializer):
    """Used for creating a new scheduled delivery (user-facing)."""
    class Meta:
        model  = ScheduledDelivery
        fields = [
            "delivery_type",
            "product", "product_qty",
            "postcard_message", "postcard_template",
            "occasion", "scheduled_date",
            "sender_name", "sender_email", "sender_phone",
            "sender_address_line1", "sender_address_line2",
            "sender_city", "sender_state", "sender_pincode",
            "recipient_name", "recipient_email", "recipient_phone",
            "recipient_address_line1", "recipient_address_line2",
            "recipient_city", "recipient_state", "recipient_pincode", "recipient_country",
            "amount", "website",
        ]
