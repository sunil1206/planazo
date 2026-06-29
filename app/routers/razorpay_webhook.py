"""
Razorpay webhook handler.

Razorpay signs every webhook with HMAC-SHA256 using the webhook secret.
We verify the signature before processing any event.

Supported events:
  payment.captured   — mark GiftOrder / MarketplaceOrder / UserSubscription as paid
  payment.failed     — mark as FAILED
  order.paid         — idempotent alias for payment.captured on marketplace orders
  subscription.activated  — activate UserSubscription
  subscription.cancelled  — cancel UserSubscription

Endpoint: POST /api/webhooks/razorpay/
"""
import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.base import get_db
from app.models.gift import GiftOrder, MarketplaceOrder
from app.models.payment import UserSubscription, Transaction

logger = logging.getLogger("planazo.webhook.razorpay")

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def _verify_signature(body: bytes, signature: str) -> bool:
    """Return True if the webhook body matches the Razorpay HMAC-SHA256 signature."""
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        logger.warning("RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification")
        return True
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _handle_payment_captured(payload: dict, db: AsyncSession) -> str:
    payment = payload.get("payment", {}).get("entity", {})
    payment_id = payment.get("id")
    order_id   = payment.get("order_id")
    amount_paise = payment.get("amount", 0)
    notes      = payment.get("notes", {})

    order_type = notes.get("order_type", "")
    internal_id = notes.get("order_id") or notes.get("gift_order_id")

    if order_type == "GIFT" and internal_id:
        result = await db.execute(select(GiftOrder).where(GiftOrder.id == int(internal_id)))
        order = result.scalar_one_or_none()
        if order and order.status != "COMPLETED":
            order.status = "COMPLETED"
            order.razorpay_payment_id = payment_id
            await db.commit()
            logger.info("GiftOrder %s marked COMPLETED via webhook", internal_id)
            return f"gift_order:{internal_id}:completed"

    if order_type == "MARKETPLACE" and internal_id:
        result = await db.execute(select(MarketplaceOrder).where(MarketplaceOrder.id == int(internal_id)))
        morder = result.scalar_one_or_none()
        if morder and morder.status not in ("COMPLETED", "PROCESSING"):
            morder.status = "PROCESSING"
            morder.razorpay_payment_id = payment_id
            await db.commit()
            logger.info("MarketplaceOrder %s marked PROCESSING via webhook", internal_id)
            return f"marketplace_order:{internal_id}:processing"

    # Record as a generic transaction
    txn = Transaction(
        razorpay_payment_id=payment_id,
        razorpay_order_id=order_id,
        amount=amount_paise / 100,
        status="CAPTURED",
        description=f"Webhook capture — notes: {json.dumps(notes)}",
    )
    db.add(txn)
    await db.commit()
    return f"transaction:{payment_id}:recorded"


async def _handle_payment_failed(payload: dict, db: AsyncSession) -> str:
    payment = payload.get("payment", {}).get("entity", {})
    payment_id = payment.get("id")
    notes = payment.get("notes", {})

    order_type  = notes.get("order_type", "")
    internal_id = notes.get("order_id") or notes.get("gift_order_id")

    if order_type == "GIFT" and internal_id:
        result = await db.execute(select(GiftOrder).where(GiftOrder.id == int(internal_id)))
        order = result.scalar_one_or_none()
        if order and order.status == "PENDING":
            order.status = "FAILED"
            await db.commit()
    elif order_type == "MARKETPLACE" and internal_id:
        result = await db.execute(select(MarketplaceOrder).where(MarketplaceOrder.id == int(internal_id)))
        morder = result.scalar_one_or_none()
        if morder and morder.status == "PENDING":
            morder.status = "FAILED"
            await db.commit()

    return f"payment_failed:{payment_id}:recorded"


async def _handle_subscription_activated(payload: dict, db: AsyncSession) -> str:
    sub_entity = payload.get("subscription", {}).get("entity", {})
    razorpay_sub_id = sub_entity.get("id")
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.razorpay_subscription_id == razorpay_sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "ACTIVE"
        await db.commit()
        return f"subscription:{razorpay_sub_id}:activated"
    return f"subscription:{razorpay_sub_id}:not_found"


async def _handle_subscription_cancelled(payload: dict, db: AsyncSession) -> str:
    sub_entity = payload.get("subscription", {}).get("entity", {})
    razorpay_sub_id = sub_entity.get("id")
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.razorpay_subscription_id == razorpay_sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "CANCELLED"
        await db.commit()
        return f"subscription:{razorpay_sub_id}:cancelled"
    return f"subscription:{razorpay_sub_id}:not_found"


# ── Main webhook endpoint ─────────────────────────────────────────────────────

@router.post("/razorpay/")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if not _verify_signature(body, signature):
        logger.warning("Razorpay webhook signature mismatch")
        raise HTTPException(400, "Invalid webhook signature")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON payload")

    event   = data.get("event", "")
    payload = data.get("payload", {})

    logger.info("Razorpay webhook received: %s", event)

    handlers = {
        "payment.captured":          _handle_payment_captured,
        "order.paid":                _handle_payment_captured,
        "payment.failed":            _handle_payment_failed,
        "subscription.activated":    _handle_subscription_activated,
        "subscription.cancelled":    _handle_subscription_cancelled,
        "subscription.completed":    _handle_subscription_cancelled,
    }

    handler = handlers.get(event)
    if handler:
        result = await handler(payload, db)
        logger.info("Webhook handled: %s → %s", event, result)
    else:
        logger.debug("Unhandled Razorpay event: %s", event)

    # Always return 200 so Razorpay doesn't retry
    return {"received": True, "event": event}
