"""
Gift/Marketplace router — mirrors backend/apps/gift/views.py.

Endpoints (public):
  GET  /api/gifts/categories/
  GET  /api/gifts/products/
  GET  /api/gifts/products/{slug}/
  POST /api/gifts/products/{slug}/reviews/

Endpoints (authenticated couple — send a gift):
  POST /api/gifts/orders/
  POST /api/gifts/orders/{id}/verify/
  GET  /api/gifts/orders/

Endpoints (marketplace cart + checkout):
  GET/POST/DELETE /api/gifts/cart/
  POST /api/gifts/marketplace/checkout/
  POST /api/gifts/marketplace/verify/
  GET  /api/gifts/marketplace/orders/

Endpoints (scheduled deliveries):
  POST /api/gifts/scheduled/
  GET  /api/gifts/scheduled/

Endpoints (seller):
  GET/POST /api/gifts/seller/
"""
import hmac
import hashlib
from typing import List, Optional

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.models.gift import (
    GiftCategory, GiftProduct, ProductReview, Cart, CartItem,
    GiftOrder, MarketplaceOrder, MarketplaceOrderItem, ScheduledDelivery,
    GiftSeller,
)
from app.models.invitation import CoupleWebsite
from app.models.user import User
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.config import settings
from app.schemas.gift import (
    GiftCategoryRead, GiftProductRead, ProductReviewCreate, ProductReviewRead,
    CartItemCreate, CartItemRead, CartRead,
    GiftOrderCreate, GiftOrderRead,
    MarketplaceOrderCreate, MarketplaceOrderRead,
    ScheduledDeliveryCreate, ScheduledDeliveryRead,
    GiftSellerCreate, GiftSellerRead,
)
from app.schemas.payment import RazorpayOrderResponse, VerifyPaymentRequest

router = APIRouter(prefix="/api/gifts", tags=["gifts"])


def get_razorpay():
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories/", response_model=List[GiftCategoryRead])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GiftCategory).order_by(GiftCategory.order))
    return result.scalars().all()


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/products/", response_model=List[GiftProductRead])
async def list_products(
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    featured: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(GiftProduct)
        .where(GiftProduct.is_available == True)
        .options(
            selectinload(GiftProduct.images),
            selectinload(GiftProduct.variants),
        )
    )
    if category_id:
        q = q.where(GiftProduct.category_id == category_id)
    if search:
        q = q.where(GiftProduct.name.ilike(f"%{search}%"))
    if featured is not None:
        q = q.where(GiftProduct.is_featured == featured)
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/products/{slug}/", response_model=GiftProductRead)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GiftProduct)
        .where(GiftProduct.slug == slug, GiftProduct.is_available == True)
        .options(
            selectinload(GiftProduct.images),
            selectinload(GiftProduct.variants),
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@router.post("/products/{slug}/reviews/", response_model=ProductReviewRead, status_code=201)
async def create_review(
    slug: str,
    body: ProductReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GiftProduct).where(GiftProduct.slug == slug)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    review = ProductReview(**body.model_dump(), product_id=product.id, user_id=user.id)
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


# ── Wedding gift orders (guest sends gift to couple) ──────────────────────────

@router.post("/orders/", response_model=RazorpayOrderResponse, status_code=201)
async def create_gift_order(
    body: GiftOrderCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GiftProduct).where(
            GiftProduct.id == body.product_id, GiftProduct.is_available == True
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")

    amount_paise = int(product.price * 100)
    rz = get_razorpay()
    rz_order = rz.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"gift_{product.id}",
    })

    order = GiftOrder(
        **body.model_dump(),
        amount=product.price,
        razorpay_order_id=rz_order["id"],
        status="PENDING",
    )
    db.add(order)
    await db.commit()
    return {
        "razorpay_order_id": rz_order["id"],
        "amount_paise": amount_paise,
        "currency": "INR",
        "key": settings.RAZORPAY_KEY_ID,
    }


@router.post("/orders/{order_id}/verify/")
async def verify_gift_order(
    order_id: int,
    body: VerifyPaymentRequest,
    db: AsyncSession = Depends(get_db),
):
    payload = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    if expected != body.razorpay_signature:
        raise HTTPException(400, "Invalid payment signature")

    result = await db.execute(select(GiftOrder).where(GiftOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = "PAID"
    order.razorpay_payment_id = body.razorpay_payment_id
    await db.commit()
    return {"detail": "Payment verified"}


# ── Cart ──────────────────────────────────────────────────────────────────────

async def _get_or_create_cart(user: User, db: AsyncSession) -> Cart:
    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == user.id)
        .options(selectinload(Cart.items).selectinload(CartItem.product))
    )
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        await db.commit()
        await db.refresh(cart)
    return cart


