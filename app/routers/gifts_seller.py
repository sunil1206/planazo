"""
Seller Dashboard router — product management, order view, stock control.

Endpoints:
  GET    /api/gifts/seller/dashboard/          — summary stats
  GET    /api/gifts/seller/products/           — my products
  POST   /api/gifts/seller/products/           — create product
  PATCH  /api/gifts/seller/products/{id}/      — update product
  DELETE /api/gifts/seller/products/{id}/      — soft-delete product
  PATCH  /api/gifts/seller/products/{id}/stock/ — update stock only
  GET    /api/gifts/seller/orders/             — my incoming orders
  PATCH  /api/gifts/seller/orders/{id}/status/ — update order status
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.gift import GiftSeller, GiftProduct, GiftOrder, MarketplaceOrder, MarketplaceOrderItem
from app.schemas.gift import (
    GiftProductCreate, GiftProductRead,
    GiftOrderRead, MarketplaceOrderRead,
)

router = APIRouter(prefix="/api/gifts/seller", tags=["gifts-seller"])


async def _require_seller(user: User, db: AsyncSession) -> GiftSeller:
    result = await db.execute(
        select(GiftSeller).where(GiftSeller.user_id == user.id)
    )
    seller = result.scalar_one_or_none()
    if not seller:
        raise HTTPException(403, "Seller profile required. Create one at POST /api/gifts/seller/")
    if seller.status != "APPROVED":
        raise HTTPException(403, f"Seller account is '{seller.status}'. Wait for admin approval.")
    return seller


# ── Dashboard stats ───────────────────────────────────────────────────────────

@router.get("/dashboard/")
async def seller_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    seller = await _require_seller(user, db)

    # Product counts
    total_products = (await db.execute(
        select(func.count()).where(GiftProduct.seller_id == seller.id, GiftProduct.is_available == True)
    )).scalar() or 0

    out_of_stock = (await db.execute(
        select(func.count()).where(GiftProduct.seller_id == seller.id, GiftProduct.stock == 0)
    )).scalar() or 0

    # Order counts for seller's products
    product_ids_result = await db.execute(
        select(GiftProduct.id).where(GiftProduct.seller_id == seller.id)
    )
    product_ids = [r[0] for r in product_ids_result.all()]

    pending_orders = 0
    total_revenue = 0
    if product_ids:
        pending_orders = (await db.execute(
            select(func.count(GiftOrder.id)).where(
                GiftOrder.product_id.in_(product_ids),
                GiftOrder.status == "PENDING",
            )
        )).scalar() or 0

        total_revenue = (await db.execute(
            select(func.coalesce(func.sum(GiftOrder.amount), 0)).where(
                GiftOrder.product_id.in_(product_ids),
                GiftOrder.status == "COMPLETED",
            )
        )).scalar() or 0

    return {
        "seller_id": seller.id,
        "business_name": seller.business_name,
        "status": seller.status,
        "total_products": total_products,
        "out_of_stock_products": out_of_stock,
        "pending_orders": pending_orders,
        "total_revenue_inr": float(total_revenue),
        "commission_pct": float(seller.commission_pct),
    }


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/products/", response_model=List[GiftProductRead])
async def list_my_products(
    is_available: Optional[bool] = Query(None),
    low_stock: Optional[bool] = Query(None, description="Only products with stock < 5"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    seller = await _require_seller(user, db)
    q = (
        select(GiftProduct)
        .where(GiftProduct.seller_id == seller.id)
        .options(selectinload(GiftProduct.images), selectinload(GiftProduct.variants))
    )
    if is_available is not None:
        q = q.where(GiftProduct.is_available == is_available)
    if low_stock:
        q = q.where(GiftProduct.stock < 5)
    q = q.order_by(GiftProduct.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/products/", response_model=GiftProductRead, status_code=201)
async def create_product(
    body: GiftProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    seller = await _require_seller(user, db)
    product = GiftProduct(**body.model_dump(), seller_id=seller.id)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.patch("/products/{product_id}/", response_model=GiftProductRead)
async def update_product(
    product_id: int,
    body: GiftProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    seller = await _require_seller(user, db)
    result = await db.execute(
        select(GiftProduct).where(GiftProduct.id == product_id, GiftProduct.seller_id == seller.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(product, k, v)
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}/", status_code=204)
async def delete_product(
    product_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    seller = await _require_seller(user, db)
    result = await db.execute(
        select(GiftProduct).where(GiftProduct.id == product_id, GiftProduct.seller_id == seller.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_available = False  # soft delete — keep order history intact
    await db.commit()


@router.patch("/products/{product_id}/stock/")
async def update_stock(
    product_id: int,
    stock: int = Query(..., ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    seller = await _require_seller(user, db)
    result = await db.execute(
        select(GiftProduct).where(GiftProduct.id == product_id, GiftProduct.seller_id == seller.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    product.stock = stock
    await db.commit()
    return {"product_id": product_id, "stock": stock}


# ── Orders ────────────────────────────────────────────────────────────────────

@router.get("/orders/", response_model=List[GiftOrderRead])
async def list_my_orders(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    seller = await _require_seller(user, db)
    product_ids_result = await db.execute(
        select(GiftProduct.id).where(GiftProduct.seller_id == seller.id)
    )
    product_ids = [r[0] for r in product_ids_result.all()]
    if not product_ids:
        return []

    q = select(GiftOrder).where(GiftOrder.product_id.in_(product_ids))
    if status:
        q = q.where(GiftOrder.status == status.upper())
    q = q.order_by(GiftOrder.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/orders/{order_id}/status/")
async def update_order_status(
    order_id: int,
    status: str = Query(..., description="PENDING | PROCESSING | SHIPPED | COMPLETED | CANCELLED"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    valid = {"PENDING", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"}
    if status.upper() not in valid:
        raise HTTPException(400, f"Invalid status. Choose from: {sorted(valid)}")

    seller = await _require_seller(user, db)
    product_ids_result = await db.execute(
        select(GiftProduct.id).where(GiftProduct.seller_id == seller.id)
    )
    product_ids = [r[0] for r in product_ids_result.all()]

    result = await db.execute(
        select(GiftOrder).where(GiftOrder.id == order_id, GiftOrder.product_id.in_(product_ids))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")

    order.status = status.upper()
    await db.commit()
    return {"order_id": order_id, "status": order.status}
