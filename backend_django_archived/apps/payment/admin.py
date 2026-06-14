from django.contrib import admin
from .models import Subscription, Transaction

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["account", "plan", "is_active", "start_date", "end_date"]
    list_filter  = ["plan", "is_active"]

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["razorpay_order_id", "plan", "amount", "status", "created_at"]
    list_filter  = ["status", "plan"]
