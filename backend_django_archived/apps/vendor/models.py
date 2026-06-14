from django.conf import settings
from django.db import models
from django.utils.text import slugify
from PIL import Image as PILImage


def resize(path, size=(800, 600)):
    try:
        img = PILImage.open(path)
        img.thumbnail(size, PILImage.LANCZOS)
        # Convert RGBA/P to RGB before saving as JPEG to avoid format errors
        fmt = img.format or "JPEG"
        if fmt.upper() in ("JPEG", "JPG") or path.lower().endswith((".jpg", ".jpeg")):
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            img.save(path, "JPEG", optimize=True, quality=82)
        else:
            img.save(path, optimize=True)
    except Exception:
        pass


# ── Dynamic Vendor Category (replaces hardcoded CATEGORY_CHOICES) ──────────────

class VendorCategory(models.Model):
    """
    Database-driven vendor service categories.
    Add new categories from Django admin — no code changes needed.
    """
    key         = models.CharField(max_length=30, unique=True,
                                   help_text="Uppercase slug, e.g. PHOTOGRAPHER")
    name        = models.CharField(max_length=100, help_text="Display name, e.g. Photographer")
    icon_image  = models.ImageField(upload_to="vendor/category_icons/", blank=True, null=True,
                                    help_text="Small icon image (replaces emoji)")
    description = models.TextField(blank=True)
    order       = models.PositiveIntegerField(default=0)
    is_active   = models.BooleanField(default=True)

    class Meta:
        db_table = "vendor_categories"
        ordering = ["order", "name"]
        verbose_name = "Vendor Category"
        verbose_name_plural = "Vendor Categories"

    def __str__(self):
        return self.name

    @property
    def icon_url(self):
        return self.icon_image.url if self.icon_image else None


# ── Dynamic Theme Preset (replaces hardcoded THEME_CHOICES_COLOR) ─────────────

class VendorThemePreset(models.Model):
    """
    Database-driven colour themes for vendor portfolio pages.
    Add new themes from Django admin — no code changes needed.
    """
    name          = models.CharField(max_length=100)
    hex_color     = models.CharField(max_length=20, help_text="Hex colour, e.g. #C9952A")
    preview_image = models.ImageField(upload_to="vendor/theme_previews/", blank=True, null=True)
    order         = models.PositiveIntegerField(default=0)
    is_active     = models.BooleanField(default=True)

    class Meta:
        db_table = "vendor_theme_presets"
        ordering = ["order", "name"]
        verbose_name = "Theme Preset"
        verbose_name_plural = "Theme Presets"

    def __str__(self):
        return f"{self.name} ({self.hex_color})"


