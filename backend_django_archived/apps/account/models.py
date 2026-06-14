from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", User.ADMIN)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    COUPLE  = "COUPLE"
    VENDOR  = "VENDOR"
    ADMIN   = "ADMIN"
    ROLE_CHOICES = [(COUPLE, "Couple"), (VENDOR, "Vendor"), (ADMIN, "Admin")]

    email       = models.EmailField(unique=True)
    full_name   = models.CharField(max_length=255)
    role        = models.CharField(max_length=20, choices=ROLE_CHOICES, default=COUPLE)
    google_id   = models.CharField(max_length=255, blank=True, null=True, unique=True)
    phone       = models.CharField(max_length=20, blank=True, null=True, unique=True,
                                   help_text="E.164 format, e.g. +919876543210")
    avatar_url  = models.URLField(blank=True, null=True)
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    @property
    def is_couple(self):
        return self.role == self.COUPLE

    @property
    def is_vendor(self):
        return self.role == self.VENDOR
