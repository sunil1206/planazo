"""
Vendor accounts.

Design notes:
- One vendor = one shop. They sell many products.
- Auth: tied to Django's auth.User via OneToOne — keeps login/registration in
  Django's standard machinery.
- Verification: `is_verified` is what gives a vendor the green checkmark on
  their public profile. KYC docs are stored on a separate model (Phase 2).
- Pincode delivery: a separate DeliveryZone model handles serviceability;
  not part of Phase 1 but the relation is reserved.
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.products.models import TimestampedModel  # reuse the abstract base


class Vendor(TimestampedModel):
    """
    A seller on the marketplace. Public-facing profile + business details.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vendor_profile",
    )
    business_name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=200, blank=True)

    logo = models.ImageField(upload_to="vendors/logos/", null=True, blank=True)
    cover_image = models.ImageField(upload_to="vendors/covers/", null=True, blank=True)

    # Contact
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    whatsapp_number = models.CharField(max_length=20, blank=True)

    # Location
    address_line = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=80, db_index=True)
    state = models.CharField(max_length=80, blank=True)
    pincode = models.CharField(max_length=10, blank=True, db_index=True)
    country = models.CharField(max_length=80, default="India")

    # Business
    gst_number = models.CharField(max_length=20, blank=True)
    pan_number = models.CharField(max_length=20, blank=True)
    year_established = models.PositiveIntegerField(null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_verified = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False)

    # Stats (denormalized for fast listings)
    avg_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=Decimal("0.00")
    )
    review_count = models.PositiveIntegerField(default=0)
    total_products = models.PositiveIntegerField(default=0)
    total_orders = models.PositiveIntegerField(default=0)

    # Settings
    commission_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("10.00"),
        help_text="Platform commission % taken from each order.",
    )
    payout_schedule = models.CharField(
        max_length=20,
        choices=[("WEEKLY", "Weekly"), ("BIWEEKLY", "Bi-weekly"), ("MONTHLY", "Monthly")],
        default="WEEKLY",
    )

    class Meta:
        ordering = ["-is_featured", "-avg_rating", "business_name"]
        indexes = [
            models.Index(fields=["is_active", "is_verified"]),
            models.Index(fields=["city", "state"]),
        ]

    def __str__(self) -> str:
        return self.business_name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.business_name)[:220]
        super().save(*args, **kwargs)
