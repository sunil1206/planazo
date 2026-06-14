"""
Creates test users for development/testing.

Usage:
    docker compose exec django python manage.py create_test_users
"""
from django.core.management.base import BaseCommand
from apps.account.models import User


class Command(BaseCommand):
    help = "Create test users for development"

    def handle(self, *args, **options):
        users = [
            {
                "email":     "couple@test.com",
                "password":  "test1234",
                "full_name": "Test Couple",
                "role":      User.COUPLE,
            },
            {
                "email":     "vendor@test.com",
                "password":  "test1234",
                "full_name": "Test Vendor",
                "role":      User.VENDOR,
            },
            {
                "email":     "seller@test.com",
                "password":  "test1234",
                "full_name": "Test Seller",
                "role":      User.VENDOR,
            },
            {
                "email":     "admin@test.com",
                "password":  "admin1234",
                "full_name": "Admin User",
                "role":      User.ADMIN,
                "is_staff":  True,
                "is_superuser": True,
            },
        ]

        for u in users:
            is_staff      = u.pop("is_staff",      False)
            is_superuser  = u.pop("is_superuser",   False)
            email         = u["email"]

            if User.objects.filter(email=email).exists():
                self.stdout.write(f"  ⟳  {email} already exists — skipping")
                continue

            user = User.objects.create_user(**u)
            user.is_staff     = is_staff
            user.is_superuser = is_superuser
            user.save()
            self.stdout.write(self.style.SUCCESS(f"  ✓  Created {email}  (password: {u['password']})"))

        self.stdout.write(self.style.SUCCESS("\nDone! You can now log in at http://localhost:3000/login"))
        self.stdout.write("  couple@test.com   /  test1234  → Couple dashboard")
        self.stdout.write("  vendor@test.com   /  test1234  → Vendor hub")
        self.stdout.write("  seller@test.com   /  test1234  → Seller setup")
        self.stdout.write("  admin@test.com    /  admin1234  (Django admin: http://localhost:8000/admin/)")
