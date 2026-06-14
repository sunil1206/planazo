import hashlib, hmac
import razorpay
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from .models import VendorWebsite, VendorPortfolioImage, VendorEnquiry, VendorReview, PortfolioCategory, VendorPackage, SubscriptionPlan, VendorSubscription, VendorFavorite
from .serializers import (
    VendorWebsiteSerializer, VendorDetailSerializer,
    PortfolioImageSerializer, PortfolioCategorySerializer,
    VendorPackageSerializer, EnquirySerializer, VendorReviewSerializer,
    SubscriptionPlanSerializer, VendorSubscriptionSerializer, VendorFavoriteSerializer,
)
from .filters import VendorFilter

try:
    rzp = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
except Exception:
    rzp = None


class VendorWebsiteViewSet(viewsets.ModelViewSet):
    """
    Public list/detail + authenticated owner CRUD.
    GET /api/vendors/?category=PHOTOGRAPHER&city=Kochi&search=wedding
    """
    queryset         = VendorWebsite.objects.filter(is_active=True)
    lookup_field     = "slug"          # ← all detail actions use slug, not pk
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class  = VendorFilter
    search_fields    = ["title", "bio", "city"]
    ordering_fields  = ["created_at", "title"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VendorDetailSerializer
        return VendorWebsiteSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(account=self.request.user)

    def get_queryset(self):
        qs = VendorWebsite.objects.filter(is_active=True)
        if self.action in ["update", "partial_update", "destroy"]:
            qs = qs.filter(account=self.request.user)
        return qs

    @action(detail=False, methods=["get"], url_path="me", permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get the current user's vendor profile."""
        try:
            vendor = VendorWebsite.objects.get(account=request.user)
            return Response(VendorDetailSerializer(vendor, context={"request": request}).data)
        except VendorWebsite.DoesNotExist:
            return Response({"detail": "No vendor profile."}, status=404)

    @action(detail=True, methods=["post"], url_path="upload-thumbnail", permission_classes=[IsAuthenticated])
    def upload_thumbnail(self, request, slug=None):
        """Upload vendor profile thumbnail (slug-based URL)."""
        vendor = self.get_object()
        if vendor.account != request.user:
            return Response({"detail": "Not allowed."}, status=403)
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image file provided."}, status=400)
        vendor.thumbnail = image
        vendor.save()   # full save so resize() runs
        return Response({"thumbnail": request.build_absolute_uri(vendor.thumbnail.url)})

    @action(detail=True, methods=["post"], url_path="upload-cover", permission_classes=[IsAuthenticated])
    def upload_cover(self, request, slug=None):
        """Upload vendor cover/banner image (slug-based URL)."""
        vendor = self.get_object()
        if vendor.account != request.user:
            return Response({"detail": "Not allowed."}, status=403)
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image file provided."}, status=400)
        vendor.cover_image = image
        vendor.save()   # full save so resize() runs
        return Response({"cover_image": request.build_absolute_uri(vendor.cover_image.url)})

    @action(detail=True, methods=["post"], url_path="enquire", permission_classes=[AllowAny])
    def enquire(self, request, slug=None):
        vendor = self.get_object()
        s = EnquirySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(vendor=vendor)
        return Response({"message": "Enquiry sent!"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="review", permission_classes=[IsAuthenticated])
    def review(self, request, slug=None):
        vendor = self.get_object()
        s = VendorReviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(vendor=vendor, reviewer=request.user)
        return Response({"message": "Review submitted for approval."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="portfolio",
            permission_classes=[IsAuthenticatedOrReadOnly])
    def portfolio(self, request, slug=None):
        vendor = self.get_object()
        if request.method == "GET":
            qs = vendor.portfolio.all()
            cat = request.query_params.get("category")
            if cat:
                qs = qs.filter(category_id=cat)
            return Response(PortfolioImageSerializer(qs, many=True, context={"request": request}).data)
        if vendor.account != request.user:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        s = PortfolioImageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(vendor=vendor)
        return Response(s.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"portfolio/(?P<img_id>\d+)",
            permission_classes=[IsAuthenticated])
    def delete_portfolio_image(self, request, slug=None, img_id=None):
        vendor = self.get_object()
        if vendor.account != request.user:
            return Response({"detail": "Not allowed."}, status=403)
        img = get_object_or_404(VendorPortfolioImage, pk=img_id, vendor=vendor)
        img.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Portfolio categories ────────────────────────────────────────────────
    @action(detail=True, methods=["get", "post"], url_path="categories",
            permission_classes=[IsAuthenticatedOrReadOnly])
    def categories(self, request, slug=None):
        vendor = self.get_object()
        if request.method == "GET":
            return Response(PortfolioCategorySerializer(
                vendor.portfolio_categories.all(), many=True).data)
        if vendor.account != request.user:
            return Response({"detail": "Not allowed."}, status=403)
        s = PortfolioCategorySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(vendor=vendor)
        return Response(s.data, status=201)

    # ── Pricing packages ────────────────────────────────────────────────
    @action(detail=True, methods=["get", "post"], url_path="packages",
            permission_classes=[IsAuthenticatedOrReadOnly])
    def packages(self, request, slug=None):
        vendor = self.get_object()
        if request.method == "GET":
            qs = vendor.packages.filter(is_available=True)
            return Response(VendorPackageSerializer(qs, many=True).data)
        if vendor.account != request.user:
            return Response({"detail": "Not allowed."}, status=403)
        s = VendorPackageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(vendor=vendor)
        return Response(s.data, status=201)

    @action(detail=True, methods=["patch", "delete"], url_path=r"packages/(?P<pkg_id>\d+)",
            permission_classes=[IsAuthenticated])
    def package_detail(self, request, slug=None, pkg_id=None):
        vendor = self.get_object()
        if vendor.account != request.user:
            return Response({"detail": "Not allowed."}, status=403)
        pkg = get_object_or_404(VendorPackage, pk=pkg_id, vendor=vendor)
        if request.method == "DELETE":
            pkg.delete()
            return Response(status=204)
        s = VendorPackageSerializer(pkg, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)

    @action(detail=True, methods=["patch", "delete"], url_path=r"categories/(?P<cat_id>\d+)",
            permission_classes=[IsAuthenticated])
    def category_detail(self, request, slug=None, cat_id=None):
        vendor = self.get_object()
        if vendor.account != request.user:
            return Response({"detail": "Not allowed."}, status=403)
        cat = get_object_or_404(PortfolioCategory, pk=cat_id, vendor=vendor)
        if request.method == "DELETE":
            cat.delete()
            return Response(status=204)
        s = PortfolioCategorySerializer(cat, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class PlannerView(viewsets.ViewSet):
    """
    Rule-based event planner — matches vendors by city + category + budget.
    POST /api/vendors/planner/
    Body: { event_type, city, total_budget, priorities: {PHOTOGRAPHER:.4,...}, category }
    """
    permission_classes = [AllowAny]

    def create(self, request):
        city          = request.data.get("city", "")
        total_budget  = float(request.data.get("total_budget", 0) or 0)
        priorities    = request.data.get("priorities", {})
        categories    = request.data.get("categories", list(VendorWebsite.CATEGORY_CHOICES))

        # Default allocation if not provided
        default_alloc = {
            "PHOTOGRAPHER": 0.20,
            "EVENT":        0.15,
            "DECOR":        0.25,
            "CATERING":     0.30,
            "MAKEUP":       0.05,
            "MUSIC":        0.05,
        }
        allocation = {k: priorities.get(k, v) for k, v in default_alloc.items()}

        results = {}
        for cat, pct in allocation.items():
            budget_for_cat = total_budget * pct
            qs = VendorWebsite.objects.filter(is_active=True, category=cat)
            if city:
                qs = qs.filter(city__icontains=city) | VendorWebsite.objects.filter(is_active=True, category=cat)
            # Match vendors whose cheapest package is within budget
            matched = []
            for v in qs[:20]:
                pkg = v.packages.filter(is_available=True).order_by("price").first()
                price = float(pkg.price) if pkg else 0
                if price == 0 or price <= budget_for_cat:
                    matched.append({
                        "id":            v.id,
                        "slug":          v.slug,
                        "title":         v.title,
                        "city":          v.city,
                        "thumbnail":     request.build_absolute_uri(v.thumbnail.url) if v.thumbnail else None,
                        "starting_price": price or None,
                        "is_verified":   v.is_verified,
                        "avg_rating":    v.avg_rating,
                    })
                if len(matched) >= 3:
                    break
            results[cat] = {
                "budget":    round(budget_for_cat),
                "vendors":   matched,
            }

        return Response({"recommendations": results})


class VendorEnquiryViewSet(viewsets.ReadOnlyModelViewSet):
    """Vendor sees their own enquiries."""
    serializer_class   = EnquirySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return VendorEnquiry.objects.filter(vendor__account=self.request.user)

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        enquiry = self.get_object()
        new_status = request.data.get("status")
        if new_status not in [VendorEnquiry.SEEN, VendorEnquiry.REPLIED]:
            return Response({"error": "Invalid status"}, status=400)
        enquiry.status = new_status
        enquiry.save(update_fields=["status"])
        return Response({"status": new_status})


class SubscriptionViewSet(viewsets.ViewSet):
    """
    Vendor subscription management with Razorpay.
    GET  /api/vendors/subscriptions/plans/  — list all plans
    GET  /api/vendors/subscriptions/me/     — current vendor subscription
    POST /api/vendors/subscriptions/create-order/ — create Razorpay order
    POST /api/vendors/subscriptions/verify/        — verify payment + activate
    POST /api/vendors/subscriptions/cancel/        — cancel subscription
    """

    @action(detail=False, methods=["get"], url_path="plans", permission_classes=[AllowAny])
    def plans(self, request):
        plans = SubscriptionPlan.objects.all().order_by("price_monthly")
        return Response(SubscriptionPlanSerializer(plans, many=True).data)

    @action(detail=False, methods=["get"], url_path="me", permission_classes=[IsAuthenticated])
    def my_subscription(self, request):
        try:
            vendor = request.user.vendor_website
        except Exception:
            return Response({"detail": "No vendor profile."}, status=404)
        try:
            sub = vendor.subscription
            return Response(VendorSubscriptionSerializer(sub).data)
        except VendorSubscription.DoesNotExist:
            # Return free plan info
            free_plan = SubscriptionPlan.objects.get(tier=SubscriptionPlan.FREE)
            return Response({
                "plan": SubscriptionPlanSerializer(free_plan).data,
                "status": "ACTIVE",
                "is_active": True,
                "current_period_end": None,
            })

    @action(detail=False, methods=["post"], url_path="create-order", permission_classes=[IsAuthenticated])
    def create_order(self, request):
        """Create Razorpay order for subscription payment."""
        tier      = request.data.get("tier", "PRO")
        is_yearly = request.data.get("is_yearly", False)

        try:
            plan = SubscriptionPlan.objects.get(tier=tier)
        except SubscriptionPlan.DoesNotExist:
            return Response({"error": "Invalid plan."}, status=400)

        amount = int(plan.price_yearly * 100) if is_yearly else int(plan.price_monthly * 100)
        if amount == 0:
            return Response({"error": "Cannot pay for free plan."}, status=400)

        if not rzp:
            # Dev mode — return mock order
            return Response({
                "razorpay_order_id": "dev_order_mock",
                "amount": amount,
                "currency": "INR",
                "key": getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_key"),
                "plan_tier": tier,
                "is_yearly": is_yearly,
            })

        try:
            order = rzp.order.create({
                "amount": amount,
                "currency": "INR",
                "notes": {"plan_tier": tier, "vendor_id": str(request.user.pk), "is_yearly": str(is_yearly)},
            })
            return Response({
                "razorpay_order_id": order["id"],
                "amount": amount,
                "currency": "INR",
                "key": settings.RAZORPAY_KEY_ID,
                "plan_tier": tier,
                "is_yearly": is_yearly,
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=["post"], url_path="verify", permission_classes=[IsAuthenticated])
    def verify_payment(self, request):
        """Verify Razorpay payment signature and activate subscription."""
        razorpay_order_id   = request.data.get("razorpay_order_id", "")
        razorpay_payment_id = request.data.get("razorpay_payment_id", "")
        razorpay_signature  = request.data.get("razorpay_signature", "")
        tier                = request.data.get("plan_tier", "PRO")
        is_yearly           = request.data.get("is_yearly", False)

        # Dev mode bypass
        if razorpay_order_id.startswith("dev_"):
            pass
        elif rzp:
            try:
                rzp.utility.verify_payment_signature({
                    "razorpay_order_id":   razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature":  razorpay_signature,
                })
            except Exception:
                return Response({"error": "Payment verification failed."}, status=400)

        try:
            vendor = request.user.vendor_website
            plan   = SubscriptionPlan.objects.get(tier=tier)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        period_days = 365 if is_yearly else 30
        sub, created = VendorSubscription.objects.update_or_create(
            vendor=vendor,
            defaults={
                "plan":                     plan,
                "status":                   VendorSubscription.ACTIVE,
                "is_yearly":                is_yearly,
                "razorpay_payment_id":      razorpay_payment_id,
                "current_period_end":       timezone.now() + timedelta(days=period_days),
            },
        )
        return Response(VendorSubscriptionSerializer(sub).data)

    @action(detail=False, methods=["post"], url_path="cancel", permission_classes=[IsAuthenticated])
    def cancel(self, request):
        try:
            vendor = request.user.vendor_website
            sub    = vendor.subscription
            free   = SubscriptionPlan.objects.get(tier=SubscriptionPlan.FREE)
            sub.status = VendorSubscription.CANCELLED
            sub.plan   = free
            sub.save()
            return Response({"message": "Subscription cancelled. Reverted to Free plan."})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


# ── Favorites ─────────────────────────────────────────────────────────────────

class VendorFavoriteViewSet(viewsets.ViewSet):
    """
    Couple's saved vendor favorites.
    GET    /api/vendors/favorites/          — list my favorites
    POST   /api/vendors/favorites/          — add { vendor_id }
    DELETE /api/vendors/favorites/{id}/     — remove by favorite record id
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="", url_name="list")
    def list_favorites(self, request):
        qs = VendorFavorite.objects.filter(user=request.user).select_related("vendor")
        return Response(VendorFavoriteSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="", url_name="add")
    def add_favorite(self, request):
        vendor_id = request.data.get("vendor_id")
        if not vendor_id:
            return Response({"error": "vendor_id required"}, status=400)
        vendor = get_object_or_404(VendorWebsite, id=vendor_id)
        fav, created = VendorFavorite.objects.get_or_create(user=request.user, vendor=vendor)
        return Response(
            VendorFavoriteSerializer(fav, context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete"], url_path="", url_name="remove")
    def remove_favorite(self, request, pk=None):
        """pk is vendor_id here (so couples can unfav by vendor id directly)."""
        deleted, _ = VendorFavorite.objects.filter(user=request.user, vendor_id=pk).delete()
        if not deleted:
            return Response({"error": "Not in favorites"}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)
