from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class UserSubscription(Base):
    __tablename__ = "subscriptions"

    id                       = Column(Integer, primary_key=True)
    account_id               = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan                     = Column(String(10), nullable=False, default="FREE")
    status                   = Column(String(10), nullable=False, default="ACTIVE")
    razorpay_subscription_id = Column(String(100), default="")
    razorpay_payment_id      = Column(String(100), default="")
    is_yearly                = Column(Boolean, default=False)
    current_period_start     = Column(DateTime(timezone=True), server_default=func.now())
    current_period_end       = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end     = Column(Boolean, default=False)
    created_at               = Column(DateTime(timezone=True), server_default=func.now())
    updated_at               = Column(DateTime(timezone=True), onupdate=func.now())

    account      = relationship("User",        back_populates="subscription")
    transactions = relationship("Transaction", back_populates="subscription")


class Transaction(Base):
    __tablename__ = "transactions"

    id                   = Column(Integer, primary_key=True)
    subscription_id      = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    account_id           = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    amount               = Column(Numeric(10, 2), nullable=False)
    currency             = Column(String(10), default="INR")
    razorpay_order_id    = Column(String(100), unique=True, nullable=True)
    razorpay_payment_id  = Column(String(100), default="")
    razorpay_signature   = Column(String(255), default="")
    status               = Column(String(10), default="PENDING")
    description          = Column(String(255), default="")
    created_at           = Column(DateTime(timezone=True), server_default=func.now())

    subscription = relationship("UserSubscription", back_populates="transactions")
    account      = relationship("User",             back_populates="transactions")
