from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text,
    ForeignKey, Numeric, UniqueConstraint, JSON, Date
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class GiftSeller(Base):
    __tablename__ = "gift_sellers"

    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_name  = Column(String(255), nullable=False)
    description    = Column(Text, default="")
    logo           = Column(String(200), nullable=True)
    phone          = Column(String(20), default="")
    email          = Column(String(254), default="")
    gstin          = Column(String(20), default="")
    bank_account   = Column(String(30), default="")
    ifsc           = Column(String(12), default="")
    status         = Column(String(10), default="PENDING")
    commission_pct = Column(Numeric(5, 2), default=10)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    user     = relationship("User",       back_populates="seller_profile")
    products = relationship("GiftProduct",back_populates="seller")


class GiftCategory(Base):
    __tablename__ = "gift_categories"

    id         = Column(Integer, primary_key=True)
    name       = Column(String(100), unique=True, nullable=False)
    emoji      = Column(String(10), default="")
    icon_image = Column(String(200), nullable=True)
    order      = Column(Integer, default=0)

    products = relationship("GiftProduct", back_populates="category")


class GiftProduct(Base):
    __tablename__ = "gift_products"

    id            = Column(Integer, primary_key=True, index=True)
    seller_id     = Column(Integer, ForeignKey("gift_sellers.id", ondelete="SET NULL"), nullable=True)
    category_id   = Column(Integer, ForeignKey("gift_categories.id", ondelete="SET NULL"), nullable=True)
    name          = Column(String(255), nullable=False)
    slug          = Column(String(300), unique=True, nullable=False, index=True)
    description   = Column(Text, nullable=False, default="")
    short_desc    = Column(String(300), default="")
    price         = Column(Numeric(10, 2), nullable=False)
    compare_price = Column(Numeric(10, 2), nullable=True)
    image         = Column(String(200), nullable=True)
    stock         = Column(Integer, default=100)
    sku           = Column(String(50), default="")
    weight_grams  = Column(Integer, nullable=True)
    tags          = Column(JSON, default=list)
    is_available  = Column(Boolean, default=True)
    is_featured   = Column(Boolean, default=False)
    is_cod        = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    seller           = relationship("GiftSeller",          back_populates="products")
    category         = relationship("GiftCategory",        back_populates="products")
    images           = relationship("ProductImage",        back_populates="product", cascade="all, delete-orphan")
    variants         = relationship("ProductVariant",      back_populates="product", cascade="all, delete-orphan")
    product_reviews  = relationship("ProductReview",       back_populates="product", cascade="all, delete-orphan")
    orders           = relationship("GiftOrder",           back_populates="product")
    scheduled_deliveries = relationship("ScheduledDelivery", back_populates="product")


class ProductImage(Base):
    __tablename__ = "gift_product_images"

    id         = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("gift_products.id", ondelete="CASCADE"), nullable=False)
    image      = Column(String(200), nullable=False)
    order      = Column(Integer, default=0)

    product = relationship("GiftProduct", back_populates="images")


class ProductVariant(Base):
    __tablename__ = "gift_product_variants"

    id         = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("gift_products.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(100), nullable=False)
    sku        = Column(String(50), default="")
    price      = Column(Numeric(10, 2), nullable=True)
    stock      = Column(Integer, default=0)
    is_active  = Column(Boolean, default=True)

    product = relationship("GiftProduct", back_populates="variants")


class ProductReview(Base):
    __tablename__ = "gift_product_reviews"

    id                   = Column(Integer, primary_key=True)
    product_id           = Column(Integer, ForeignKey("gift_products.id", ondelete="CASCADE"), nullable=False)
    user_id              = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    reviewer_name        = Column(String(100), default="")
    rating               = Column(Integer, nullable=False)
    title                = Column(String(200), default="")
    comment              = Column(Text, nullable=False)
    is_verified_purchase = Column(Boolean, default=False)
    is_approved          = Column(Boolean, default=True)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("GiftProduct", back_populates="product_reviews")
    user    = relationship("User")


class Cart(Base):
    __tablename__ = "gift_carts"

    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=True)
    session_key = Column(String(100), default="")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    user  = relationship("User")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "gift_cart_items"
    __table_args__ = (UniqueConstraint("cart_id", "product_id", "variant_id"),)

    id         = Column(Integer, primary_key=True)
    cart_id    = Column(Integer, ForeignKey("gift_carts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("gift_products.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(Integer, ForeignKey("gift_product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity   = Column(Integer, default=1)

    cart    = relationship("Cart",           back_populates="items")
    product = relationship("GiftProduct")
    variant = relationship("ProductVariant")


class GiftOrder(Base):
    __tablename__ = "gift_orders"

    id                   = Column(Integer, primary_key=True)
    product_id           = Column(Integer, ForeignKey("gift_products.id", ondelete="RESTRICT"), nullable=False)
    website_id           = Column(Integer, ForeignKey("couple_websites.id", ondelete="SET NULL"), nullable=True)
    sender_name          = Column(String(255), nullable=False)
    sender_email         = Column(String(254), nullable=False)
    sender_phone         = Column(String(20), default="")
    message              = Column(Text, default="")
    delivery_type        = Column(String(10), default="COUPLE")
    recipient_name       = Column(String(255), default="")
    address_line1        = Column(String(255), default="")
    address_line2        = Column(String(255), default="")
    city                 = Column(String(100), default="")
    state                = Column(String(100), default="")
    pincode              = Column(String(10), default="")
    country              = Column(String(100), default="India")
    amount               = Column(Numeric(10, 2), nullable=False)
    razorpay_order_id    = Column(String(100), unique=True, nullable=True)
    razorpay_payment_id  = Column(String(100), default="")
    status               = Column(String(10), default="PENDING")
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), onupdate=func.now())

    product = relationship("GiftProduct", back_populates="orders")
    website = relationship("CoupleWebsite", back_populates="gift_orders")


class MarketplaceOrder(Base):
    __tablename__ = "gift_marketplace_orders"

    id                   = Column(Integer, primary_key=True)
    user_id              = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    buyer_name           = Column(String(200), nullable=False)
    buyer_email          = Column(String(254), nullable=False)
    buyer_phone          = Column(String(20), default="")
    address_line1        = Column(String(255), nullable=False)
    address_line2        = Column(String(255), default="")
    city                 = Column(String(100), nullable=False)
    state                = Column(String(100), nullable=False)
    pincode              = Column(String(10), nullable=False)
    country              = Column(String(100), default="India")
    subtotal             = Column(Numeric(10, 2), default=0)
    shipping_charge      = Column(Numeric(8, 2), default=0)
    discount             = Column(Numeric(8, 2), default=0)
    total_amount         = Column(Numeric(10, 2), nullable=False)
    razorpay_order_id    = Column(String(100), unique=True, nullable=True)
    razorpay_payment_id  = Column(String(100), default="")
    razorpay_signature   = Column(String(255), default="")
    status               = Column(String(10), default="PENDING")
    order_number         = Column(String(20), unique=True, nullable=False)
    notes                = Column(Text, default="")
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), onupdate=func.now())

    user  = relationship("User",                  back_populates="marketplace_orders")
    items = relationship("MarketplaceOrderItem",   back_populates="order", cascade="all, delete-orphan")


