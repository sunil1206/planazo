import hashlib, hmac
import razorpay
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Subscription, Transaction

PLAN_PRICES = {
    "BASIC":   99900,   # ₹999   in paise
    "PREMIUM": 249900,  # ₹2499
    "ELITE":   499900,  # ₹4999
}

rzp_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan", "").upper()
        if plan not in PLAN_PRICES:
            return Response({"error": "Invalid plan."}, status=400)

        amount = PLAN_PRICES[plan]
        order  = rzp_client.order.create({
            "amount":   amount,
            "currency": "INR",
            "receipt":  f"order_{request.user.id}_{plan}",
        })

        sub, _ = Subscription.objects.get_or_create(account=request.user)
        Transaction.objects.create(
            subscription=sub,
            razorpay_order_id=order["id"],
            amount=amount / 100,
            plan=plan,
        )

        return Response({
            "order_id": order["id"],
            "key_id":   settings.RAZORPAY_KEY_ID,
            "amount":   amount,
            "currency": "INR",
            "plan":     plan,
        })


class WebhookView(APIView):
    """Razorpay sends payment.captured event here."""
    permission_classes = [AllowAny]

    def post(self, request):
        payload   = request.body
        signature = request.headers.get("X-Razorpay-Signature", "")
        secret    = settings.RAZORPAY_KEY_SECRET.encode()
        digest    = hmac.new(secret, payload, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(digest, signature):
            return Response({"error": "Invalid signature"}, status=400)

        event = request.data.get("event")
        if event == "payment.captured":
            payment   = request.data["payload"]["payment"]["entity"]
            order_id  = payment.get("order_id")
            payment_id = payment.get("id")

            try:
                txn = Transaction.objects.get(razorpay_order_id=order_id, status=Transaction.PENDING)
                txn.razorpay_payment_id = payment_id
                txn.status = Transaction.PAID
                txn.save(update_fields=["razorpay_payment_id", "status"])

                sub = txn.subscription
                sub.plan       = txn.plan
                sub.is_active  = True
                sub.start_date = timezone.now()
                sub.end_date   = timezone.now() + timedelta(days=365)
                sub.save(update_fields=["plan", "is_active", "start_date", "end_date"])
            except Transaction.DoesNotExist:
                pass  # Already processed (idempotent)

        return Response({"status": "ok"})


class SubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sub = request.user.subscription
            return Response({
                "plan":      sub.plan,
                "is_active": sub.is_active,
                "end_date":  sub.end_date,
            })
        except Subscription.DoesNotExist:
            return Response({"plan": "FREE", "is_active": False, "end_date": None})
