from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import (
    CoupleWebsite, BrideGroom, BrideGroomStory,
    BrideGroomEvent, WeddingCountdown, InvitationRSVP, Makeyourwish, PageVisit,
    WeddingGalleryPhoto, WeddingVendor,
)
from .serializers import (
    CoupleWebsiteSerializer, CoupleWebsiteDetailSerializer,
    BrideGroomSerializer, StorySerializer, EventSerializer,
    CountdownSerializer, RSVPSerializer, WishSerializer,
    WeddingGalleryPhotoSerializer, WeddingVendorSerializer,
)
from .permissions import IsOwner


class CoupleWebsiteViewSet(viewsets.ModelViewSet):
    """
    CRUD for couple's wedding websites.
    List: basic fields. Retrieve (single): full nested detail for editor.
    Public invite page uses PublicInviteView.
    """
    serializer_class   = CoupleWebsiteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CoupleWebsite.objects.filter(account=self.request.user)

    def get_serializer_class(self):
        # Return full nested detail when fetching a single invitation (for the editor)
        if self.action == "retrieve":
            return CoupleWebsiteDetailSerializer
        return CoupleWebsiteSerializer

    def perform_create(self, serializer):
        serializer.save(account=self.request.user)

    # Nested: BrideGroom
    @action(detail=True, methods=["get", "post", "patch"], url_path="bridegroom")
    def bridegroom(self, request, pk=None):
        website = self.get_object()
        if request.method == "GET":
            try:
                s = BrideGroomSerializer(website.bridegroom)
                return Response(s.data)
            except BrideGroom.DoesNotExist:
                return Response({})
        if request.method in ["POST", "PATCH"]:
            instance = getattr(website, "bridegroom", None)
            partial = request.method == "PATCH"
            s = BrideGroomSerializer(instance, data=request.data, partial=partial)
            s.is_valid(raise_exception=True)
            s.save(website=website)
            return Response(s.data, status=status.HTTP_200_OK)

    # Nested: Stories
    @action(detail=True, methods=["get", "post"], url_path="stories")
    def stories(self, request, pk=None):
        website = self.get_object()
        if request.method == "GET":
            return Response(StorySerializer(website.stories.all(), many=True).data)
        s = StorySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(website=website)
        return Response(s.data, status=status.HTTP_201_CREATED)

    # Nested: Events
    @action(detail=True, methods=["get", "post"], url_path="events")
    def events(self, request, pk=None):
        website = self.get_object()
        if request.method == "GET":
            return Response(EventSerializer(website.events.all(), many=True).data)
        s = EventSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(website=website)
        return Response(s.data, status=status.HTTP_201_CREATED)

    # Nested: Countdown
    @action(detail=True, methods=["get", "post", "patch"], url_path="countdown")
    def countdown(self, request, pk=None):
        website = self.get_object()
        if request.method == "GET":
            try:
                return Response(CountdownSerializer(website.countdown).data)
            except WeddingCountdown.DoesNotExist:
                return Response({})
        instance = getattr(website, "countdown", None)
        partial = request.method == "PATCH"
        s = CountdownSerializer(instance, data=request.data, partial=partial)
        s.is_valid(raise_exception=True)
        s.save(website=website)
        return Response(s.data)

    # RSVPs (owner views responses)
    @action(detail=True, methods=["get"], url_path="rsvps")
    def rsvps(self, request, pk=None):
        website = self.get_object()
        return Response(RSVPSerializer(website.rsvps.all(), many=True).data)

    @action(detail=True, methods=["get"], url_path="gallery-token")
    def gallery_token(self, request, pk=None):
        """Return the gallery token so the couple can share it with their photographer."""
        website = self.get_object()
        return Response({"gallery_token": website.gallery_token, "couple": website.couple})

    @action(detail=True, methods=["post"], url_path="upload-thumbnail")
    def upload_thumbnail(self, request, pk=None):
        """Upload / replace the invitation thumbnail/hero image."""
        website = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image file provided."}, status=400)
        website.thumbnail = image
        website.save(update_fields=["thumbnail"])
        return Response({
            "thumbnail": request.build_absolute_uri(website.thumbnail.url),
        })

    @action(detail=True, methods=["get", "post"], url_path="vendors")
    def vendors(self, request, pk=None):
        """
        GET  → list vendors attached to this wedding.
        POST { "vendor_id": 5, "service_note": "Bridal Photography" } → add vendor.
        """
        website = self.get_object()
        if request.method == "GET":
            qs = website.wedding_vendors.select_related("vendor").order_by("order", "created_at")
            return Response(WeddingVendorSerializer(qs, many=True, context={"request": request}).data)
        # POST — add vendor
        vendor_id    = request.data.get("vendor_id")
        service_note = request.data.get("service_note", "")
        if not vendor_id:
            return Response({"error": "vendor_id is required."}, status=400)
        from apps.vendor.models import VendorWebsite
        vendor = get_object_or_404(VendorWebsite, pk=vendor_id)
        wv, created = WeddingVendor.objects.get_or_create(
            website=website, vendor=vendor,
            defaults={"service_note": service_note},
        )
        if not created and service_note:
            wv.service_note = service_note
            wv.save(update_fields=["service_note"])
        return Response(
            WeddingVendorSerializer(wv, context={"request": request}).data,
            status=201 if created else 200,
        )

    @action(detail=True, methods=["delete"], url_path=r"vendors/(?P<vendor_id>\d+)/remove")
    def remove_vendor(self, request, pk=None, vendor_id=None):
        """DELETE vendor from this wedding."""
        website = self.get_object()
        WeddingVendor.objects.filter(website=website, vendor_id=vendor_id).delete()
        return Response(status=204)

    @action(detail=False, methods=["post"], url_path="verify-gallery-token",
            permission_classes=[AllowAny])
    def verify_gallery_token(self, request):
        """
        Vendor/photographer calls this to verify a token and get the wedding website_id.
        POST { "token": "ABCDEF" }
        Returns { "website_id": 3, "couple": "Priya & Arjun", "slug": "priya-arjun" }
        """
        token = request.data.get("token", "").strip().upper()
        if not token:
            return Response({"error": "Token is required."}, status=400)
        try:
            website = CoupleWebsite.objects.get(gallery_token=token)
        except CoupleWebsite.DoesNotExist:
            return Response({"error": "Invalid token. Please check with your couple."}, status=404)
        return Response({
            "website_id": website.id,
            "couple":     website.couple,
            "slug":       website.slug,
        })


