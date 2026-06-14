from __future__ import annotations
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class SubscriptionRead(BaseModel):
    id: int
    plan: str
    status: str
    is_yearly: bool
    current_period_start: datetime
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool
    razorpay_subscription_id: str
    model_config = {"from_attributes": True}


class TransactionRead(BaseModel):
    id: int
    amount: Decimal
    currency: str
    status: str
    description: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: str
    created_at: datetime
    model_config = {"from_attributes": True}


class CreateSubscriptionRequest(BaseModel):
    plan: str                    # FREE / BASIC / PRO / PREMIUM
    is_yearly: bool = False


class RazorpayOrderResponse(BaseModel):
    razorpay_order_id: str
    amount_paise: int
    currency: str
    key: str                     # Razorpay public key for frontend


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