class VendorWebsite(models.Model):
    # Legacy CharField choices — kept for backward compatibility.
    # New registrations should use category_obj and theme_preset FKs.
    PHOTOGRAPHER  = "PHOTOGRAPHER"
    EVENT         = "EVENT"
    DECOR         = "DECOR"
    CATERING      = "CATERING"
    MAKEUP        = "MAKEUP"
    MUSIC         = "MUSIC"
    CATEGORY_CHOICES = [
        (PHOTOGRAPHER, "Photographer"),
        (EVENT,        "Event Manager"),
        (DECOR,        "Decorator"),
        (CATERING,     "Caterer"),
        (MAKEUP,       "Makeup Artist"),
        (MUSIC,        "DJ / Music"),
    ]

    account      = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vendor_website")
    # Dynamic FK — preferred for new records
    category_obj = models.ForeignKey(VendorCategory, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name="vendors",
                                     help_text="Select from dynamic categories (preferred)")
    # Legacy CharField kept for backward compat
    category     = models.CharField(max_length=20, choices=CATEGORY_CHOICES, blank=True, default="")
    theme_preset = models.ForeignKey(VendorThemePreset, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name="vendors",
                                     help_text="Portfolio colour theme (from dynamic presets)")
    title       = models.CharField(max_length=255)
    bio         = models.TextField()
    tagline     = models.CharField(max_length=255, blank=True, help_text="Short catchphrase shown on portfolio header")
    thumbnail   = models.ImageField(upload_to="vendor/", blank=True, null=True)
    cover_image = models.ImageField(upload_to="vendor/cover/", blank=True, null=True)
    theme_color = models.CharField(max_length=20, default="#C9952A", help_text="Hex colour for portfolio accent (legacy; use theme_preset instead)")
    phone       = models.CharField(max_length=20)
    email       = models.EmailField()
    city        = models.CharField(max_length=100, blank=True)
    address     = models.TextField(blank=True)
    website     = models.URLField(blank=True, null=True)
    instagram   = models.URLField(blank=True, null=True)
    is_active   = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    slug        = models.SlugField(unique=True, blank=True, max_length=150)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vendor_websites"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            slug, n = base, 1
            while VendorWebsite.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"; n += 1
            self.slug = slug
        super().save(*args, **kwargs)
        if self.thumbnail:
            resize(self.thumbnail.path, (400, 300))

    def __str__(self):
        return self.title

    @property
    def avg_rating(self):
        reviews = self.reviews.filter(is_approved=True)
        if not reviews.exists():
            return None
        return round(reviews.aggregate(avg=models.Avg("rating"))["avg"], 1)

    @property
    def effective_category_name(self):
        """Returns the human-readable category name (dynamic FK preferred)."""
        if self.category_obj:
            return self.category_obj.name
        return dict(self.CATEGORY_CHOICES).get(self.category, self.category)

    @property
    def effective_theme_color(self):
        """Returns hex colour (dynamic preset preferred over legacy field)."""
        if self.theme_preset:
            return self.theme_preset.hex_color
        return self.theme_color


class PortfolioCategory(models.Model):
    """Custom categories a vendor can create to organise their portfolio."""
    vendor      = models.ForeignKey(VendorWebsite, on_delete=models.CASCADE, related_name="portfolio_categories")
    name        = models.CharField(max_length=100)
    emoji       = models.CharField(max_length=10, blank=True, default="")
    icon_image  = models.ImageField(upload_to="vendor/portfolio_cat_icons/", blank=True, null=True,
                                    help_text="Category icon image (replaces emoji)")
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "vendor_portfolio_categories"
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.vendor.title} — {self.name}"


class VendorPackage(models.Model):
    """Pricing package offered by a vendor (e.g. Basic / Standard / Elite)."""
    vendor         = models.ForeignKey(VendorWebsite, on_delete=models.CASCADE, related_name="packages")
    name           = models.CharField(max_length=100)
    price          = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price in INR")
    description    = models.CharField(max_length=500, blank=True)
    features       = models.JSONField(default=list, help_text="List of included feature strings")
    max_hours      = models.PositiveIntegerField(null=True, blank=True, help_text="Hours of coverage / service")
    delivery_days  = models.PositiveIntegerField(null=True, blank=True, help_text="Delivery / turnaround days")
    is_popular     = models.BooleanField(default=False, help_text="Highlight as most popular")
    allows_custom  = models.BooleanField(default=True, help_text="Client can request custom add-ons")
    is_available   = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vendor_packages"
        ordering = ["price"]

    def __str__(self):
        return f"{self.vendor.title} — {self.name} (₹{self.price})"

    @property
    def price_display(self):
        return f"₹{int(self.price):,}"


class VendorPortfolioImage(models.Model):
    vendor     = models.ForeignKey(VendorWebsite, on_delete=models.CASCADE, related_name="portfolio")
    category   = models.ForeignKey(PortfolioCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="images")
    title      = models.CharField(max_length=255, blank=True)
    picture    = models.ImageField(upload_to="vendor/portfolio/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vendor_portfolio"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.picture:
            resize(self.picture.path, (1024, 768))

    def __str__(self):
        return self.title or f"Portfolio {self.pk}"


class VendorEnquiry(models.Model):
    NEW       = "NEW"
    SEEN      = "SEEN"
    REPLIED   = "REPLIED"
    STATUS_CHOICES = [(NEW, "New"), (SEEN, "Seen"), (REPLIED, "Replied")]

    vendor     = models.ForeignKey(VendorWebsite, on_delete=models.CASCADE, related_name="enquiries")
    name       = models.CharField(max_length=255)
    email      = models.EmailField()
    phone      = models.CharField(max_length=20, blank=True)
    event_date = models.DateField(null=True, blank=True)
    message    = models.TextField()
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default=NEW)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vendor_enquiries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Enquiry from {self.name} → {self.vendor.title}"


