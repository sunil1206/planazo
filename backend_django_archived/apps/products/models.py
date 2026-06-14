"""
Product catalog: Category, Product, ProductImage, ProductVariant.

Design notes:
- `Category` is a single-level taxonomy for now (can become tree later via MPTT).
- `Product` is the public-facing item shown on listings. Each product belongs
  to a vendor (apps.vendors.Vendor).
- `ProductImage` keeps images normalized (one product, many images) so we can
  paginate, reorder, and CDN-cache them efficiently.
- `ProductVariant` covers size/color/style options that share the same parent
  product but have different SKUs/pricing.
- Slugs are auto-generated from name when blank — keeps URLs clean.
- Soft delete (`is_active=False`) is preferred over hard delete so analytics
  and historical orders keep their FK integrity.
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


class TimestampedModel(models.Model):
    """Reusable abstract base — gives every row created/updated timestamps."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimestampedModel):
    """
    Top-level product category. Examples: 'Jewellery', 'Decor', 'Stationery',
    'Bridal Wear'. Used for navigation, filtering, and pincode availability rules.
    """
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.ImageField(upload_to="categories/icons/", blank=True, null=True)
    banner = models.ImageField(upload_to="categories/banners/", blank=True, null=True)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="children",
    )
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "Categories"
        indexes = [
            models.Index(fields=["is_active", "sort_order"]),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:140]
        super().save(*args, **kwargs)


class Product(TimestampedModel):
    """
    A product listed in the marketplace. Belongs to a single vendor.

    Pricing: store retail price in `price`. If `compare_at_price` is set and
    greater than `price`, frontend renders a strike-through (sale).

    Inventory: `stock_quantity` is the truth. `is_in_stock` is a denormalized
    derived flag for fast filtering on listings (avoids COUNT() per row).

    Personalization: `is_customizable` toggles whether the product supports
    image/text customization (implemented in Phase 3).
    """
    PRODUCT_TYPE_CHOICES = [
        ("PHYSICAL", _("Physical")),
        ("DIGITAL", _("Digital")),
        ("SERVICE", _("Service")),
    ]

    vendor = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    short_description = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)

    product_type = models.CharField(
        max_length=20, choices=PRODUCT_TYPE_CHOICES, default="PHYSICAL"
    )
    sku = models.CharField(max_length=64, blank=True, db_index=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Original price — shown crossed out if greater than price.",
    )
    currency = models.CharField(max_length=3, default="INR")

    stock_quantity = models.PositiveIntegerField(default=0)
    is_in_stock = models.BooleanField(default=True, db_index=True)
    allow_backorder = models.BooleanField(default=False)

    is_customizable = models.BooleanField(
        default=False,
        help_text="Allow buyers to upload image / add custom text at checkout.",
    )

    weight_grams = models.PositiveIntegerField(null=True, blank=True)
    dimensions_cm = models.CharField(max_length=64, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    view_count = models.PositiveIntegerField(default=0)
    avg_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=Decimal("0.00"), db_index=True
    )
    review_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-is_featured", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "is_in_stock", "category"]),
            models.Index(fields=["vendor", "is_active"]),
            models.Index(fields=["-avg_rating", "-review_count"]),
            models.Index(fields=["price"]),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:220]
        # Keep is_in_stock honest with stock_quantity
        self.is_in_stock = self.stock_quantity > 0 or self.allow_backorder
        super().save(*args, **kwargs)

    @property
    def is_on_sale(self) -> bool:
        return (
            self.compare_at_price is not None
            and self.compare_at_price > self.price
        )

    @property
    def discount_percent(self) -> int:
        if not self.is_on_sale:
            return 0
        return int(
            round((self.compare_at_price - self.price) / self.compare_at_price * 100)
        )


class ProductImage(TimestampedModel):
    """One product has many images. First image (by sort_order) is the cover."""
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="products/%Y/%m/")
    alt_text = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_cover = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order", "id"]
        indexes = [models.Index(fields=["product", "sort_order"])]

    def __str__(self) -> str:
        return f"{self.product.name} #{self.sort_order}"


class ProductVariant(TimestampedModel):
    """
    Optional sub-SKU for products that have variations (size, colour).
    Pricing on a variant overrides the parent product's price if set.
    """
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="variants"
    )
    name = models.CharField(max_length=120, help_text="e.g. 'Medium / Red'")
    sku = models.CharField(max_length=64, blank=True, db_index=True)
    price_override = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    attributes = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["product", "name"]
        unique_together = [("product", "name")]

    def __str__(self) -> str:
        return f"{self.product.name} - {self.name}"

    @property
    def effective_price(self):
        return self.price_override if self.price_override is not None else self.product.price
