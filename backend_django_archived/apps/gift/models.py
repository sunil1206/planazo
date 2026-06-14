from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class GiftSeller(models.Model):
    """A seller account that can list gift products on the platform."""
    PENDING  = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    STATUS_CHOICES = [
        (PENDING,  "Pending Review"),
        (APPROVED, "Approved"),
        (REJECTED, "Rejected"),
    ]

    user         = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seller_profile")
    business_name= models.CharField(max_length=255)
    description  = models.TextField(blank=True)
    logo         = models.ImageField(upload_to="gifts/sellers/", blank=True, null=True)
    phone        = models.CharField(max_length=20, blank=True)
    email        = models.EmailField(blank=True)
    gstin        = models.CharField(max_length=20, blank=True, verbose_name="GSTIN")
    bank_account = models.CharField(max_length=30, blank=True)
    ifsc         = models.CharField(max_length=12, blank=True)
    status       = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    commission_pct = models.DecimalField(max_digits=5, decimal_places=2, default=10)  # platform cut %
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gift_sellers"

    def __str__(self):
        return self.business_name

    @property
    def logo_url(self):
        return self.logo.url if self.logo else None


class GiftCategory(models.Model):
    name       = models.CharField(max_length=100, unique=True)
    emoji      = models.CharField(max_length=10, default="", blank=True,
                                  help_text="Legacy emoji — use icon_image instead")
    icon_image = models.ImageField(upload_to="gifts/category_icons/", blank=True, null=True,
                                   help_text="Category icon image (replaces emoji)")
    order      = models.PositiveIntegerField(default=0)

    class Meta:
        db_table  = "gift_categories"
        ordering  = ["order", "name"]
        verbose_name_plural = "Gift Categories"

    def __str__(self):
        return self.name

    @property
    def icon_url(self):
        return self.icon_image.url if self.icon_image else None