class VendorReview(models.Model):
    vendor      = models.ForeignKey(VendorWebsite, on_delete=models.CASCADE, related_name="reviews")
    reviewer    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    rating      = models.PositiveSmallIntegerField()  # 1–5
    comment     = models.TextField()
    is_approved = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vendor_reviews"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reviewer} → {self.vendor.title} ({self.rating}★)"


# ── Subscription System ────────────────────────────────────────────────────────

class SubscriptionPlan(models.Model):
    """Platform-defined subscription tiers for vendors."""
    FREE    = "FREE"
    PRO     = "PRO"
    PREMIUM = "PREMIUM"
    TIER_CHOICES = [(FREE, "Free"), (PRO, "Pro"), (PREMIUM, "Premium")]

    tier                  = models.CharField(max_length=10, choices=TIER_CHOICES, unique=True)
    name                  = models.CharField(max_length=50)
    price_monthly         = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    price_yearly          = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_packages          = models.PositiveIntegerField(default=2, help_text="0 = unlimited")
    max_portfolio_images  = models.PositiveIntegerField(default=10, help_text="0 = unlimited")
    featured_placement    = models.BooleanField(default=False)
    analytics_access      = models.BooleanField(default=False)
    enquiry_management    = models.BooleanField(default=True)
    custom_theme          = models.BooleanField(default=False)
    priority_support      = models.BooleanField(default=False)
    razorpay_plan_id      = models.CharField(max_length=100, blank=True, help_text="Razorpay plan ID for recurring billing")
    description           = models.TextField(blank=True)
    features_list         = models.JSONField(default=list, help_text="Marketing bullet points")

    class Meta:
        db_table = "vendor_subscription_plans"

    def __str__(self):
        return f"{self.name} (₹{self.price_monthly}/mo)"


class VendorSubscription(models.Model):
    """Active subscription for a vendor."""
    ACTIVE    = "ACTIVE"
    EXPIRED   = "EXPIRED"
    CANCELLED = "CANCELLED"
    TRIALING  = "TRIALING"
    STATUS_CHOICES = [
        (ACTIVE,    "Active"),
        (EXPIRED,   "Expired"),
        (CANCELLED, "Cancelled"),
        (TRIALING,  "Trialing"),
    ]

    vendor                   = models.OneToOneField(VendorWebsite, on_delete=models.CASCADE, related_name="subscription")
    plan                     = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")
    status                   = models.CharField(max_length=10, choices=STATUS_CHOICES, default=ACTIVE)
    is_yearly                = models.BooleanField(default=False)
    razorpay_subscription_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id      = models.CharField(max_length=100, blank=True)
    current_period_start     = models.DateTimeField(auto_now_add=True)
    current_period_end       = models.DateTimeField(null=True, blank=True)
    created_at               = models.DateTimeField(auto_now_add=True)
    updated_at               = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vendor_subscriptions"

    def __str__(self):
        return f"{self.vendor.title} — {self.plan.name}"

    @property
    def is_active(self):
        from django.utils import timezone
        if self.plan.tier == SubscriptionPlan.FREE:
            return True
        return self.status == self.ACTIVE and (
            self.current_period_end is None or self.current_period_end > timezone.now()
        )


# ── Favorites ─────────────────────────────────────────────────────────────────

class VendorFavorite(models.Model):
    """Couples can save vendors they love to a favorites list."""
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vendor_favorites")
    vendor     = models.ForeignKey(VendorWebsite, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table      = "vendor_favorites"
        unique_together = [("user", "vendor")]
        ordering      = ["-created_at"]

    def __str__(self):
        return f"{self.user} ♥ {self.vendor.title}"