class PublicInviteView(viewsets.ViewSet):
    """
    Public endpoints — no auth required.
    Used by Next.js for SSR invitation page.
    """
    permission_classes = [AllowAny]

    def retrieve(self, request, pk=None):
        # pk holds the slug value from the URL — DefaultRouter always uses pk
        # Check for preview token in query params
        preview_token = request.query_params.get("preview", "")
        website = get_object_or_404(CoupleWebsite, slug=pk)

        # If not published, only allow with matching preview token
        if not website.is_published:
            if not preview_token or preview_token != website.gallery_token:
                return Response(
                    {"error": "Invitation Not Found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Track visit
        ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))
        PageVisit.objects.create(website=website, ip_address=ip.split(",")[0].strip())
        CoupleWebsite.objects.filter(pk=website.pk).update(views=website.views + 1)
        return Response(CoupleWebsiteDetailSerializer(website, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="rsvp")
    def rsvp(self, request, pk=None):
        website = get_object_or_404(CoupleWebsite, slug=pk, is_published=True)
        s = RSVPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(website=website)
        return Response({"message": "RSVP saved!"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="wish")
    def wish(self, request, pk=None):
        website = get_object_or_404(CoupleWebsite, slug=pk, is_published=True)
        s = WishSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        s.save(website=website)
        return Response({"message": "Wish saved!"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="photos")
    def photos(self, request, pk=None):
        """List all approved gallery photos for a wedding."""
        website = get_object_or_404(CoupleWebsite, slug=pk, is_published=True)
        tag = request.query_params.get("tag")
        qs  = website.guest_photos.filter(is_approved=True)
        if tag:
            qs = qs.filter(tag=tag)
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 48))
        start    = (page - 1) * per_page
        photos   = qs[start:start + per_page]
        s = WeddingGalleryPhotoSerializer(photos, many=True, context={"request": request})
        return Response({
            "results": s.data,
            "count":   qs.count(),
            "page":    page,
            "total_pages": -(-qs.count() // per_page),
        })

    @action(detail=True, methods=["post"], url_path="upload-photo")
    def upload_photo(self, request, pk=None):
        """Guest or photographer uploads a photo to the gallery."""
        website = get_object_or_404(CoupleWebsite, slug=pk, is_published=True)
        image   = request.FILES.get("image")
        if not image:
            return Response({"error": "No image provided."}, status=400)
        tag           = request.data.get("tag", "other")
        caption       = request.data.get("caption", "")
        uploader_name = request.data.get("uploader_name", "Guest")
        photo = WeddingGalleryPhoto.objects.create(
            website=website,
            image=image,
            tag=tag,
            caption=caption,
            uploader_name=uploader_name,
        )
        s = WeddingGalleryPhotoSerializer(photo, context={"request": request})
        return Response(s.data, status=status.HTTP_201_CREATED)