class GiftProduct(models.Model):
    seller        = models.ForeignKey(GiftSeller, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    category      = models.ForeignKey(GiftCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    name          = models.CharField(max_length=255)
    slug          = models.SlugField(unique=True, blank=True, max_length=300)
    description   = models.TextField()
    short_desc    = models.CharField(max_length=300, blank=True)
    price         = models.DecimalField(max_digits=10, decimal_places=2)   # INR
    compare_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Strikethrough MRP")
    image         = models.ImageField(upload_to="gifts/products/", blank=True, null=True)
    stock         = models.PositiveIntegerField(default=100)
    sku           = models.CharField(max_length=50, blank=True)
    weight_grams  = models.PositiveIntegerField(null=True, blank=True)
    tags          = models.JSONField(default=list, help_text="Search tags")
    is_available  = models.BooleanField(default=True)
    is_featured   = models.BooleanField(default=False)
    is_cod        = models.BooleanField(default=True, help_text="Cash on delivery allowed")
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gift_products"
        ordering = ["-is_featured", "price"]

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            import random, string
            base = slugify(self.name)
            slug = base
            while GiftProduct.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{''.join(random.choices(string.digits, k=4))}"
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def price_paise(self):
        """Price in paise for Razorpay."""
        return int(self.price * 100)

    @property
    def avg_rating(self):
        reviews = self.product_reviews.filter(is_approved=True)
        if not reviews.exists():
            return None
        return round(reviews.aggregate(avg=models.Avg("rating"))["avg"], 1)

    @property
    def review_count(self):
        return self.product_reviews.filter(is_approved=True).count()

    @property
    def discount_pct(self):
        if self.compare_price and self.compare_price > self.price:
            return int((1 - self.price / self.compare_price) * 100)
        return 0


class GiftOrder(models.Model):
    COUPLE  = "COUPLE"
    CUSTOM  = "CUSTOM"
    DELIVERY_CHOICES = [
        (COUPLE, "Deliver to Couple (from invitation)"),
        (CUSTOM, "Deliver to custom address"),
    ]

    PENDING   = "PENDING"
    PAID      = "PAID"
    CONFIRMED = "CONFIRMED"
    SHIPPED   = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (PENDING,   "Pending Payment"),
        (PAID,      "Payment Received"),
        (CONFIRMED, "Order Confirmed"),
        (SHIPPED,   "Shipped"),
        (DELIVERED, "Delivered"),
        (CANCELLED, "Cancelled"),
    ]

    # Product & wedding link
    product  = models.ForeignKey(GiftProduct, on_delete=models.PROTECT, related_name="orders")
    website  = models.ForeignKey("invitation.CoupleWebsite", on_delete=models.SET_NULL,
                                  null=True, blank=True, related_name="gift_orders")

    # Sender details
    sender_name  = models.CharField(max_length=255)
    sender_email = models.EmailField()
    sender_phone = models.CharField(max_length=20, blank=True)

    # Gift card message
    message = models.TextField(blank=True)

    # Delivery
    delivery_type  = models.CharField(max_length=10, choices=DELIVERY_CHOICES, default=COUPLE)
    recipient_name = models.CharField(max_length=255, blank=True)
    address_line1  = models.CharField(max_length=255, blank=True)
    address_line2  = models.CharField(max_length=255, blank=True)
    city           = models.CharField(max_length=100, blank=True)
    state          = models.CharField(max_length=100, blank=True)
    pincode        = models.CharField(max_length=10,  blank=True)
    country        = models.CharField(max_length=100, blank=True, default="India")

    # Payment
    amount               = models.DecimalField(max_digits=10, decimal_places=2)
    razorpay_order_id    = models.CharField(max_length=100, unique=True, blank=True, null=True)
    razorpay_payment_id  = models.CharField(max_length=100, blank=True)
    status               = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gift_orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Gift '{self.product.name}' from {self.sender_name} → {self.website}"

    @property
    def delivery_address(self):
        if self.delivery_type == self.COUPLE and self.website:
            return f"Delivered to {self.website.couple} (via Planazo)"
        parts = filter(None, [
            self.recipient_name, self.address_line1, self.address_line2,
            self.city, self.state, self.pincode, self.country,
        ])
        return ", ".join(parts)


# ── Product extras ─────────────────────────────────────────────────────────────

class ProductImage(models.Model):
    """Additional product images (gallery)."""
    product    = models.ForeignKey(GiftProduct, on_delete=models.CASCADE, related_name="images")
    image      = models.ImageField(upload_to="gifts/products/gallery/")
    order      = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "gift_product_images"
        ordering = ["order"]


class ProductVariant(models.Model):
    """Size/colour/material variants with individual stock."""
    product    = models.ForeignKey(GiftProduct, on_delete=models.CASCADE, related_name="variants")
    name       = models.CharField(max_length=100, help_text="e.g. 'Red – Large'")
    sku        = models.CharField(max_length=50, blank=True)
    price      = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                     help_text="Override price; null = use product price")
    stock      = models.PositiveIntegerField(default=0)
    is_active  = models.BooleanField(default=True)

    class Meta:
        db_table = "gift_product_variants"

    def __str__(self):
        return f"{self.product.name} — {self.name}"

    @property
    def effective_price(self):
        return self.price if self.price is not None else self.product.price


class ProductReview(models.Model):
    """Verified-purchase reviews on gift products."""
    product              = models.ForeignKey(GiftProduct, on_delete=models.CASCADE, related_name="product_reviews")
    user                 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    reviewer_name        = models.CharField(max_length=100, blank=True)
    rating               = models.PositiveSmallIntegerField()   # 1–5
    title                = models.CharField(max_length=200, blank=True)
    comment              = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    is_approved          = models.BooleanField(default=True)
    created_at           = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gift_product_reviews"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} — {self.rating}★"


# ── Cart ───────────────────────────────────────────────────────────────────────

