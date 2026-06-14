"""
Marketplace-level configuration: banners, surface placements.

Banners are scheduled (start/end dates) and have separate desktop/mobile
images for responsive serving.
"""
from __future__ import annotations

from django.db import models
from django.utils import timezone

from apps.products.models import TimestampedModel


class Banner(TimestampedModel):
    """
    A scheduled banner placement.
    `placement` decides where on the site it shows up.
    Multiple banners can be active for the same placement — frontend rotates them.
    """
    PLACEMENT_CHOICES = [
        ("HOME_HERO", "Marketplace Home — Hero"),
        ("HOME_SECONDARY", "Marketplace Home — Secondary Strip"),
        ("GIFT_HOME", "Gift Marketplace — Hero"),
        ("VENDOR_HOME", "Vendor Marketplace — Hero"),
        ("CATEGORY", "Inside Category Page"),
    ]

    title = models.CharField(max_length=200)
    placement = models.CharField(max_length=30, choices=PLACEMENT_CHOICES, db_index=True)

    # Responsive images
    desktop_image = models.ImageField(upload_to="banners/desktop/")
    mobile_image = models.ImageField(upload_to="banners/mobile/", null=True, blank=True)

    # CTA
    cta_label = models.CharField(max_length=80, blank=True)
    cta_url = models.URLField(blank=True)
    open_in_new_tab = models.BooleanField(default=False)

    # Scheduling
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)

    # Sort & state
    priority = models.PositiveIntegerField(default=0, help_text="Lower number = shown first.")
    is_active = models.BooleanField(default=True, db_index=True)

    # Optional category scope (for placement=CATEGORY)
    category = models.ForeignKey(
        "products.Category", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="banners",
    )

    class Meta:
        ordering = ["priority", "-created_at"]
        indexes = [
            models.Index(fields=["placement", "is_active", "priority"]),
            models.Index(fields=["start_at", "end_at"]),
        ]

    def __str__(self) -> str:
        return f"[{self.placement}] {self.title}"

    @property
    def is_live(self) -> bool:
        """True when within the scheduled window AND active."""
        if not self.is_active:
            return False
        now = timezone.now()
        if self.start_at and now < self.start_at:
            return False
        if self.end_at and now > self.end_at:
            return False
        return True
