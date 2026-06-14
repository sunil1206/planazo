from django.conf import settings
from django.db import models


class Subscription(models.Model):
    FREE    = "FREE"
    BASIC   = "BASIC"
    PREMIUM = "PREMIUM"
    ELITE   = "ELITE"
    PLAN_CHOICES = [(FREE,"Free"),(BASIC,"Basic"),(PREMIUM,"Premium"),(ELITE,"Elite")]

    account    = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription")
    plan       = models.CharField(max_length=10, choices=PLAN_CHOICES, default=FREE)
    razorpay_subscription_id = models.CharField(max_length=100, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date   = models.DateTimeField(null=True, blank=True)
    is_active  = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"

    def __str__(self):
        return f"{self.account.email} — {self.plan}"


class Transaction(models.Model):
    PENDING = "PENDING"
    PAID    = "PAID"
    FAILED  = "FAILED"
    STATUS_CHOICES = [(PENDING,"Pending"),(PAID,"Paid"),(FAILED,"Failed")]

    subscription       = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="transactions")
    razorpay_order_id  = models.CharField(max_length=100, unique=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    amount             = models.DecimalField(max_digits=10, decimal_places=2)
    currency           = models.CharField(max_length=5, default="INR")
    status             = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    plan               = models.CharField(max_length=10)
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.razorpay_order_id} — {self.status}"
