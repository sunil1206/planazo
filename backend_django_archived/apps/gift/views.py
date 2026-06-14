import hashlib, hmac
import razorpay
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.invitation.models import CoupleWebsite
from .models import (
    GiftCategory, GiftProduct, GiftOrder, GiftSeller,
    ProductImage, ProductVariant, ProductReview,
    Cart, CartItem, MarketplaceOrder, MarketplaceOrderItem,
)
from .serializers import (
    GiftCategorySerializer, GiftProductSerializer, GiftProductDetailSerializer,
    GiftOrderCreateSerializer, GiftOrderSerializer,
    GiftSellerSerializer, SellerProductSerializer,
    ProductVariantSerializer, ProductReviewSerializer,
    CartSerializer, CartItemSerializer,
    MarketplaceOrderSerializer, MarketplaceOrderCreateSerializer,
    MarketplaceOrderItemSerializer,
)

try:
    rzp = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
except Exception:
    rzp = None


class GiftCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = GiftCategory.objects.all()
    serializer_class   = GiftCategorySerializer
    permission_classes = [AllowAny]


class GiftProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Public gift catalog — no auth required."""
    permission_classes = [AllowAny]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ["name", "description", "tags"]
    ordering_fields    = ["price", "created_at", "name"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return GiftProductDetailSerializer
        return GiftProductSerializer

    def get_queryset(self):
        qs = GiftProduct.objects.filter(is_available=True)
        category  = self.request.query_params.get("category")
        featured  = self.request.query_params.get("featured")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        min_rating= self.request.query_params.get("min_rating")
        seller    = self.request.query_params.get("seller")
        if category:
            qs = qs.filter(category_id=category)
        if featured == "1":
            qs = qs.filter(is_featured=True)
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        if seller:
            qs = qs.filter(seller_id=seller)
        return qs

    @action(detail=True, methods=["post"], url_path="review", permission_classes=[AllowAny])
    def add_review(self, request, pk=None):
        product = self.get_object()
        rating  = int(request.data.get("rating", 0))
        if not (1 <= rating <= 5):
            return Response({"error": "Rating must be 1–5."}, status=400)
        review = ProductReview.objects.create(
            product         = product,
            user            = request.user if request.user.is_authenticated else None,
            reviewer_name   = request.data.get("reviewer_name", "Anonymous"),
            rating          = rating,
            title           = request.data.get("title", ""),
            comment         = request.data.get("comment", ""),
        )
        return Response(ProductReviewSerializer(review).data, status=201)


class GiftOrderViewSet(viewsets.ViewSet):
    """Public — guests don't need accounts to send gifts."""
    permission_classes = [AllowAny]

    def create(self, request):
        """
        Step 1: Guest submits order details.
        We create a Razorpay order and return it for frontend checkout.
        """
        ser = GiftOrderCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        product = get_object_or_404(GiftProduct, pk=request.data.get("product"), is_available=True)
        amount  = product.price

        # Create Razorpay order
        rzp_order = None
        rzp_order_id = None
        if rzp:
            try:
                rzp_order = rzp.order.create({
                    "amount":   product.price_paise,
                    "currency": "INR",
                    "receipt":  f"gift_{product.id}_{request.data.get('sender_email', '')[:20]}",
                })
                rzp_order_id = rzp_order["id"]
            except Exception:
                pass

        # Validate delivery address for CUSTOM type
        delivery_type = request.data.get("delivery_type", GiftOrder.COUPLE)
        if delivery_type == GiftOrder.CUSTOM:
            required = ["recipient_name", "address_line1", "city", "state", "pincode"]
            missing  = [f for f in required if not request.data.get(f)]
            if missing:
                return Response(
                    {"error": f"Missing fields for custom delivery: {', '.join(missing)}"},
                    status=400,
                )

        gift_order = GiftOrder.objects.create(
            product             = product,
            website_id          = request.data.get("website"),
            sender_name         = request.data.get("sender_name", ""),
            sender_email        = request.data.get("sender_email", ""),
            sender_phone        = request.data.get("sender_phone", ""),
            message             = request.data.get("message", ""),
            delivery_type       = delivery_type,
            recipient_name      = request.data.get("recipient_name", ""),
            address_line1       = request.data.get("address_line1", ""),
            address_line2       = request.data.get("address_line2", ""),
            city                = request.data.get("city", ""),
            state               = request.data.get("state", ""),
            pincode             = request.data.get("pincode", ""),
            country             = request.data.get("country", "India"),
            amount              = amount,
            razorpay_order_id   = rzp_order_id,
        )

        return Response({
            "order_id":     gift_order.id,
            "rzp_order_id": rzp_order_id,
            "key_id":       getattr(settings, "RAZORPAY_KEY_ID", ""),
            "amount":       product.price_paise,
            "currency":     "INR",
            "product_name": product.name,
            "sender_name":  gift_order.sender_name,
        }, status=201)

    @action(detail=False, methods=["post"], url_path="verify")
    def verify(self, request):
        """
        Step 2: After Razorpay checkout, verify signature & mark paid.
        """
        rzp_order_id   = request.data.get("razorpay_order_id")
        rzp_payment_id = request.data.get("razorpay_payment_id")
        rzp_signature  = request.data.get("razorpay_signature")

        if rzp and rzp_order_id and rzp_payment_id and rzp_signature:
            try:
                rzp.utility.verify_payment_signature({
                    "razorpay_order_id":   rzp_order_id,
                    "razorpay_payment_id": rzp_payment_id,
                    "razorpay_signature":  rzp_signature,
                })
            except Exception:
                return Response({"error": "Payment verification failed."}, status=400)

        order = get_object_or_404(GiftOrder, razorpay_order_id=rzp_order_id)
        order.razorpay_payment_id = rzp_payment_id or ""
        order.status = GiftOrder.PAID
        order.save(update_fields=["razorpay_payment_id", "status"])

        return Response({
            "success": True,
            "order_id": order.id,
            "message":  "Payment confirmed! Your gift is on its way. 🎁",
        })

    @action(detail=False, methods=["get"], url_path="by-wedding")
    def by_wedding(self, request):
        """List gift orders for a wedding (for the couple to see)."""
        slug    = request.query_params.get("slug")
        website = get_object_or_404(CoupleWebsite, slug=slug)
        orders  = GiftOrder.objects.filter(website=website).select_related("product")
        return Response(GiftOrderSerializer(orders, many=True, context={"request": request}).data)


