from django.urls import path
from .views import CreateOrderView, WebhookView, SubscriptionStatusView

urlpatterns = [
    path("create-order/",   CreateOrderView.as_view(),      name="payment-create"),
    path("webhook/",        WebhookView.as_view(),          name="payment-webhook"),
    path("subscription/",   SubscriptionStatusView.as_view(),name="payment-status"),
]
