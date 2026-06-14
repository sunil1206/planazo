from __future__ import annotations
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, date
from pydantic import BaseModel, EmailStr


# ── GiftCategory ──────────────────────────────────────────────────────────────

class GiftCategoryRead(BaseModel):
    id: int
    name: str
    emoji: str
    icon_image: Optional[str] = None
    order: int
    model_config = {"from_attributes": True}


# ── ProductImage ──────────────────────────────────────────────────────────────

class ProductImageRead(BaseModel):
    id: int
    image: str
    order: int
    model_config = {"from_attributes": True}


# ── ProductVariant ────────────────────────────────────────────────────────────

class ProductVariantRead(BaseModel):
    id: int
    name: str
    sku: str
    price: Optional[Decimal] = None
    stock: int
    is_active: bool
    model_config = {"from_attributes": True}


class ProductVariantCreate(BaseModel):
    name: str
    sku: str = ""
    price: Optional[Decimal] = None
    stock: int = 0
    is_active: bool = True


# ── ProductReview ─────────────────────────────────────────────────────────────

class ProductReviewCreate(BaseModel):
    rating: int
    title: str = ""
    comment: str
    reviewer_name: str = ""


class ProductReviewRead(ProductReviewCreate):
    id: int
    is_approved: bool
    is_verified_purchase: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── GiftProduct ───────────────────────────────────────────────────────────────

class GiftProductBase(BaseModel):
    name: str
    description: str = ""
    short_desc: str = ""
    price: Decimal
    compare_price: Optional[Decimal] = None
    stock: int = 100
    sku: str = ""
    weight_grams: Optional[int] = None
    tags: List[str] = []
    is_available: bool = True
    is_featured: bool = False
    is_cod: bool = True
    category_id: Optional[int] = None


class GiftProductCreate(GiftProductBase):
    slug: str


class GiftProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    short_desc: Optional[str] = None
    price: Optional[Decimal] = None
    compare_price: Optional[Decimal] = None
    stock: Optional[int] = None
    is_available: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_cod: Optional[bool] = None
    category_id: Optional[int] = None
    image: Optional[str] = None


class GiftProductRead(GiftProductBase):
    id: int
    slug: str
    image: Optional[str] = None
    seller_id: Optional[int] = None
    images: List[ProductImageRead] = []
    variants: List[ProductVariantRead] = []
    model_config = {"from_attributes": True}


# ── Cart ──────────────────────────────────────────────────────────────────────

class CartItemCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1


class CartItemRead(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    product: GiftProductRead
    model_config = {"from_attributes": True}


class CartRead(BaseModel):
    id: int
    items: List[CartItemRead] = []
    model_config = {"from_attributes": True}


# ── GiftOrder (wedding gift) ──────────────────────────────────────────────────

class GiftOrderCreate(BaseModel):
    product_id: int
    website_id: Optional[int] = None
    sender_name: str
    sender_email: EmailStr
    sender_phone: str = ""
    message: str = ""
    delivery_type: str = "COUPLE"
    recipient_name: str = ""
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    country: str = "India"


class GiftOrderRead(GiftOrderCreate):
    id: int
    amount: Decimal
    razorpay_order_id: Optional[str] = None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── MarketplaceOrder ──────────────────────────────────────────────────────────

class MarketplaceOrderItemRead(BaseModel):
    id: int
    product_name: str
    variant_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal
    item_status: str
    model_config = {"from_attributes": True}


class MarketplaceOrderCreate(BaseModel):
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: str = ""
    address_line1: str
    address_line2: str = ""
    city: str
    state: str
    pincode: str
    country: str = "India"
    notes: str = ""


class MarketplaceOrderRead(MarketplaceOrderCreate):
    id: int
    order_number: str
    subtotal: Decimal
    shipping_charge: Decimal
    discount: Decimal
    total_amount: Decimal
    razorpay_order_id: Optional[str] = None
    status: str
    items: List[MarketplaceOrderItemRead] = []
    created_at: datetime
    model_config = {"from_attributes": True}


# ── ScheduledDelivery ─────────────────────────────────────────────────────────

class ScheduledDeliveryCreate(BaseModel):
    delivery_type: str = "GIFT"
    product_id: Optional[int] = None
    product_qty: int = 1
    postcard_message: str = ""
    postcard_template: str = ""
    occasion: str = ""
    scheduled_date: date
    notes_for_team: str = ""
    sender_name: str
    sender_email: EmailStr
    sender_phone: str = ""
    sender_address_line1: str = ""
    sender_city: str = ""
    sender_state: str = ""
    sender_pincode: str = ""
    recipient_name: str
    recipient_email: str = ""
    recipient_phone: str = ""
    recipient_address_line1: str
    recipient_city: str
    recipient_state: str
    recipient_pincode: str
    recipient_country: str = "India"
    website_id: Optional[int] = None


class ScheduledDeliveryRead(ScheduledDeliveryCreate):
    id: int
    amount: Decimal
    payment_status: str
    fulfilment_status: str
    razorpay_order_id: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── GiftSeller ────────────────────────────────────────────────────────────────

class GiftSellerCreate(BaseModel):
    business_name: str
    description: str = ""
    phone: str = ""
    email: str = ""
    gstin: str = ""
    bank_account: str = ""
    ifsc: str = ""


class GiftSellerRead(GiftSellerCreate):
    id: int
    status: str
    commission_pct: Decimal
    model_config = {"from_attributes": True}