@router.get("/cart/", response_model=CartRead)
async def get_cart(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_or_create_cart(user, db)


@router.post("/cart/", response_model=CartRead)
async def add_to_cart(
    body: CartItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await _get_or_create_cart(user, db)
    # Check if item already in cart
    result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.product_id == body.product_id,
            CartItem.variant_id == body.variant_id,
        )
    )
    item = result.scalar_one_or_none()
    if item:
        item.quantity += body.quantity
    else:
        item = CartItem(**body.model_dump(), cart_id=cart.id)
        db.add(item)
    await db.commit()
    return await _get_or_create_cart(user, db)


@router.delete("/cart/{item_id}/", status_code=204)
async def remove_from_cart(
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await _get_or_create_cart(user, db)
    result = await db.execute(
        select(CartItem).where(
            CartItem.id == item_id, CartItem.cart_id == cart.id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Cart item not found")
    await db.delete(item)
    await db.commit()


# ── Marketplace checkout ──────────────────────────────────────────────────────

@router.post("/marketplace/checkout/", response_model=RazorpayOrderResponse)
async def marketplace_checkout(
    body: MarketplaceOrderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cart = await _get_or_create_cart(user, db)
    if not cart.items:
        raise HTTPException(400, "Cart is empty")

    # Calculate total
    subtotal = sum(
        (item.variant.price if item.variant and item.variant.price else item.product.price)
        * item.quantity
        for item in cart.items
    )
    total_paise = int(subtotal * 100)

    import secrets as sec
    order_number = f"MKT{sec.token_hex(5).upper()}"

    rz = get_razorpay()
    rz_order = rz.order.create({
        "amount": total_paise,
        "currency": "INR",
        "receipt": order_number,
    })

    marketplace_order = MarketplaceOrder(
        **body.model_dump(),
        user_id=user.id,
        subtotal=subtotal,
        total_amount=subtotal,
        order_number=order_number,
        razorpay_order_id=rz_order["id"],
    )
    db.add(marketplace_order)
    await db.flush()

    for cart_item in cart.items:
        unit_price = (
            cart_item.variant.price
            if cart_item.variant and cart_item.variant.price
            else cart_item.product.price
        )
        line = MarketplaceOrderItem(
            order_id=marketplace_order.id,
            product_id=cart_item.product_id,
            variant_id=cart_item.variant_id,
            seller_id=cart_item.product.seller_id,
            product_name=cart_item.product.name,
            variant_name=cart_item.variant.name if cart_item.variant else "",
            unit_price=unit_price,
            quantity=cart_item.quantity,
            line_total=unit_price * cart_item.quantity,
        )
        db.add(line)

    await db.commit()
    return {
        "razorpay_order_id": rz_order["id"],
        "amount_paise": total_paise,
        "currency": "INR",
        "key": settings.RAZORPAY_KEY_ID,
    }


@router.post("/marketplace/verify/")
async def verify_marketplace_payment(
    body: VerifyPaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    if expected != body.razorpay_signature:
        raise HTTPException(400, "Invalid payment signature")

    result = await db.execute(
        select(MarketplaceOrder).where(
            MarketplaceOrder.razorpay_order_id == body.razorpay_order_id
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")

    order.status = "PAID"
    order.razorpay_payment_id = body.razorpay_payment_id
    order.razorpay_signature = body.razorpay_signature

    # Clear cart
    cart = await _get_or_create_cart(user, db)
    for item in cart.items:
        await db.delete(item)

    await db.commit()
    return {"detail": "Payment verified", "order_number": order.order_number}


@router.get("/marketplace/orders/", response_model=List[MarketplaceOrderRead])
async def list_marketplace_orders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MarketplaceOrder)
        .where(MarketplaceOrder.user_id == user.id)
        .options(selectinload(MarketplaceOrder.items))
        .order_by(MarketplaceOrder.created_at.desc())
    )
    return result.scalars().all()


# ── Scheduled deliveries ──────────────────────────────────────────────────────

@router.post("/scheduled/", response_model=ScheduledDeliveryRead, status_code=201)
async def create_scheduled_delivery(
    body: ScheduledDeliveryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    delivery = ScheduledDelivery(**body.model_dump(), user_id=user.id)
    db.add(delivery)
    await db.commit()
    await db.refresh(delivery)
    return delivery


@router.get("/scheduled/", response_model=List[ScheduledDeliveryRead])
async def list_scheduled_deliveries(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScheduledDelivery)
        .where(ScheduledDelivery.user_id == user.id)
        .order_by(ScheduledDelivery.scheduled_date)
    )
    return result.scalars().all()


# ── Gift Seller profile ───────────────────────────────────────────────────────

@router.get("/seller/", response_model=GiftSellerRead)
async def get_seller_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GiftSeller).where(GiftSeller.user_id == user.id)
    )
    seller = result.scalar_one_or_none()
    if not seller:
        raise HTTPException(404, "Seller profile not found")
    return seller


@router.post("/seller/", response_model=GiftSellerRead, status_code=201)
async def create_seller_profile(
    body: GiftSellerCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(
        select(GiftSeller).where(GiftSeller.user_id == user.id)
    )
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Seller profile already exists")
    seller = GiftSeller(**body.model_dump(), user_id=user.id)
    db.add(seller)
    await db.commit()
    await db.refresh(seller)
    return seller
