from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

THEME_CHOICES = [
    ("star_gold",       "Star Gold"),
    ("balloon_bash",    "Balloon Bash"),
    ("floral_birthday", "Floral Birthday"),
    ("kids_party",      "Kids Party"),
    ("cinematic_dark",  "Cinematic Dark"),
]


class BirthdayPage(models.Model):
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="birthday_pages")
    title       = models.CharField(max_length=200)          # e.g. "Rahul's 30th Birthday"
    celebrant   = models.CharField(max_length=120)          # person being celebrated
    slug        = models.SlugField(unique=True, max_length=120)
    theme       = models.CharField(max_length=30, choices=THEME_CHOICES, default="star_gold")
    date        = models.DateField(null=True, blank=True)
    time        = models.TimeField(null=True, blank=True)
    venue       = models.CharField(max_length=300, blank=True)
    venue_map   = models.URLField(blank=True)
    description = models.TextField(blank=True)
    thumbnail   = models.ImageField(upload_to="birthday/thumbnails/", null=True, blank=True)
    is_published= models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.celebrant} — {self.date}"

    @property
    def thumbnail_url(self):
        if self.thumbnail:
            return self.thumbnail.url
        return None


class BirthdayEvent(models.Model):
    page        = models.ForeignKey(BirthdayPage, on_delete=models.CASCADE, related_name="events")
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date        = models.DateField()
    time        = models.TimeField(null=True, blank=True)
    venue       = models.CharField(max_length=300, blank=True)
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "date"]

    def __str__(self):
        return f"{self.title} @ {self.page}"


class BirthdayStory(models.Model):
    page    = models.ForeignKey(BirthdayPage, on_delete=models.CASCADE, related_name="stories")
    heading = models.CharField(max_length=200)
    body    = models.TextField()
    image   = models.ImageField(upload_to="birthday/stories/", null=True, blank=True)
    order   = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    @property
    def image_url(self):
        return self.image.url if self.image else None


class BirthdayWish(models.Model):
    page       = models.ForeignKey(BirthdayPage, on_delete=models.CASCADE, related_name="wishes")
    name       = models.CharField(max_length=120)
    relation   = models.CharField(max_length=100, blank=True)
    message    = models.TextField()
    photo      = models.ImageField(upload_to="birthday/wishes/", null=True, blank=True)
    is_approved= models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def photo_url(self):
        return self.photo.url if self.photo else None


class BirthdayRSVP(models.Model):
    MEAL_CHOICES = [("VEG", "Veg"), ("NON_VEG", "Non-Veg"), ("VEGAN", "Vegan")]

    page        = models.ForeignKey(BirthdayPage, on_delete=models.CASCADE, related_name="rsvps")
    name        = models.CharField(max_length=120)
    phone       = models.CharField(max_length=20, blank=True)
    email       = models.EmailField(blank=True)
    guests      = models.PositiveSmallIntegerField(default=1)
    meal_pref   = models.CharField(max_length=10, choices=MEAL_CHOICES, default="VEG")
    message     = models.TextField(blank=True)
    attending   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class BirthdayCountdown(models.Model):
    page        = models.OneToOneField(BirthdayPage, on_delete=models.CASCADE, related_name="countdown")
    target_date = models.DateTimeField()
    label       = models.CharField(max_length=100, default="until the party!")
