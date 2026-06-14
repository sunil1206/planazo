import os
import secrets
from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.urls import reverse
from PIL import Image as PILImage


def _make_gallery_token():
    """6-char uppercase token, easy to share verbally."""
    return secrets.token_hex(3).upper()


def resize_image(path, size=(1024, 1024), quality=82):
    try:
        img = PILImage.open(path)
        img.thumbnail(size, PILImage.LANCZOS)
        fmt = img.format or ""
        if fmt.upper() in ("JPEG", "JPG") or path.lower().endswith((".jpg", ".jpeg")):
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            img.save(path, "JPEG", optimize=True, quality=quality)
        else:
            img.save(path, optimize=True)
    except Exception:
        pass


class CoupleWebsite(models.Model):
    THEME_CHOICES = [
        ("royal_mughal",    "Royal Mughal"),
        ("kerala_trad",     "Kerala Traditional"),
        ("modern_minimal",  "Modern Minimal"),
        ("floral_pastel",   "Floral Pastel"),
        ("cinematic_dark",  "Cinematic Dark"),
        ("luxury_wedding",  "✨ Luxury Wedding"),
    ]

    account     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="couple_websites")
    theme       = models.CharField(max_length=50, choices=THEME_CHOICES, default="modern_minimal")
    couple      = models.CharField(max_length=255, help_text="e.g. Sunil & Priya")
    bride_info  = models.CharField(max_length=255, blank=True)
    groom_info  = models.CharField(max_length=255, blank=True)
    thumbnail   = models.ImageField(upload_to="post/", blank=True, null=True)
    is_published = models.BooleanField(default=False)
    views       = models.PositiveIntegerField(default=0)
    slug          = models.SlugField(unique=True, blank=True, max_length=150)
    gallery_token = models.CharField(max_length=12, unique=True, blank=True,
                                     help_text="Share this code with your photographer to link their photos")
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "couple_websites"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.couple)
            slug, n = base, 1
            while CoupleWebsite.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"; n += 1
            self.slug = slug
        if not self.gallery_token:
            token = _make_gallery_token()
            while CoupleWebsite.objects.filter(gallery_token=token).exists():
                token = _make_gallery_token()
            self.gallery_token = token
        super().save(*args, **kwargs)
        if self.thumbnail:
            resize_image(self.thumbnail.path, (1024, 1800))

    def __str__(self):
        return self.couple

    def get_absolute_url(self):
        return reverse("public-invite", args=[self.slug])


class BrideGroom(models.Model):
    website             = models.OneToOneField(CoupleWebsite, on_delete=models.CASCADE, related_name="bridegroom")
    groom_name          = models.CharField(max_length=255)
    groom_description   = models.TextField(blank=True)
    groom_image         = models.ImageField(upload_to="groom/", blank=True, null=True)
    groom_instagram     = models.URLField(blank=True, null=True)
    bride_name          = models.CharField(max_length=255)
    bride_description   = models.TextField(blank=True)
    bride_image         = models.ImageField(upload_to="bride/", blank=True, null=True)
    bride_instagram     = models.URLField(blank=True, null=True)

    class Meta:
        db_table = "bride_groom"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.groom_image:
            resize_image(self.groom_image.path)
        if self.bride_image:
            resize_image(self.bride_image.path)

    def __str__(self):
        return f"{self.groom_name} & {self.bride_name}"


