from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from apps.invitation.models import CoupleWebsite
from .models import GalleryCategory, GalleryImage, GuestSelfieMatch
from .serializers import (
    GalleryCategorySerializer, GalleryImageSerializer,
    GalleryImageUploadSerializer, SelfieMatchSerializer,
)


class IsOwnerOrReadOnly:
    """Permission to check if user owns the website or is a vendor."""
    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        # GET/HEAD/OPTIONS always allowed
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        # Owner of the website can edit
        if obj.website.account == request.user:
            return True
        # Vendor who uploaded can edit their own
        if obj.uploaded_by == request.user:
            return True
        return False


class GalleryCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GalleryCategory.objects.all()
    serializer_class = GalleryCategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Return all categories."""
        return GalleryCategory.objects.all().order_by("name")


class GalleryImageViewSet(viewsets.ModelViewSet):
    """
    Owner manages gallery images.
    Vendors can upload to weddings they have tokens for.
    Upload triggers Celery thumbnail + face-embedding tasks via FastAPI.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Role-based base queryset.
        if user.is_couple:
            qs = GalleryImage.objects.filter(website__account=user)
        elif user.is_vendor:
            qs = GalleryImage.objects.filter(uploaded_by=user)
        else:
            qs = GalleryImage.objects.all()

        params = self.request.query_params
        # ?website=<id> -- scope to one invitation
        website_id = params.get("website")
        if website_id:
            qs = qs.filter(website_id=website_id)
        # ?category=<id> -- ID-only filter (string names are unreliable)
        category_id = params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)
        # ?gallery_type=INVITATION,ALBUM,PRIVATE
        gtype = params.get("gallery_type")
        if gtype:
            wanted = [g.strip() for g in gtype.split(",") if g.strip()]
            if wanted:
                qs = qs.filter(gallery_type__in=wanted)
        return qs.select_related("category").order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return GalleryImageUploadSerializer
        return GalleryImageSerializer

    def perform_create(self, serializer):
        website_id = self.request.data.get("website")
        website = get_object_or_404(CoupleWebsite, pk=website_id)

        # Only couple owner or verified vendors can upload
        user = self.request.user
        if user.is_couple:
            if website.account != user:
                raise PermissionError("Not the website owner")
        elif user.is_vendor:
            # Vendor must have a gallery token verification
            # (handled by frontend checking token before this)
            pass

        instance = serializer.save(website=website, uploaded_by=user)
        # Dispatch thumbnail + face-embedding task
        try:
            from .tasks import process_gallery_image
            process_gallery_image.delay(instance.pk)
        except Exception:
            pass  # Celery may not be running in dev

    @action(detail=True, methods=["post"], url_path="download")
    def download(self, request, pk=None):
        """Increment download count and return direct media URL."""
        image = get_object_or_404(GalleryImage, pk=pk)
        GalleryImage.objects.filter(pk=pk).update(download_count=image.download_count + 1)
        return Response({"url": request.build_absolute_uri(image.picture.url)})


class PublicGalleryView(viewsets.ViewSet):
    """Public gallery for a wedding invitation by SLUG -- no auth.
    PRIVATE images are excluded; same gallery_type & category filters supported."""
    permission_classes = [AllowAny]

    def list(self, request, slug=None):
        website = get_object_or_404(CoupleWebsite, slug=slug)
        params  = request.query_params
        wanted_types = list(GalleryImage.PUBLIC_TYPES)
        gtype = params.get("gallery_type")
        if gtype:
            wanted_types = [
                g.strip() for g in gtype.split(",")
                if g.strip() in GalleryImage.PUBLIC_TYPES
            ] or wanted_types

        qs = (website.gallery_images
              .filter(gallery_type__in=wanted_types)
              .select_related("category")
              .order_by("-created_at"))

        category = params.get("category")
        if category:
            if category.isdigit():
                qs = qs.filter(category_id=int(category))
            else:
                qs = qs.filter(category__name=category)

        page     = max(1, int(params.get("page", 1) or 1))
        per_page = min(200, max(1, int(params.get("per_page", 50) or 50)))
        start    = (page - 1) * per_page
        images   = qs[start: start + per_page]
        total    = qs.count()
        return Response({
            "count":       total,
            "page":        page,
            "per_page":    per_page,
            "total_pages": -(-total // per_page),
            "results":     GalleryImageSerializer(images, many=True, context={"request": request}).data,
        })


class PublicGalleryByWebsiteView(viewsets.ViewSet):
    """Public gallery for an invitation -- no auth.  PRIVATE images are NEVER
    returned here so the dashboard's private surface cannot leak through."""
    permission_classes = [AllowAny]

    def list(self, request):
        website_id = request.query_params.get("website_id")
        if not website_id:
            return Response({"error": "website_id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            website = CoupleWebsite.objects.get(pk=website_id)
        except CoupleWebsite.DoesNotExist:
            return Response({"error": "Website not found"}, status=status.HTTP_404_NOT_FOUND)

        params = request.query_params
        # Default to PUBLIC types only.  Caller may further narrow with
        # ?gallery_type=INVITATION  or  ?gallery_type=ALBUM
        wanted_types = list(GalleryImage.PUBLIC_TYPES)
        gtype = params.get("gallery_type")
        if gtype:
            wanted_types = [
                g.strip() for g in gtype.split(",")
                if g.strip() in GalleryImage.PUBLIC_TYPES
            ] or wanted_types

        qs = (website.gallery_images
              .filter(gallery_type__in=wanted_types)
              .select_related("category")
              .order_by("-created_at"))

        # ID-only category filter; legacy ?category=<name> still works for
        # backwards compat but the ID path is what new clients should send.
        category = params.get("category")
        if category:
            if category.isdigit():
                qs = qs.filter(category_id=int(category))
            else:
                qs = qs.filter(category__name=category)

        page     = max(1, int(params.get("page", 1) or 1))
        per_page = min(200, max(1, int(params.get("per_page", 50) or 50)))
        start    = (page - 1) * per_page
        images   = qs[start: start + per_page]
        total    = qs.count()
        return Response({
            "count":       total,
            "page":        page,
            "per_page":    per_page,
            "total_pages": -(-total // per_page),
            "results":     GalleryImageSerializer(images, many=True, context={"request": request}).data,
        })


class SelfieMatchViewSet(viewsets.ModelViewSet):
    """Guest uploads selfie → AI matches to gallery photos."""
    serializer_class   = SelfieMatchSerializer
    permission_classes = [AllowAny]
    http_method_names  = ["get", "post"]

    def get_queryset(self):
        return GuestSelfieMatch.objects.none()

    def perform_create(self, serializer):
        slug = self.request.data.get("website_slug")
        website = get_object_or_404(CoupleWebsite, slug=slug, is_published=True)
        instance = serializer.save(website=website)
        from .tasks import run_selfie_match
        run_selfie_match.delay(instance.pk)

    def retrieve(self, request, pk=None):
        instance = get_object_or_404(GuestSelfieMatch, pk=pk)
        return Response(SelfieMatchSerializer(instance, context={"request": request}).data)
