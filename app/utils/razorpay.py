"""Razorpay helpers shared across payment and gift routers."""
import hmac
import hashlib
from app.core.config import settings


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Return True if the payment signature is valid."""
    payload = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def create_order(amount_paise: int, receipt: str, notes: dict = None):
    import razorpay
    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
    payload = {"amount": amount_paise, "currency": "INR", "receipt": receipt}
    if notes:
        payload["notes"] = notes
    return client.order.create(payload)