class BrideGroomStory(models.Model):
    website = models.ForeignKey(CoupleWebsite, on_delete=models.CASCADE, related_name="stories")
    title   = models.CharField(max_length=255)
    image   = models.ImageField(upload_to="story/", blank=True, null=True)
    date    = models.DateTimeField(blank=True, null=True)
    desc    = models.TextField(blank=True)
    order   = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "stories"
        ordering = ["order", "date"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            resize_image(self.image.path)

    def __str__(self):
        return self.title


class BrideGroomEvent(models.Model):
    website        = models.ForeignKey(CoupleWebsite, on_delete=models.CASCADE, related_name="events")
    title          = models.CharField(max_length=255)
    image          = models.ImageField(upload_to="event/", blank=True, null=True)
    date           = models.DateTimeField(blank=True, null=True)
    time           = models.CharField(max_length=100, blank=True)
    desc           = models.TextField(blank=True)
    location_name  = models.CharField(max_length=255, blank=True)
    location_link  = models.URLField(blank=True, null=True)
    order          = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "events"
        ordering = ["order", "date"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            resize_image(self.image.path)

    def __str__(self):
        return self.title


class WeddingCountdown(models.Model):
    website          = models.OneToOneField(CoupleWebsite, on_delete=models.CASCADE, related_name="countdown")
    heading          = models.CharField(max_length=255, default="We Are Getting Married!")
    event_date       = models.DateTimeField()
    background_image = models.ImageField(upload_to="countdown/", blank=True, null=True)

    class Meta:
        db_table = "wedding_countdown"

    def __str__(self):
        return f"Countdown for {self.website.couple}"


class InvitationRSVP(models.Model):
    YES   = "YES"
    NO    = "NO"
    MAYBE = "MAYBE"
    ATTENDANCE_CHOICES = [(YES, "Yes"), (NO, "No"), (MAYBE, "Maybe")]

    website    = models.ForeignKey(CoupleWebsite, on_delete=models.CASCADE, related_name="rsvps")
    name       = models.CharField(max_length=255)
    phone      = models.CharField(max_length=20, blank=True)
    email      = models.EmailField(blank=True)
    attendance = models.CharField(max_length=10, choices=ATTENDANCE_CHOICES, default=YES)
    VEG     = "VEG"
    NON_VEG = "NON_VEG"
    VEGAN   = "VEGAN"
    JAIN    = "JAIN"
    MEAL_CHOICES = [
        (VEG,     "Vegetarian"),
        (NON_VEG, "Non-Vegetarian"),
        (VEGAN,   "Vegan"),
        (JAIN,    "Jain"),
    ]

    guests         = models.PositiveIntegerField(default=1)
    meal_preference = models.CharField(max_length=20, choices=MEAL_CHOICES, blank=True, default="")
    message        = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "invitation_rsvps"

    def __str__(self):
        return f"{self.name} — {self.attendance}"


class Makeyourwish(models.Model):
    website      = models.ForeignKey(CoupleWebsite, on_delete=models.CASCADE, related_name="wishes")
    name         = models.CharField(max_length=255)
    relationship = models.CharField(max_length=255, blank=True)
    image        = models.ImageField(upload_to="wishes/", blank=True, null=True)
    message      = models.TextField()
    verified     = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wishes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Wish by {self.name}"


class PageVisit(models.Model):
    website    = models.ForeignKey(CoupleWebsite, on_delete=models.CASCADE, related_name="visits")
    ip_address = models.GenericIPAddressField()
    visited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "page_visits"


class WeddingGalleryPhoto(models.Model):
    """Photos uploaded by guests or photographers to the public wedding gallery."""
    TAG_CHOICES = [
        ("ceremony",  "Ceremony"),
        ("reception", "Reception"),
        ("portrait",  "Portrait"),
        ("fun",       "Fun Moments"),
        ("decor",     "Décor"),
        ("other",     "Other"),
    ]
    website       = models.ForeignKey(CoupleWebsite, on_delete=models.CASCADE, related_name="guest_photos")
    image         = models.ImageField(upload_to="wedding_gallery/")
    thumbnail     = models.ImageField(upload_to="wedding_gallery/thumbs/", blank=True, null=True)
    tag           = models.CharField(max_length=20, choices=TAG_CHOICES, default="other")
    caption       = models.CharField(max_length=255, blank=True)
    uploader_name = models.CharField(max_length=100, blank=True, default="Guest")
    is_approved   = models.BooleanField(default=True)  # auto-approve; set False for moderation
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wedding_gallery_photos"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            resize_image(self.image.path, size=(1920, 1920), quality=85)

    def __str__(self):
        return f"Photo by {self.uploader_name} for {self.website.couple}"


class WeddingVendor(models.Model):
    """Vendors chosen by a couple for their wedding — shown on the public invite page."""
    website      = models.ForeignKey(CoupleWebsite, on_delete=models.CASCADE, related_name="wedding_vendors")
    vendor       = models.ForeignKey("vendor.VendorWebsite", on_delete=models.CASCADE, related_name="wedding_bookings")
    service_note = models.CharField(max_length=255, blank=True, help_text="e.g. 'Bridal Photography'")
    order        = models.PositiveIntegerField(default=0)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = "wedding_vendors"
        ordering  = ["order", "created_at"]
        unique_together = [("website", "vendor")]

    def __str__(self):
        return f"{self.vendor.title} for {self.website.couple}"