class MarketplaceOrderItem(Base):
    __tablename__ = "gift_marketplace_order_items"

    id           = Column(Integer, primary_key=True)
    order_id     = Column(Integer, ForeignKey("gift_marketplace_orders.id", ondelete="CASCADE"), nullable=False)
    product_id   = Column(Integer, ForeignKey("gift_products.id", ondelete="RESTRICT"), nullable=False)
    variant_id   = Column(Integer, ForeignKey("gift_product_variants.id", ondelete="SET NULL"), nullable=True)
    seller_id    = Column(Integer, ForeignKey("gift_sellers.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False)
    variant_name = Column(String(100), default="")
    unit_price   = Column(Numeric(10, 2), nullable=False)
    quantity     = Column(Integer, default=1)
    line_total   = Column(Numeric(10, 2), nullable=False)
    item_status  = Column(String(10), default="PENDING")
    tracking_url = Column(String(200), default="")

    order   = relationship("MarketplaceOrder",  back_populates="items")
    product = relationship("GiftProduct")
    variant = relationship("ProductVariant")
    seller  = relationship("GiftSeller")


class ScheduledDelivery(Base):
    __tablename__ = "gift_scheduled_deliveries"

    id                      = Column(Integer, primary_key=True)
    user_id                 = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True)
    delivery_type           = Column(String(10), default="GIFT")
    product_id              = Column(Integer, ForeignKey("gift_products.id", ondelete="SET NULL"), nullable=True)
    product_qty             = Column(Integer, default=1)
    postcard_message        = Column(Text, default="")
    postcard_template       = Column(String(50), default="")
    occasion                = Column(String(100), default="")
    scheduled_date          = Column(Date, nullable=False)
    notes_for_team          = Column(Text, default="")
    sender_name             = Column(String(255), nullable=False)
    sender_email            = Column(String(254), nullable=False)
    sender_phone            = Column(String(20), default="")
    sender_address_line1    = Column(String(255), default="")
    sender_address_line2    = Column(String(255), default="")
    sender_city             = Column(String(100), default="")
    sender_state            = Column(String(100), default="")
    sender_pincode          = Column(String(10), default="")
    recipient_name          = Column(String(255), nullable=False)
    recipient_email         = Column(String(254), default="")
    recipient_phone         = Column(String(20), default="")
    recipient_address_line1 = Column(String(255), nullable=False)
    recipient_address_line2 = Column(String(255), default="")
    recipient_city          = Column(String(100), nullable=False)
    recipient_state         = Column(String(100), nullable=False)
    recipient_pincode       = Column(String(10), nullable=False)
    recipient_country       = Column(String(100), default="India")
    amount                  = Column(Numeric(10, 2), default=0)
    payment_status          = Column(String(10), default="PENDING")
    razorpay_order_id       = Column(String(100), unique=True, nullable=True)
    razorpay_payment_id     = Column(String(100), default="")
    fulfilment_status       = Column(String(15), default="SCHEDULED")
    tracking_info           = Column(Text, default="")
    dispatched_at           = Column(DateTime(timezone=True), nullable=True)
    website_id              = Column(Integer, ForeignKey("couple_websites.id", ondelete="SET NULL"), nullable=True)
    is_subscription         = Column(Boolean, default=False)
    created_at              = Column(DateTime(timezone=True), server_default=func.now())
    updated_at              = Column(DateTime(timezone=True), onupdate=func.now())

    user    = relationship("User",          foreign_keys=[user_id])
    product = relationship("GiftProduct",   back_populates="scheduled_deliveries")
    website = relationship("CoupleWebsite", back_populates="scheduled_deliveries")