# ── Seller Dashboard ViewSets ────────────────────────────────────────────────

class GiftSellerViewSet(viewsets.ModelViewSet):
    """Seller profile — one per user."""
    serializer_class   = GiftSellerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GiftSeller.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        try:
            seller = request.user.seller_profile
        except GiftSeller.DoesNotExist:
            return Response({"detail": "No seller profile found."}, status=404)
        return Response(GiftSellerSerializer(seller, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """Revenue + order analytics for this seller."""
        try:
            seller = request.user.seller_profile
        except GiftSeller.DoesNotExist:
            return Response({"detail": "No seller profile."}, status=404)

        orders = GiftOrder.objects.filter(
            product__seller=seller
        ).exclude(status=GiftOrder.CANCELLED)

        now = timezone.now()
        last_30 = now - timedelta(days=30)
        last_7  = now - timedelta(days=7)

        total_revenue = orders.filter(status=GiftOrder.PAID).aggregate(
            total=Sum("amount")
        )["total"] or 0

        # Monthly breakdown (last 6 months)
        monthly = []
        for i in range(5, -1, -1):
            start = (now - timedelta(days=30 * (i + 1))).replace(day=1)
            end   = (now - timedelta(days=30 * i)).replace(day=1)
            rev   = orders.filter(
                status__in=[GiftOrder.PAID, GiftOrder.CONFIRMED, GiftOrder.SHIPPED, GiftOrder.DELIVERED],
                created_at__gte=start,
                created_at__lt=end,
            ).aggregate(rev=Sum("amount"))["rev"] or 0
            monthly.append({
                "month": start.strftime("%b %Y"),
                "revenue": float(rev),
            })

        # Top products
        top_products = (
            orders.filter(status=GiftOrder.PAID)
            .values("product__name")
            .annotate(orders=Count("id"), revenue=Sum("amount"))
            .order_by("-revenue")[:5]
        )

        return Response({
            "total_revenue":   float(total_revenue),
            "total_orders":    orders.count(),
            "orders_30d":      orders.filter(created_at__gte=last_30).count(),
            "orders_7d":       orders.filter(created_at__gte=last_7).count(),
            "pending_orders":  orders.filter(status=GiftOrder.PAID).count(),
            "monthly_revenue": monthly,
            "top_products":    list(top_products),
        })


class SellerProductViewSet(viewsets.ModelViewSet):
    """CRUD for seller's own products."""
    serializer_class   = SellerProductSerializer
    permission_classes = [IsAuthenticated]

    def _get_seller(self):
        return get_object_or_404(GiftSeller, user=self.request.user)

    def get_queryset(self):
        seller = self._get_seller()
        return GiftProduct.objects.filter(seller=seller)

    def perform_create(self, serializer):
        seller = self._get_seller()
        serializer.save(seller=seller)

    @action(detail=True, methods=["post"], url_path="upload-image")
    def upload_image(self, request, pk=None):
        """Upload / replace the main product image."""
        product = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image file provided."}, status=400)
        product.image = image
        product.save(update_fields=["image"])
        return Response({
            "image": request.build_absolute_uri(product.image.url),
        })

    @action(detail=True, methods=["post"], url_path="add-gallery-image")
    def add_gallery_image(self, request, pk=None):
        """Add an extra gallery image for the product."""
        from .models import ProductImage
        product = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image file provided."}, status=400)
        order = int(request.data.get("order", 0))
        pi = ProductImage.objects.create(product=product, image=image, order=order)
        return Response({
            "id":    pi.id,
            "image": request.build_absolute_uri(pi.image.url),
            "order": pi.order,
        }, status=201)


class SellerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Seller views their own orders with status update."""
    serializer_class   = GiftOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            seller = self.request.user.seller_profile
        except GiftSeller.DoesNotExist:
            return GiftOrder.objects.none()
        return GiftOrder.objects.filter(
            product__seller=seller
        ).select_related("product", "website")

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        order  = self.get_object()
        new_st = request.data.get("status")
        valid  = [GiftOrder.CONFIRMED, GiftOrder.SHIPPED, GiftOrder.DELIVERED, GiftOrder.CANCELLED]
        if new_st not in valid:
            return Response({"error": f"Invalid status. Choose from: {valid}"}, status=400)
        order.status = new_st
        order.save(update_fields=["status"])
        return Response({"status": order.status})


# ── Cart ViewSet ──────────────────────────────────────────────────────────────

class CartViewSet(viewsets.ViewSet):
    """
    Session-based cart (no auth required, but merges on login).
    GET  /api/gifts/cart/         — get or create cart
    POST /api/gifts/cart/add/     — add item
    PATCH /api/gifts/cart/update/ — update quantity
    DELETE /api/gifts/cart/remove/ — remove item
    POST /api/gifts/cart/checkout/ — create Razorpay order from cart
    POST /api/gifts/cart/verify/   — verify payment + create marketplace order
    """
    permission_classes = [AllowAny]

    def _get_or_create_cart(self, request):
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key
            cart, _ = Cart.objects.get_or_create(session_key=session_key, user=None)
        return cart

    @action(detail=False, methods=["get"])
    def me(self, request):
        cart = self._get_or_create_cart(request)
        return Response(CartSerializer(cart, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="add")
    def add(self, request):
        cart       = self._get_or_create_cart(request)
        product_id = request.data.get("product_id")
        variant_id = request.data.get("variant_id")
        quantity   = int(request.data.get("quantity", 1))

        product = get_object_or_404(GiftProduct, pk=product_id, is_available=True)
        variant = ProductVariant.objects.filter(pk=variant_id).first() if variant_id else None

        item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, variant=variant,
            defaults={"quantity": quantity}
        )
        if not created:
            item.quantity += quantity
            item.save()

        return Response(CartSerializer(cart, context={"request": request}).data)

    @action(detail=False, methods=["patch"], url_path="update")
    def update_item(self, request):
        cart     = self._get_or_create_cart(request)
        item_id  = request.data.get("item_id")
        quantity = int(request.data.get("quantity", 1))
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        if quantity <= 0:
            item.delete()
        else:
            item.quantity = quantity
            item.save()
        return Response(CartSerializer(cart, context={"request": request}).data)

    @action(detail=False, methods=["delete"], url_path="remove")
    def remove(self, request):
        cart    = self._get_or_create_cart(request)
        item_id = request.data.get("item_id")
        CartItem.objects.filter(pk=item_id, cart=cart).delete()
        return Response(CartSerializer(cart, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        """Create Razorpay order from cart contents."""
        cart = self._get_or_create_cart(request)
        items = cart.items.select_related("product", "variant").all()
        if not items.exists():
            return Response({"error": "Cart is empty."}, status=400)

        subtotal = cart.total
        shipping = 0 if subtotal >= 500 else 49   # Free shipping over ₹500
        total    = subtotal + shipping

        amount_paise = int(total * 100)

        rzp_order_id = None
        if rzp:
            try:
                rzp_order = rzp.order.create({
                    "amount":   amount_paise,
                    "currency": "INR",
                    "notes":    {"cart_id": str(cart.id)},
                })
                rzp_order_id = rzp_order["id"]
            except Exception as e:
                pass

        if not rzp_order_id:
            rzp_order_id = f"dev_cart_{cart.id}"

        return Response({
            "razorpay_order_id": rzp_order_id,
            "amount":            amount_paise,
            "currency":          "INR",
            "key":               getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_key"),
            "subtotal":          float(subtotal),
            "shipping":          float(shipping),
            "total":             float(total),
        })

    @action(detail=False, methods=["post"], url_path="verify-order")
    def verify_order(self, request):
        """Verify payment and create marketplace order."""
        razorpay_order_id   = request.data.get("razorpay_order_id", "")
        razorpay_payment_id = request.data.get("razorpay_payment_id", "")
        razorpay_signature  = request.data.get("razorpay_signature", "")
        shipping_data       = request.data.get("shipping", {})

        # Verify signature
        if rzp and not razorpay_order_id.startswith("dev_"):
            try:
                rzp.utility.verify_payment_signature({
                    "razorpay_order_id":   razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature":  razorpay_signature,
                })
            except Exception:
                return Response({"error": "Payment verification failed."}, status=400)

        cart = self._get_or_create_cart(request)
        items = cart.items.select_related("product", "variant", "product__seller").all()
        if not items.exists():
            return Response({"error": "Cart is empty."}, status=400)

        subtotal = cart.total
        shipping = 0 if subtotal >= 500 else 49
        total    = subtotal + shipping

        order = MarketplaceOrder.objects.create(
            user                = request.user if request.user.is_authenticated else None,
            buyer_name          = shipping_data.get("name", ""),
            buyer_email         = shipping_data.get("email", ""),
            buyer_phone         = shipping_data.get("phone", ""),
            address_line1       = shipping_data.get("address_line1", ""),
            address_line2       = shipping_data.get("address_line2", ""),
            city                = shipping_data.get("city", ""),
            state               = shipping_data.get("state", ""),
            pincode             = shipping_data.get("pincode", ""),
            subtotal            = subtotal,
            shipping_charge     = shipping,
            total_amount        = total,
            razorpay_order_id   = razorpay_order_id if not razorpay_order_id.startswith("dev_") else None,
            razorpay_payment_id = razorpay_payment_id,
            razorpay_signature  = razorpay_signature,
            status              = MarketplaceOrder.PAID,
        )

        for item in items:
            MarketplaceOrderItem.objects.create(
                order        = order,
                product      = item.product,
                variant      = item.variant,
                seller       = item.product.seller,
                product_name = item.product.name,
                variant_name = item.variant.name if item.variant else "",
                unit_price   = item.unit_price,
                quantity     = item.quantity,
                line_total   = item.line_total,
            )

        # Clear cart
        cart.items.all().delete()

        return Response({
            "success":      True,
            "order_number": order.order_number,
            "order_id":     order.id,
        })


class MarketplaceOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """User's own marketplace orders."""
    serializer_class   = MarketplaceOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MarketplaceOrder.objects.filter(user=self.request.user).prefetch_related("items")


class SellerMarketplaceOrderViewSet(viewsets.ViewSet):
    """Seller views and fulfils marketplace orders containing their products."""
    permission_classes = [IsAuthenticated]

    def _get_seller(self):
        return get_object_or_404(GiftSeller, user=self.request.user)

    @action(detail=False, methods=["get"], url_path="")
    def list_orders(self, request):
        seller = self._get_seller()
        items  = MarketplaceOrderItem.objects.filter(seller=seller).select_related("order")
        # Group by order
        orders_seen = {}
        for item in items:
            oid = item.order_id
            if oid not in orders_seen:
                orders_seen[oid] = item.order
        orders = list(orders_seen.values())
        return Response(MarketplaceOrderSerializer(orders, many=True).data)

    @action(detail=False, methods=["patch"], url_path=r"item/(?P<item_id>\d+)/status")
    def update_item_status(self, request, item_id=None):
        seller   = self._get_seller()
        item     = get_object_or_404(MarketplaceOrderItem, pk=item_id, seller=seller)
        new_status = request.data.get("status")
        tracking   = request.data.get("tracking_url", "")
        valid = ["PENDING", "SHIPPED", "DELIVERED"]
        if new_status not in valid:
            return Response({"error": f"Status must be one of {valid}"}, status=400)
        item.item_status  = new_status
        item.tracking_url = tracking
        item.save()
        return Response({"status": new_status})


# ── Scheduled Deliveries ───────────────────────────────────────────────────────

from .models import ScheduledDelivery
from .serializers import ScheduledDeliverySerializer, ScheduledDeliveryCreateSerializer
from django.core.mail import send_mail
from django.conf import settings as django_settings


class ScheduledDeliveryViewSet(viewsets.ModelViewSet):
    """
    Authenticated users can create and view their scheduled deliveries.
    Admin staff manage fulfilment status from the gift-admin panel.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScheduledDelivery.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return ScheduledDeliveryCreateSerializer
        return ScheduledDeliverySerializer

    def perform_create(self, serializer):
        delivery = serializer.save(user=self.request.user)
        # Notify admin team by email
        try:
            send_mail(
                subject=f"[Planazo] New Scheduled Delivery — {delivery.get_delivery_type_display()}",
                message=(
                    f"New scheduled delivery created:\n\n"
                    f"Type: {delivery.get_delivery_type_display()}\n"
                    f"From: {delivery.sender_name} ({delivery.sender_email})\n"
                    f"To:   {delivery.recipient_name}\n"
                    f"Date: {delivery.scheduled_date}\n"
                    f"Occasion: {delivery.occasion}\n"
                    f"Amount: ₹{delivery.amount}\n\n"
                    f"Recipient Address:\n"
                    f"{delivery.recipient_address_line1}, {delivery.recipient_city}, "
                    f"{delivery.recipient_state} {delivery.recipient_pincode}\n\n"
                    f"Please log in to the Gift Admin to manage this delivery."
                ),
                from_email=getattr(django_settings, "DEFAULT_FROM_EMAIL", "noreply@planazo.in"),
                recipient_list=[getattr(django_settings, "GIFT_ADMIN_EMAIL", "gifts@planazo.in")],
                fail_silently=True,
            )
        except Exception:
            pass  # Never block order creation on email failure

    @action(detail=True, methods=["post"], url_path="create-payment")
    def create_payment(self, request, pk=None):
        """Create a Razorpay order for a pending scheduled delivery."""
        delivery = self.get_object()
        if delivery.payment_status == ScheduledDelivery.PAY_PAID:
            return Response({"error": "Already paid."}, status=400)
        if rzp is None:
            return Response({"error": "Payment gateway not configured."}, status=503)
        try:
            rp_order = rzp.order.create({
                "amount":   delivery.amount_paise,
                "currency": "INR",
                "receipt":  f"SD{delivery.pk}",
                "notes":    {
                    "type":       delivery.delivery_type,
                    "recipient":  delivery.recipient_name,
                    "schedule":   str(delivery.scheduled_date),
                },
            })
            delivery.razorpay_order_id = rp_order["id"]
            delivery.save()
            return Response({
                "razorpay_order_id": rp_order["id"],
                "amount":            delivery.amount_paise,
                "currency":          "INR",
                "key_id":            getattr(django_settings, "RAZORPAY_KEY_ID", ""),
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=["post"], url_path="verify-payment")
    def verify_payment(self, request, pk=None):
        """Verify Razorpay payment signature and mark delivery as paid."""
        delivery = self.get_object()
        razorpay_order_id   = request.data.get("razorpay_order_id", "")
        razorpay_payment_id = request.data.get("razorpay_payment_id", "")
        razorpay_signature  = request.data.get("razorpay_signature", "")

        if rzp is None:
            return Response({"error": "Payment gateway not configured."}, status=503)

        import hmac, hashlib
        key_secret = getattr(django_settings, "RAZORPAY_KEY_SECRET", "")
        generated_signature = hmac.new(
            key_secret.encode(),
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()

        if generated_signature == razorpay_signature:
            delivery.payment_status      = ScheduledDelivery.PAY_PAID
            delivery.razorpay_payment_id = razorpay_payment_id
            delivery.save()
            # Confirm email to sender
            try:
                send_mail(
                    subject=f"[Planazo] Payment Confirmed — {delivery.get_delivery_type_display()} for {delivery.recipient_name}",
                    message=(
                        f"Dear {delivery.sender_name},\n\n"
                        f"Your payment of ₹{delivery.amount} has been received.\n"
                        f"We will dispatch your {delivery.get_delivery_type_display().lower()} "
                        f"to {delivery.recipient_name} on {delivery.scheduled_date}.\n\n"
                        f"Thank you for choosing Planazo!\n"
                    ),
                    from_email=getattr(django_settings, "DEFAULT_FROM_EMAIL", "noreply@planazo.in"),
                    recipient_list=[delivery.sender_email],
                    fail_silently=True,
                )
            except Exception:
                pass
            return Response({"status": "paid"})
        return Response({"error": "Invalid signature."}, status=400)
