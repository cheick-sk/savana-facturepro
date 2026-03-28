"""
Celery Tasks for AI Predictions and Insights

Background tasks for:
- Updating stock predictions
- Sending low stock alerts
- Generating daily insights
- Anomaly detection
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, date
from typing import Optional

from celery import shared_task
from sqlalchemy import select, func, and_

from app.core.database import SessionLocal
from app.core.config import settings
from app.models.all_models import (
    Product, Sale, SaleItem, Store, User, POSCustomer,
    StockMovement, Category
)

logger = logging.getLogger(__name__)


@shared_task(name="update_stock_predictions")
def update_stock_predictions():
    """
    Update predictions for all products.

    Runs daily to refresh:
    - Demand forecasts
    - Reorder points
    - Stock recommendations
    """
    logger.info("Starting stock predictions update...")

    with SessionLocal() as db:
        try:
            # Get all active products
            products = db.execute(
                select(Product).where(Product.is_active == True)
            ).scalars().all()

            updated_count = 0

            for product in products:
                try:
                    # Calculate prediction metrics
                    prediction = _calculate_product_prediction(db, product)

                    # Update product fields if needed
                    # Note: Could store predictions in a separate table for history
                    updated_count += 1

                except Exception as e:
                    logger.error(f"Failed to update prediction for product {product.id}: {e}")

            logger.info(f"Updated predictions for {updated_count} products")
            return {"success": True, "updated_count": updated_count}

        except Exception as e:
            logger.error(f"Stock predictions update failed: {e}")
            return {"success": False, "error": str(e)}


@shared_task(name="send_low_stock_alerts")
def send_low_stock_alerts():
    """
    Send alerts for critical stock levels.

    Checks all products and sends notifications for:
    - Products below safety stock
    - Products at reorder point
    """
    logger.info("Checking low stock alerts...")

    with SessionLocal() as db:
        try:
            # Get products below reorder point
            products = db.execute(
                select(Product).where(
                    and_(
                        Product.is_active == True,
                        Product.stock_quantity <= Product.low_stock_threshold * 1.5,
                    )
                )
            ).scalars().all()

            critical_products = []
            high_priority = []

            for product in products:
                stock_ratio = float(product.stock_quantity) / float(product.low_stock_threshold)

                if stock_ratio <= 0.5:
                    critical_products.append({
                        "id": product.id,
                        "name": product.name,
                        "stock": float(product.stock_quantity),
                        "threshold": float(product.low_stock_threshold),
                    })
                elif stock_ratio <= 1.0:
                    high_priority.append({
                        "id": product.id,
                        "name": product.name,
                        "stock": float(product.stock_quantity),
                        "threshold": float(product.low_stock_threshold),
                    })

            # Send notifications
            # This would integrate with notification service
            # notification_service.send_stock_alert(critical_products, high_priority)

            logger.info(f"Found {len(critical_products)} critical, {len(high_priority)} high priority")

            return {
                "success": True,
                "critical_count": len(critical_products),
                "high_priority_count": len(high_priority),
                "critical_products": critical_products[:10],  # Limit for task result
            }

        except Exception as e:
            logger.error(f"Low stock alerts failed: {e}")
            return {"success": False, "error": str(e)}


@shared_task(name="generate_daily_insights")
def generate_daily_insights():
    """
    Generate daily business insights.

    Creates summary of:
    - Sales performance
    - Stock status
    - Customer activity
    """
    logger.info("Generating daily insights...")

    with SessionLocal() as db:
        try:
            today = date.today()
            yesterday = today - timedelta(days=1)

            # Sales summary
            sales_stats = db.execute(
                select(
                    func.count(Sale.id).label("count"),
                    func.sum(Sale.total_amount).label("revenue"),
                ).where(
                    func.date(Sale.created_at) == yesterday,
                    Sale.status == "COMPLETED",
                )
            ).first()

            # Top products
            top_products = db.execute(
                select(
                    Product.name,
                    func.sum(SaleItem.quantity).label("qty"),
                    func.sum(SaleItem.line_total).label("revenue"),
                ).join(SaleItem, Product.id == SaleItem.product_id
                ).join(Sale, SaleItem.sale_id == Sale.id
                ).where(
                    func.date(Sale.created_at) == yesterday,
                    Sale.status == "COMPLETED",
                ).group_by(Product.id, Product.name
                ).order_by(func.sum(SaleItem.line_total).desc()
                ).limit(5)
            ).all()

            # Low stock count
            low_stock_count = db.execute(
                select(func.count(Product.id)).where(
                    Product.stock_quantity <= Product.low_stock_threshold,
                    Product.is_active == True,
                )
            ).scalar()

            insights = {
                "date": yesterday.isoformat(),
                "sales": {
                    "count": sales_stats.count or 0,
                    "revenue": float(sales_stats.revenue or 0),
                },
                "top_products": [
                    {
                        "name": row.name,
                        "quantity": float(row.qty),
                        "revenue": float(row.revenue),
                    }
                    for row in top_products
                ],
                "low_stock_count": low_stock_count,
            }

            # Store insights (could save to database for history)
            logger.info(f"Daily insights generated: {sales_stats.count or 0} sales, {sales_stats.revenue or 0} revenue")

            return {"success": True, "insights": insights}

        except Exception as e:
            logger.error(f"Daily insights generation failed: {e}")
            return {"success": False, "error": str(e)}


@shared_task(name="detect_sales_anomalies")
def detect_sales_anomalies():
    """
    Detect anomalies in sales patterns.

    Uses statistical methods to identify:
    - Unusual sales spikes
    - Unexpected drops
    - Abnormal patterns
    """
    logger.info("Detecting sales anomalies...")

    with SessionLocal() as db:
        try:
            # Get last 30 days of sales per product
            end_date = date.today()
            start_date = end_date - timedelta(days=30)

            # Aggregate daily sales per product
            sales_data = db.execute(
                select(
                    SaleItem.product_id,
                    func.date(Sale.created_at).label("sale_date"),
                    func.sum(SaleItem.quantity).label("daily_qty"),
                ).join(Sale, SaleItem.sale_id == Sale.id
                ).where(
                    Sale.created_at >= start_date,
                    Sale.status == "COMPLETED",
                ).group_by(
                    SaleItem.product_id,
                    func.date(Sale.created_at)
                )
            ).all()

            # Group by product
            product_sales = {}
            for row in sales_data:
                if row.product_id not in product_sales:
                    product_sales[row.product_id] = []
                product_sales[row.product_id].append(float(row.daily_qty))

            anomalies = []

            for product_id, quantities in product_sales.items():
                if len(quantities) < 14:
                    continue

                mean = sum(quantities) / len(quantities)
                if mean == 0:
                    continue

                variance = sum((q - mean) ** 2 for q in quantities) / (len(quantities) - 1)
                std = variance ** 0.5

                # Check last day
                last_qty = quantities[-1]
                if std > 0:
                    z_score = (last_qty - mean) / std

                    if abs(z_score) > 2.0:  # Anomaly threshold
                        product = db.execute(
                            select(Product).where(Product.id == product_id)
                        ).scalar_one_or_none()

                        if product:
                            anomalies.append({
                                "product_id": product_id,
                                "product_name": product.name,
                                "type": "spike" if z_score > 0 else "drop",
                                "z_score": round(z_score, 2),
                                "expected": round(mean, 2),
                                "actual": last_qty,
                            })

            logger.info(f"Detected {len(anomalies)} sales anomalies")

            return {
                "success": True,
                "anomaly_count": len(anomalies),
                "anomalies": anomalies[:20],  # Limit for task result
            }

        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}")
            return {"success": False, "error": str(e)}


@shared_task(name="generate_purchase_recommendations")
def generate_purchase_recommendations():
    """
    Generate AI-powered purchase recommendations.

    Analyzes:
    - Stock levels
    - Sales velocity
    - Lead times
    - Trends

    Returns suggested purchase orders.
    """
    logger.info("Generating purchase recommendations...")

    with SessionLocal() as db:
        try:
            # Get all active products with stock info
            products = db.execute(
                select(Product).where(Product.is_active == True)
            ).scalars().all()

            recommendations = []

            for product in products:
                prediction = _calculate_product_prediction(db, product)

                if prediction["suggested_order"] > 0:
                    recommendations.append({
                        "product_id": product.id,
                        "product_name": product.name,
                        "sku": product.sku,
                        "current_stock": float(product.stock_quantity),
                        "suggested_quantity": prediction["suggested_order"],
                        "urgency": prediction["urgency"],
                        "predicted_demand": prediction["predicted_demand"],
                    })

            # Sort by urgency
            urgency_order = {"critical": 0, "high": 1, "medium": 2}
            recommendations.sort(key=lambda x: urgency_order.get(x["urgency"], 3))

            logger.info(f"Generated {len(recommendations)} purchase recommendations")

            return {
                "success": True,
                "recommendation_count": len(recommendations),
                "recommendations": recommendations[:50],  # Limit
            }

        except Exception as e:
            logger.error(f"Purchase recommendations failed: {e}")
            return {"success": False, "error": str(e)}


# ── Helper Functions ─────────────────────────────────────────────

def _calculate_product_prediction(db, product: Product) -> dict:
    """Calculate prediction metrics for a single product."""
    import math

    # Get sales history (last 90 days)
    end_date = date.today()
    start_date = end_date - timedelta(days=90)

    sales = db.execute(
        select(
            func.date(Sale.created_at).label("sale_date"),
            func.sum(SaleItem.quantity).label("qty"),
        ).join(Sale, SaleItem.sale_id == Sale.id
        ).where(
            SaleItem.product_id == product.id,
            Sale.created_at >= start_date,
            Sale.status == "COMPLETED",
        ).group_by(func.date(Sale.created_at))
    ).all()

    if not sales:
        return {
            "predicted_demand": 0,
            "suggested_order": 0,
            "urgency": "low",
            "confidence": 0,
        }

    quantities = [float(s.qty) for s in sales]
    n = len(quantities)

    daily_avg = sum(quantities) / n if n > 0 else 0

    # Standard deviation
    if n > 1:
        variance = sum((q - daily_avg) ** 2 for q in quantities) / (n - 1)
        daily_std = math.sqrt(variance)
    else:
        daily_std = daily_avg * 0.5

    # Trend detection
    if n >= 14:
        x = list(range(n))
        sum_x = sum(x)
        sum_y = sum(quantities)
        sum_xy = sum(xi * yi for xi, yi in zip(x, quantities))
        sum_x2 = sum(xi ** 2 for xi in x)

        denom = n * sum_x2 - sum_x ** 2
        if denom != 0:
            slope = (n * sum_xy - sum_x * sum_y) / denom
            avg = sum_y / n
            trend_pct = (slope * n / avg) * 100 if avg > 0 else 0
        else:
            trend_pct = 0
    else:
        trend_pct = 0

    # Predict demand
    days_ahead = 30
    trend_factor = 1 + (trend_pct / 100) * 0.3
    predicted_demand = daily_avg * days_ahead * max(0.5, min(2.0, trend_factor))

    # Safety stock
    lead_time = 7
    z_score = 1.65  # 95% service level
    safety_stock = z_score * daily_std * math.sqrt(lead_time)

    # Reorder point
    reorder_point = (daily_avg * lead_time) + safety_stock

    # Current stock
    current_stock = float(product.stock_quantity)

    # Generate recommendation
    if current_stock <= safety_stock * 0.5:
        urgency = "critical"
        suggested_order = predicted_demand - current_stock + safety_stock * 2
    elif current_stock <= safety_stock:
        urgency = "critical"
        suggested_order = predicted_demand - current_stock + safety_stock
    elif current_stock <= reorder_point:
        urgency = "high"
        suggested_order = predicted_demand - current_stock + safety_stock
    elif current_stock <= predicted_demand * 1.2:
        urgency = "medium"
        suggested_order = safety_stock
    else:
        urgency = "low"
        suggested_order = 0

    # Confidence
    if n < 14:
        confidence = 0.4
    elif n < 30:
        confidence = 0.6
    elif n < 60:
        confidence = 0.75
    else:
        confidence = 0.85

    return {
        "predicted_demand": round(predicted_demand, 2),
        "suggested_order": round(max(0, suggested_order), 0),
        "urgency": urgency,
        "confidence": confidence,
    }
