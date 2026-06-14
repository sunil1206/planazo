"""
Payment router — mirrors backend/apps/payment/views.py.

Endpoints:
  GET  /api/payment/subscription/
  POST /api/payment/subscription/create/
  POST /api/payment/subscription/verify/
  GET  /api/payment/transactions/
  POST /api/payment/razorpay-webhook/
"""
import hmac
import hashlib

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.models.payment import UserSubscription, Transaction
from app.models.user import User
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.schemas.payment import (
    SubscriptionRead, TransactionRead,
    CreateSubscriptionRequest, RazorpayOrderResponse, VerifyPaymentRequest,
)
from typing import List

router = APIRouter(prefix="/api/payment", tags=["payment"])

PLAN_PRICES_INR = {
    "FREE": 0,
    "BASIC": 49900,    # paise
    "PRO": 99900,
    "PREMIUM": 199900,
}


def get_razorpay():
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


# ── Subscription ──────────────────────────────────────────────────────────────

@router.get("/subscription/", response_model=SubscriptionRead)
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.account_id == user.id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "No subscription found")
    return sub


@router.post("/subscription/create/", response_model=RazorpayOrderResponse)
async def create_subscription_order(
    body: CreateSubscriptionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = body.plan.upper()
    if plan not in PLAN_PRICES_INR:
        raise HTTPException(400, f"Unknown plan: {plan}")

    amount = PLAN_PRICES_INR[plan]
    if amount == 0:
        raise HTTPException(400, "FREE plan does not require payment")

    if body.is_yearly:
        amount = int(amount * 10)  # 2 months free on yearly

    rz = get_razorpay()
    order = rz.order.create({
        "amount": amount,
        "currency": "INR",
        "receipt": f"sub_{user.id}_{plan}",
        "notes": {"user_id": user.id, "plan": plan},
    })
    return {
        "razorpay_order_id": order["id"],
        "amount_paise": amount,
        "currency": "INR",
        "key": settings.RAZORPAY_KEY_ID,
    }


@router.post("/subscription/verify/")
async def verify_subscription_payment(
    body: VerifyPaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify signature
    payload = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    if expected != body.razorpay_signature:
        raise HTTPException(400, "Invalid payment signature")

    # Fetch Razorpay order details to determine plan
    rz = get_razorpay()
    rz_order = rz.order.fetch(body.razorpay_order_id)
    plan = rz_order.get("notes", {}).get("plan", "BASIC")

    # Update/create subscription
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.account_id == user.id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.plan = plan
        sub.razorpay_payment_id = body.razorpay_payment_id
        sub.status = "ACTIVE"
    else:
        sub = UserSubscription(
            account_id=user.id,
            plan=plan,
            status="ACTIVE",
            razorpay_payment_id=body.razorpay_payment_id,
        )
        db.add(sub)
    await db.flush()

    # Record transaction
    txn = Transaction(
        account_id=user.id,
        subscription_id=sub.id,
        amount=rz_order["amount"] / 100,
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
        status="SUCCESS",
        description=f"Subscription: {plan}",
    )
    db.add(txn)
    await db.commit()
    return {"detail": "Payment verified", "plan": plan}


# ── Transactions ──────────────────────────────────────────────────────────────

@router.get("/transactions/", response_model=List[TransactionRead])
async def list_transactions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.account_id == user.id)
        .order_by(Transaction.created_at.desc())
    )
    return result.scalars().all()


# ── Razorpay webhook ──────────────────────────────────────────────────────────

@router.post("/razorpay-webhook/")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    if expected != sig:
        raise HTTPException(400, "Invalid webhook signature")

    import json
    payload = json.loads(body)
    event = payload.get("event", "")

    if event == "payment.captured":
        # Update transaction status if needed
        payment = payload["payload"]["payment"]["entity"]
        result = await db.execute(
            select(Transaction).where(
                Transaction.razorpay_payment_id == payment["id"]
            )
        )
        txn = result.scalar_one_or_none()
        if txn and txn.status != "SUCCESS":
            txn.status = "SUCCESS"
            await db.commit()

    return {"status": "ok"}
