import os
from django.db import models
from django.utils.text import slugify
from django.conf import settings


class GalleryCategory(models.Model):
    name       = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gallery_categories"
        verbose_name_plural = "Gallery Categories"

    def __str__(self):
        return self.name


class GalleryImage(models.Model):
    GALLERY_INVITATION = "INVITATION"
    GALLERY_ALBUM      = "ALBUM"
    GALLERY_PRIVATE    = "PRIVATE"
    GALLERY_TYPE_CHOICES = [
        (GALLERY_INVITATION, "Invitation gallery (visible on the invitation page)"),
        (GALLERY_ALBUM,      "Public album (visible on the digital album page)"),
        (GALLERY_PRIVATE,    "Private (dashboard only - never public)"),
    ]
    PUBLIC_TYPES = (GALLERY_INVITATION, GALLERY_ALBUM)

    website        = models.ForeignKey("invitation.CoupleWebsite", on_delete=models.CASCADE, related_name="gallery_images")
    category       = models.ForeignKey(GalleryCategory, on_delete=models.SET_NULL, null=True, blank=True)
    gallery_type   = models.CharField(max_length=20, choices=GALLERY_TYPE_CHOICES, default=GALLERY_INVITATION, db_index=True)
    title          = models.CharField(max_length=255, blank=True)
    picture        = models.ImageField(upload_to="gallery/originals/")
    thumb_small    = models.ImageField(upload_to="gallery/thumbs/small/",  blank=True, null=True)
    thumb_medium   = models.ImageField(upload_to="gallery/thumbs/medium/", blank=True, null=True)
    # Face embedding stored as JSON array (list of floats)
    face_embedding = models.JSONField(null=True, blank=True)
    download_count = models.PositiveIntegerField(default=0)
    slug           = models.SlugField(unique=True, blank=True, max_length=200)
    uploaded_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="gallery_uploads")
    created_at     = models.DateTimeField(auto_now_add=True)
    modified_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gallery_images"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title or "image")
            slug, n = base, 1
            while GalleryImage.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"; n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title or f"Image {self.pk}"

    @property
    def thumbnail_url(self):
        """Returns smallest available thumbnail for gallery grid."""
        if self.thumb_small:
            return self.thumb_small.url
        if self.thumb_medium:
            return self.thumb_medium.url
        return self.picture.url


class GuestSelfieMatch(models.Model):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE    = "DONE"
    FAILED  = "FAILED"
    STATUS_CHOICES = [(PENDING, "Pending"), (RUNNING, "Running"),
                      (DONE, "Done"), (FAILED, "Failed")]

    website          = models.ForeignKey("invitation.CoupleWebsite", on_delete=models.CASCADE, related_name="selfie_matches")
    selfie           = models.ImageField(upload_to="selfies/")
    selfie_embedding = models.JSONField(null=True, blank=True)
    matched_images   = models.ManyToManyField(GalleryImage, blank=True, related_name="selfie_matches")
    status           = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    error            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "guest_selfie_matches"

    def __str__(self):
        return f"SelfieMatch({self.website.couple}) — {self.status}"