class Cart(models.Model):
    """Shopping cart — either anonymous (session) or authenticated."""
    user        = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="carts")
    session_key = models.CharField(max_length=100, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gift_carts"

    @property
    def total(self):
        return sum(item.line_total for item in self.items.all())

    @property
    def item_count(self):
        return self.items.aggregate(n=models.Sum("quantity"))["n"] or 0


class CartItem(models.Model):
    cart     = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product  = models.ForeignKey(GiftProduct, on_delete=models.CASCADE)
    variant  = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "gift_cart_items"
        unique_together = [("cart", "product", "variant")]

    @property
    def unit_price(self):
        return self.variant.effective_price if self.variant else self.product.price

    @property
    def line_total(self):
        return self.unit_price * self.quantity


# ── Orders (full marketplace checkout) ────────────────────────────────────────

class MarketplaceOrder(models.Model):
    """Multi-item order from the gift shop marketplace."""
    PENDING   = "PENDING"
    PAID      = "PAID"
    CONFIRMED = "CONFIRMED"
    SHIPPED   = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REFUNDED  = "REFUNDED"
    STATUS_CHOICES = [
        (PENDING,   "Pending Payment"),
        (PAID,      "Payment Received"),
        (CONFIRMED, "Order Confirmed"),
        (SHIPPED,   "Shipped"),
        (DELIVERED, "Delivered"),
        (CANCELLED, "Cancelled"),
        (REFUNDED,  "Refunded"),
    ]

    user                 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="marketplace_orders")
    buyer_name           = models.CharField(max_length=200)
    buyer_email          = models.EmailField()
    buyer_phone          = models.CharField(max_length=20, blank=True)

    # Shipping
    address_line1        = models.CharField(max_length=255)
    address_line2        = models.CharField(max_length=255, blank=True)
    city                 = models.CharField(max_length=100)
    state                = models.CharField(max_length=100)
    pincode              = models.CharField(max_length=10)
    country              = models.CharField(max_length=100, default="India")

    # Payment
    subtotal             = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_charge      = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    discount             = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_amount         = models.DecimalField(max_digits=10, decimal_places=2)
    razorpay_order_id    = models.CharField(max_length=100, unique=True, blank=True, null=True)
    razorpay_payment_id  = models.CharField(max_length=100, blank=True)
    razorpay_signature   = models.CharField(max_length=255, blank=True)

    status               = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    order_number         = models.CharField(max_length=20, unique=True, blank=True)
    notes                = models.TextField(blank=True)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gift_marketplace_orders"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.order_number:
            import random, string
            self.order_number = "SS" + "".join(random.choices(string.digits, k=8))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.order_number} — {self.buyer_name}"


class MarketplaceOrderItem(models.Model):
    order         = models.ForeignKey(MarketplaceOrder, on_delete=models.CASCADE, related_name="items")
    product       = models.ForeignKey(GiftProduct, on_delete=models.PROTECT)
    variant       = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    seller        = models.ForeignKey(GiftSeller, on_delete=models.SET_NULL, null=True, blank=True)
    product_name  = models.CharField(max_length=255)   # snapshot at time of order
    variant_name  = models.CharField(max_length=100, blank=True)
    unit_price    = models.DecimalField(max_digits=10, decimal_places=2)
    quantity      = models.PositiveIntegerField(default=1)
    line_total    = models.DecimalField(max_digits=10, decimal_places=2)

    # Per-item fulfilment
    PENDING   = "PENDING"
    SHIPPED   = "SHIPPED"
    DELIVERED = "DELIVERED"
    ITEM_STATUS = [(PENDING, "Pending"), (SHIPPED, "Shipped"), (DELIVERED, "Delivered")]
    item_status   = models.CharField(max_length=10, choices=ITEM_STATUS, default=PENDING)
    tracking_url  = models.URLField(blank=True)

    class Meta:
        db_table = "gift_marketplace_order_items"

    def __str__(self):
        return f"{self.product_name} x{self.quantity} — Order #{self.order.order_number}"


# ── Scheduled Gift & Postcard Deliveries ──────────────────────────────────────

