"""POS sale processing service — SavanaFlow Production Edition."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.all_models import (
    LoyaltyTransaction, POSCustomer, Product, ProductVariant,
    Promotion, Sale, SaleItem, StockMovement,
)
from app.schemas.schemas import SaleCreate

logger = logging.getLogger(__name__)

# Points earned per 1000 XOF spent
LOYALTY_POINTS_RATE = 10
LOYALTY_POINT_VALUE = 5  # 1 point = 5 XOF
LOYALTY_TIERS = [
    ("STANDARD",  0,      0),
    ("SILVER",   50_000,  5),   # 5% bonus
    ("GOLD",    150_000, 10),   # 10% bonus
    ("PLATINUM", 500_000, 15),  # 15% bonus
]


def _gen_sale_number(count: int) -> str:
    return f"SV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:05d}"


def _get_loyalty_tier(total_spent: float) -> str:
    tier = "STANDARD"
    for name, threshold, _ in LOYALTY_TIERS:
        if total_spent >= threshold:
            tier = name
    return tier


async def _apply_promotion(
    db: AsyncSession, promo_code: str | None, subtotal: float, items_data: list
) -> tuple[float, int | None]:
    """Returns (discount_amount, promotion_id)."""
    if not promo_code:
        return 0.0, None

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Promotion).where(
            Promotion.code == promo_code,
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now,
        )
    )
    promo = result.scalar_one_or_none()
    if not promo:
        raise ValueError(f"Promotion code '{promo_code}' is invalid or expired")

    if promo.usage_limit and promo.usage_count >= promo.usage_limit:
        raise ValueError(f"Promotion code '{promo_code}' has reached its usage limit")

    if subtotal < float(promo.min_purchase):
        raise ValueError(
            f"Minimum purchase of {promo.min_purchase} required for this promotion (current: {subtotal:.0f})"
        )

    discount = 0.0
    if promo.promo_type == "PERCENT":
        discount = round(subtotal * float(promo.value) / 100, 2)
    elif promo.promo_type == "FIXED":
        discount = min(float(promo.value), subtotal)
    elif promo.promo_type == "BOGO":
        # Buy one get one free: cheapest item of eligible products free
        prices = sorted([it["unit_price"] for it in items_data])
        if prices:
            discount = prices[0]
    # BUNDLE type handled externally

    if promo.max_discount:
        discount = min(discount, float(promo.max_discount))

    discount = round(discount, 2)
    promo.usage_count = (promo.usage_count or 0) + 1
    return discount, promo.id


async def _handle_loyalty(
    db: AsyncSession, customer: POSCustomer, sale_amount: float,
    points_to_use: int, sale_id: int
) -> tuple[int, int, float]:
    """Returns (points_earned, points_used, loyalty_discount)."""
    # Calculate points earned
    tier_bonus = 0
    for _, threshold, bonus in LOYALTY_TIERS:
        if float(customer.total_spent) >= threshold:
            tier_bonus = bonus
    base_points = int(sale_amount / 1000 * LOYALTY_POINTS_RATE)
    bonus_points = int(base_points * tier_bonus / 100)
    points_earned = base_points + bonus_points

    # Redemption
    loyalty_discount = 0.0
    points_used = 0
    if points_to_use > 0:
        available = customer.loyalty_points
        points_used = min(points_to_use, available)
        loyalty_discount = round(points_used * LOYALTY_POINT_VALUE, 2)
        loyalty_discount = min(loyalty_discount, sale_amount * 0.5)  # max 50% discount via loyalty

        customer.loyalty_points -= points_used
        db.add(LoyaltyTransaction(
            customer_id=customer.id,
            sale_id=sale_id,
            points=-points_used,
            balance_after=customer.loyalty_points,
            type="REDEEM",
            description=f"Redemption on sale {sale_id}",
        ))

    # Award earned points
    customer.loyalty_points += points_earned
    db.add(LoyaltyTransaction(
        customer_id=customer.id,
        sale_id=sale_id,
        points=points_earned,
        balance_after=customer.loyalty_points,
        type="EARN",
        description=f"Points earned on sale {sale_id}",
    ))

    return points_earned, points_used, loyalty_discount


async def process_sale(db: AsyncSession, data: SaleCreate, user_id: int) -> Sale:
    """Full POS sale: stock validation, variants, promotions, loyalty."""
    count = (await db.execute(select(func.count()).select_from(Sale))).scalar() or 0

    subtotal = 0.0
    tax_total = 0.0
    sale_items_data: list[dict] = []

    for item_data in data.items:
        product = (await db.execute(
            select(Product).where(Product.id == item_data.product_id, Product.is_active == True)
        )).scalar_one_or_none()
        if not product:
            raise ValueError(f"Product {item_data.product_id} not found")

        # Variant handling
        variant = None
        if item_data.variant_id:
            variant = (await db.execute(
                select(ProductVariant).where(
                    ProductVariant.id == item_data.variant_id,
                    ProductVariant.product_id == product.id,
                    ProductVariant.is_active == True,
                )
            )).scalar_one_or_none()
            if not variant:
                raise ValueError(f"Variant {item_data.variant_id} not found for product {product.name}")

        # Stock check
        stock_source = variant if variant else product
        available_stock = float(stock_source.stock_quantity)
        if available_stock < item_data.quantity:
            raise ValueError(
                f"Insufficient stock for '{product.name}'"
                + (f" [{variant.name}]" if variant else "")
                + f": available={available_stock}, requested={item_data.quantity}"
            )

        # Price resolution: explicit → variant → product
        unit_price = (
            item_data.unit_price
            or (float(variant.sell_price) if variant and variant.sell_price else None)
            or float(product.sell_price)
        )
        discount_factor = 1 - item_data.discount_percent / 100
        item_sub = round(item_data.quantity * unit_price * discount_factor, 2)
        item_tax = round(item_sub * float(product.tax_rate) / 100, 2)
        line_total = round(item_sub + item_tax, 2)

        subtotal += item_sub
        tax_total += item_tax

        sale_items_data.append({
            "_product": product,
            "_variant": variant,
            "product_id": item_data.product_id,
            "variant_id": item_data.variant_id,
            "quantity": item_data.quantity,
            "unit_price": unit_price,
            "tax_rate": float(product.tax_rate),
            "discount_percent": item_data.discount_percent,
            "line_total": line_total,
            "cost_price": float(variant.cost_price if variant and variant.cost_price else product.cost_price),
        })

    subtotal = round(subtotal, 2)
    tax_total = round(tax_total, 2)

    # Promotion
    promo_discount, promo_id = await _apply_promotion(
        db, data.promotion_code, subtotal, sale_items_data
    )

    # POS Customer
    customer = None
    if data.customer_id:
        customer = (await db.execute(
            select(POSCustomer).where(POSCustomer.id == data.customer_id)
        )).scalar_one_or_none()

    # Create sale (first flush to get ID)
    gross_total = round(subtotal + tax_total - promo_discount, 2)

    sale = Sale(
        sale_number=_gen_sale_number(count),
        store_id=data.store_id,
        user_id=user_id,
        shift_id=data.shift_id,
        customer_id=data.customer_id,
        promotion_id=promo_id,
        subtotal=subtotal,
        tax_amount=tax_total,
        discount_amount=promo_discount,
        loyalty_discount=0.0,
        total_amount=gross_total,
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        currency=data.currency,
        notes=data.notes,
        status="COMPLETED",
    )
    db.add(sale)
    await db.flush()

    # Loyalty
    points_earned = points_used = 0
    loyalty_discount = 0.0
    if customer and data.loyalty_points_to_use >= 0:
        points_earned, points_used, loyalty_discount = await _handle_loyalty(
            db, customer, gross_total, data.loyalty_points_to_use, sale.id
        )
        sale.loyalty_discount = loyalty_discount
        sale.loyalty_points_earned = points_earned
        sale.loyalty_points_used = points_used
        sale.total_amount = round(gross_total - loyalty_discount, 2)

        # Update customer stats
        customer.total_spent = round(float(customer.total_spent) + sale.total_amount, 2)
        customer.visit_count = (customer.visit_count or 0) + 1
        customer.last_visit = datetime.now(timezone.utc)
        customer.loyalty_tier = _get_loyalty_tier(float(customer.total_spent))

    # Create sale items + update stock
    for item_dict in sale_items_data:
        product = item_dict.pop("_product")
        variant = item_dict.pop("_variant")

        db.add(SaleItem(sale_id=sale.id, **item_dict))

        # Stock update
        if variant:
            qty_before = float(variant.stock_quantity)
            qty_after = round(qty_before - item_dict["quantity"], 4)
            variant.stock_quantity = qty_after
        qty_before_prod = float(product.stock_quantity)
        qty_after_prod = round(qty_before_prod - item_dict["quantity"], 4)
        product.stock_quantity = qty_after_prod

        db.add(StockMovement(
            product_id=product.id,
            variant_id=item_dict.get("variant_id"),
            user_id=user_id,
            movement_type="OUT",
            quantity=item_dict["quantity"],
            reference=sale.sale_number,
            reason="POS Sale",
            quantity_before=qty_before_prod,
            quantity_after=qty_after_prod,
        ))

    # Update shift totals
    if data.shift_id:
        from app.models.all_models import Shift
        shift = (await db.execute(select(Shift).where(Shift.id == data.shift_id))).scalar_one_or_none()
        if shift and shift.status == "OPEN":
            shift.total_sales = round(float(shift.total_sales) + float(sale.total_amount), 2)
            shift.sales_count = (shift.sales_count or 0) + 1

    await db.flush()
    await db.refresh(sale)
    logger.info(f"Sale {sale.sale_number} — {sale.total_amount} {sale.currency} via {sale.payment_method}")
    return sale
