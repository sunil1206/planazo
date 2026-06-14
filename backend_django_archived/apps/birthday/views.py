from django.utils.text import slugify
from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    BirthdayPage, BirthdayEvent, BirthdayStory,
    BirthdayWish, BirthdayRSVP, BirthdayCountdown,
)
from .serializers import (
    BirthdayPageListSerializer, BirthdayPageDetailSerializer,
    BirthdayEventSerializer, BirthdayStorySerializer,
    BirthdayWishSerializer, BirthdayRSVPSerializer,
    BirthdayCountdownSerializer,
)


def _unique_slug(base: str) -> str:
    slug = slugify(base)[:80]
    if not BirthdayPage.objects.filter(slug=slug).exists():
        return slug
    i = 1
    while BirthdayPage.objects.filter(slug=f"{slug}-{i}").exists():
        i += 1
    return f"{slug}-{i}"


class BirthdayPageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BirthdayPage.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BirthdayPageDetailSerializer
        return BirthdayPageListSerializer

    def perform_create(self, serializer):
        base = serializer.validated_data.get("title", "birthday")
        serializer.save(owner=self.request.user, slug=_unique_slug(base))

    # ── Sub-resource actions ────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="events")
    def events(self, request, pk=None):
        page = self.get_object()
        if request.method == "POST":
            s = BirthdayEventSerializer(data=request.data, context={"request": request})
            s.is_valid(raise_exception=True)
            s.save(page=page)
            return Response(s.data, status=status.HTTP_201_CREATED)
        qs = page.events.all()
        return Response(BirthdayEventSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"], url_path="stories")
    def stories(self, request, pk=None):
        page = self.get_object()
        if request.method == "POST":
            s = BirthdayStorySerializer(data=request.data, context={"request": request})
            s.is_valid(raise_exception=True)
            s.save(page=page)
            return Response(s.data, status=status.HTTP_201_CREATED)
        qs = page.stories.all()
        return Response(BirthdayStorySerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="wishes")
    def wishes(self, request, pk=None):
        page = self.get_object()
        qs = page.wishes.filter(is_approved=True)
        return Response(BirthdayWishSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="rsvps")
    def rsvps(self, request, pk=None):
        page = self.get_object()
        qs = page.rsvps.all()
        return Response(BirthdayRSVPSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"], url_path="countdown")
    def countdown(self, request, pk=None):
        page = self.get_object()
        if request.method == "POST":
            obj, _ = BirthdayCountdown.objects.get_or_create(page=page)
            s = BirthdayCountdownSerializer(obj, data=request.data, context={"request": request})
            s.is_valid(raise_exception=True)
            s.save(page=page)
            return Response(s.data)
        try:
            obj = page.countdown
        except BirthdayCountdown.DoesNotExist:
            return Response({})
        return Response(BirthdayCountdownSerializer(obj, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        page = self.get_object()
        page.is_published = not page.is_published
        page.save()
        return Response({"is_published": page.is_published})


# ── Public views ────────────────────────────────────────────────────────────────

class PublicBirthdayView(APIView):
    permission_classes = [permissions.AllowAny]

    def _get_page(self, slug):
        try:
            return BirthdayPage.objects.get(slug=slug, is_published=True)
        except BirthdayPage.DoesNotExist:
            return None

    def get(self, request, slug):
        page = self._get_page(slug)
        if not page:
            return Response({"detail": "Not found."}, status=404)
        s = BirthdayPageDetailSerializer(page, context={"request": request})
        return Response(s.data)


class PublicBirthdayWishView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        try:
            page = BirthdayPage.objects.get(slug=slug, is_published=True)
        except BirthdayPage.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        s = BirthdayWishSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        s.save(page=page)
        return Response(s.data, status=status.HTTP_201_CREATED)


class PublicBirthdayRSVPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        try:
            page = BirthdayPage.objects.get(slug=slug, is_published=True)
        except BirthdayPage.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        s = BirthdayRSVPSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        s.save(page=page)
        return Response(s.data, status=status.HTTP_201_CREATED)