class ScheduledDelivery(models.Model):
    """
    A user schedules a physical gift or printed postcard to be
    sent to a recipient on a specific date.
    Our team fulfils the order manually (email notification triggers fulfilment).
    """

    # Delivery type
    GIFT     = "GIFT"
    POSTCARD = "POSTCARD"
    TYPE_CHOICES = [
        (GIFT,     "Physical Gift"),
        (POSTCARD, "Printed Postcard"),
    ]

    # Fulfilment status (managed by admin team)
    SCHEDULED   = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    DISPATCHED  = "DISPATCHED"
    DELIVERED   = "DELIVERED"
    CANCELLED   = "CANCELLED"
    STATUS_CHOICES = [
        (SCHEDULED,   "Scheduled"),
        (IN_PROGRESS, "In Progress"),
        (DISPATCHED,  "Dispatched"),
        (DELIVERED,   "Delivered"),
        (CANCELLED,   "Cancelled"),
    ]

    # Payment
    PAY_PENDING = "PENDING"
    PAY_PAID    = "PAID"
    PAY_REFUNDED= "REFUNDED"
    PAY_CHOICES = [
        (PAY_PENDING,  "Pending"),
        (PAY_PAID,     "Paid"),
        (PAY_REFUNDED, "Refunded"),
    ]

    # Sender (registered user or anonymous)
    user          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name="scheduled_deliveries")
    delivery_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=GIFT)

    # Gift details (only for GIFT type)
    product       = models.ForeignKey("GiftProduct", on_delete=models.SET_NULL,
                                      null=True, blank=True, related_name="scheduled_deliveries",
                                      help_text="Gift product to send")
    product_qty   = models.PositiveIntegerField(default=1)

    # Postcard details (only for POSTCARD type)
    postcard_message  = models.TextField(blank=True, help_text="Message printed on postcard")
    postcard_template = models.CharField(max_length=50, blank=True,
                                         help_text="Postcard design template key")

    # Occasion & scheduling
    occasion       = models.CharField(max_length=100, blank=True,
                                      help_text="e.g. Birthday, Anniversary, Diwali")
    scheduled_date = models.DateField(help_text="Date on which we should dispatch")
    notes_for_team = models.TextField(blank=True, help_text="Internal notes for the fulfilment team")

    # Sender details (who is sending)
    sender_name    = models.CharField(max_length=255)
    sender_email   = models.EmailField()
    sender_phone   = models.CharField(max_length=20, blank=True)
    sender_address_line1 = models.CharField(max_length=255, blank=True)
    sender_address_line2 = models.CharField(max_length=255, blank=True)
    sender_city    = models.CharField(max_length=100, blank=True)
    sender_state   = models.CharField(max_length=100, blank=True)
    sender_pincode = models.CharField(max_length=10, blank=True)

    # Recipient details (who receives)
    recipient_name  = models.CharField(max_length=255)
    recipient_email = models.EmailField(blank=True)
    recipient_phone = models.CharField(max_length=20, blank=True)
    recipient_address_line1 = models.CharField(max_length=255)
    recipient_address_line2 = models.CharField(max_length=255, blank=True)
    recipient_city  = models.CharField(max_length=100)
    recipient_state = models.CharField(max_length=100)
    recipient_pincode = models.CharField(max_length=10)
    recipient_country = models.CharField(max_length=100, default="India")

    # Payment
    amount              = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status      = models.CharField(max_length=10, choices=PAY_CHOICES, default=PAY_PENDING)
    razorpay_order_id   = models.CharField(max_length=100, blank=True, null=True, unique=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)

    # Fulfilment
    fulfilment_status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=SCHEDULED)
    tracking_info     = models.TextField(blank=True, help_text="Courier tracking number / link")
    dispatched_at     = models.DateTimeField(null=True, blank=True)

    # Link to wedding (optional)
    website = models.ForeignKey("invitation.CoupleWebsite", on_delete=models.SET_NULL,
                                null=True, blank=True, related_name="scheduled_deliveries",
                                help_text="Link to a wedding invitation (optional)")

    # Annual subscription flag
    is_subscription = models.BooleanField(default=False,
                                          help_text="True if covered by annual subscription plan")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gift_scheduled_deliveries"
        ordering = ["scheduled_date", "-created_at"]
        verbose_name = "Scheduled Delivery"
        verbose_name_plural = "Scheduled Deliveries"

    def __str__(self):
        return (f"[{self.get_delivery_type_display()}] {self.recipient_name} "
                f"← {self.sender_name} on {self.scheduled_date}")

    @property
    def is_paid(self):
        return self.payment_status == self.PAY_PAID

    @property
    def amount_paise(self):
        return int(self.amount * 100)
