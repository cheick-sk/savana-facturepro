"""
Stock Prediction and Insights API Endpoints for SavanaFlow

Provides endpoints for:
- Stock predictions and reorder recommendations
- Low stock alerts
- Purchase suggestions
- Business insights
"""
from __future__ import annotations

from typing import Optional, List
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from enum import Enum
import logging
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.all_models import (
    User, Product, Sale, SaleItem, Store, POSCustomer,
    StockMovement, Category
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["AI Predictions"])
insights_router = APIRouter(prefix="/insights", tags=["AI Insights"])


# ── Enums ────────────────────────────────────────────────────────

class UrgencyLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TrendDirection(str, Enum):
    INCREASING = "increasing"
    DECREASING = "decreasing"
    STABLE = "stable"


# ── Schemas ──────────────────────────────────────────────────────

class PredictionItem(BaseModel):
    """Stock prediction for a single product."""
    product_id: int
    product_name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_name: Optional[str] = None
    current_stock: float
    predicted_demand: float
    days_of_stock: float
    reorder_point: float
    safety_stock: float
    suggested_order_quantity: float
    confidence: float
    urgency: UrgencyLevel
    recommendation: str
    trend: TrendDirection
    trend_percentage: float
    avg_daily_sales: float
    sales_velocity: float


class PredictionSummary(BaseModel):
    """Summary of prediction results."""
    total_products: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_to_order: float


class PredictionResponse(BaseModel):
    """Full prediction response with summary and items."""
    summary: PredictionSummary
    predictions: List[PredictionItem]
    generated_at: datetime


class SalesInsight(BaseModel):
    """Sales insight item."""
    type: str
    title: str
    description: str
    priority: str
    value: Optional[float] = None
    change_percent: Optional[float] = None
    recommendation: Optional[str] = None


class TopProduct(BaseModel):
    """Top selling product info."""
    product_id: int
    product_name: str
    quantity_sold: float
    revenue: float
    percentage_of_total: float


class DashboardInsights(BaseModel):
    """Combined dashboard insights."""
    total_revenue: float
    revenue_change: float
    total_sales: int
    sales_change: float
    average_order_value: float
    top_products: List[TopProduct]
    low_stock_count: int
    insights: List[SalesInsight]


# ── Service Implementation ───────────────────────────────────────

class SavanaFlowPredictionService:
    """Implementation of stock predictions for SavanaFlow."""

    def __init__(self, db: AsyncSession, store_id: Optional[int] = None):
        self.db = db
        self.store_id = store_id
        self.min_data_points = settings.PREDICTION_MIN_DATA_POINTS
        self.default_lead_time = settings.PREDICTION_DEFAULT_LEAD_TIME
        self.service_level = settings.PREDICTION_SERVICE_LEVEL

    async def get_product_prediction(
        self,
        product_id: int,
        days_ahead: int = 30,
    ) -> PredictionItem:
        """Get prediction for a single product."""
        # Get product data
        result = await self.db.execute(
            select(Product, Category.name).outerjoin(
                Category, Product.category_id == Category.id
            ).where(Product.id == product_id)
        )
        row = result.first()
        if not row:
            raise ValueError(f"Product {product_id} not found")

        product, category_name = row

        # Get sales history
        sales_history = await self._get_sales_history(product_id, days=90)

        # Get current stock
        current_stock = float(product.stock_quantity)

        # Calculate prediction
        prediction = self._calculate_prediction(
            product=product,
            category_name=category_name,
            sales_history=sales_history,
            current_stock=current_stock,
            days_ahead=days_ahead,
        )

        return prediction

    async def get_all_predictions(
        self,
        days_ahead: int = 30,
        urgency_filter: Optional[UrgencyLevel] = None,
    ) -> List[PredictionItem]:
        """Get predictions for all products in store."""
        # Build query
        query = select(Product, Category.name).outerjoin(
            Category, Product.category_id == Category.id
        ).where(Product.is_active == True)

        if self.store_id:
            query = query.where(Product.store_id == self.store_id)

        result = await self.db.execute(query)
        products = result.all()

        predictions = []
        for product, category_name in products:
            try:
                sales_history = await self._get_sales_history(product.id, days=90)
                prediction = self._calculate_prediction(
                    product=product,
                    category_name=category_name,
                    sales_history=sales_history,
                    current_stock=float(product.stock_quantity),
                    days_ahead=days_ahead,
                )
                predictions.append(prediction)
            except Exception as e:
                logger.error(f"Prediction failed for product {product.id}: {e}")

        # Filter by urgency if specified
        if urgency_filter:
            predictions = [p for p in predictions if p.urgency == urgency_filter]

        # Sort by urgency
        urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        predictions.sort(key=lambda x: urgency_order.get(x.urgency.value, 4))

        return predictions

    async def get_low_stock_alerts(self) -> List[PredictionItem]:
        """Get products that need immediate attention."""
        predictions = await self.get_all_predictions()
        return [p for p in predictions if p.urgency in [UrgencyLevel.CRITICAL, UrgencyLevel.HIGH]]

    async def _get_sales_history(
        self,
        product_id: int,
        days: int = 90,
    ) -> List[dict]:
        """Get daily sales history for a product."""
        start_date = date.today() - timedelta(days=days)

        # Query daily sales
        query = select(
            func.date(Sale.created_at).label("sale_date"),
            func.sum(SaleItem.quantity).label("quantity"),
            func.sum(SaleItem.line_total).label("revenue"),
        ).join(
            SaleItem, Sale.id == SaleItem.sale_id
        ).where(
            and_(
                SaleItem.product_id == product_id,
                Sale.created_at >= start_date,
                Sale.status == "COMPLETED",
            )
        ).group_by(
            func.date(Sale.created_at)
        ).order_by(
            func.date(Sale.created_at)
        )

        result = await self.db.execute(query)
        return [
            {"date": row.sale_date, "quantity": float(row.quantity), "revenue": float(row.revenue)}
            for row in result.all()
        ]

    def _calculate_prediction(
        self,
        product: Product,
        category_name: Optional[str],
        sales_history: List[dict],
        current_stock: float,
        days_ahead: int,
    ) -> PredictionItem:
        """Calculate stock prediction using statistical methods."""
        import math

        # Extract quantities
        quantities = [h["quantity"] for h in sales_history] if sales_history else []

        # Calculate basic statistics
        if len(quantities) >= self.min_data_points:
            daily_avg = sum(quantities) / len(quantities)
            variance = sum((q - daily_avg) ** 2 for q in quantities) / (len(quantities) - 1)
            daily_std = math.sqrt(variance) if variance > 0 else 0
        else:
            # Not enough data, use simple estimate
            daily_avg = sum(quantities) / len(quantities) if quantities else 0.1
            daily_std = daily_avg * 0.5  # Assume 50% variability

        # Detect trend
        trend, trend_pct = self._detect_trend(quantities)

        # Predict demand
        trend_factor = 1 + (trend_pct / 100) * 0.3
        predicted_demand = daily_avg * days_ahead * max(0.5, min(2.0, trend_factor))

        # Calculate safety stock (95% service level)
        z_score = 1.65  # 95% service level
        safety_stock = z_score * daily_std * math.sqrt(self.default_lead_time)

        # Calculate reorder point
        reorder_point = (daily_avg * self.default_lead_time) + safety_stock

        # Generate recommendation
        recommendation, urgency = self._generate_recommendation(
            current_stock=current_stock,
            predicted_demand=predicted_demand,
            safety_stock=safety_stock,
            reorder_point=reorder_point,
            days_ahead=days_ahead,
        )

        # Calculate days of stock
        daily_rate = predicted_demand / days_ahead if days_ahead > 0 else 0.1
        days_of_stock = min(current_stock / daily_rate, 999) if daily_rate > 0 else 999

        # Calculate confidence
        confidence = self._calculate_confidence(len(quantities), daily_std, daily_avg)

        return PredictionItem(
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            category_name=category_name,
            current_stock=round(current_stock, 2),
            predicted_demand=round(predicted_demand, 2),
            days_of_stock=round(days_of_stock, 1),
            reorder_point=round(reorder_point, 2),
            safety_stock=round(safety_stock, 2),
            suggested_order_quantity=round(max(0, predicted_demand - current_stock + safety_stock), 0),
            confidence=confidence,
            urgency=urgency,
            recommendation=recommendation,
            trend=TrendDirection(trend),
            trend_percentage=round(trend_pct, 1),
            avg_daily_sales=round(daily_avg, 2),
            sales_velocity=round(daily_rate, 2),
        )

    def _detect_trend(self, values: List[float]) -> tuple[str, float]:
        """Detect sales trend direction."""
        if len(values) < 14:
            return "stable", 0.0

        n = len(values)
        x = list(range(n))
        sum_x = sum(x)
        sum_y = sum(values)
        sum_xy = sum(xi * yi for xi, yi in zip(x, values))
        sum_x2 = sum(xi ** 2 for xi in x)

        denominator = n * sum_x2 - sum_x ** 2
        if denominator == 0:
            return "stable", 0.0

        slope = (n * sum_xy - sum_x * sum_y) / denominator
        avg = sum_y / n if n > 0 else 1
        pct_change = (slope * n / avg) * 100 if avg != 0 else 0

        if pct_change > 5:
            return "increasing", pct_change
        elif pct_change < -5:
            return "decreasing", pct_change
        return "stable", pct_change

    def _generate_recommendation(
        self,
        current_stock: float,
        predicted_demand: float,
        safety_stock: float,
        reorder_point: float,
        days_ahead: int,
    ) -> tuple[str, UrgencyLevel]:
        """Generate stock recommendation."""
        if current_stock <= safety_stock * 0.5:
            return "Stock critique - Commander immédiatement", UrgencyLevel.CRITICAL
        elif current_stock <= safety_stock:
            return "Stock de sécurité atteint - Commander d'urgence", UrgencyLevel.CRITICAL
        elif current_stock <= reorder_point:
            return "Point de commande atteint - Passer commande", UrgencyLevel.HIGH
        elif current_stock <= predicted_demand * 1.2:
            return "Planifier une commande dans les prochains jours", UrgencyLevel.MEDIUM
        else:
            return "Stock suffisant", UrgencyLevel.LOW

    def _calculate_confidence(
        self,
        data_points: int,
        daily_std: float,
        daily_avg: float,
    ) -> float:
        """Calculate prediction confidence."""
        if data_points < 14:
            quantity_confidence = 0.4
        elif data_points < 30:
            quantity_confidence = 0.6
        elif data_points < 60:
            quantity_confidence = 0.75
        elif data_points < 90:
            quantity_confidence = 0.85
        else:
            quantity_confidence = 0.9

        if daily_avg > 0:
            cv = daily_std / daily_avg
            variability_confidence = max(0.4, min(1.0, 1.0 - cv * 0.5))
        else:
            variability_confidence = 0.5

        return round(quantity_confidence * variability_confidence, 2)


# ── Prediction Endpoints ───────────────────────────────────────────

@router.get("/stock/{product_id}", response_model=PredictionItem)
async def get_product_prediction(
    product_id: int,
    days_ahead: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get stock prediction for a single product.

    Returns ML-based prediction including:
    - Predicted demand
    - Days of stock remaining
    - Reorder point
    - Suggested order quantity
    """
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI predictions not enabled")

    service = SavanaFlowPredictionService(db, store_id=current_user.store_id)
    try:
        return await service.get_product_prediction(product_id, days_ahead)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/stock/alerts", response_model=List[PredictionItem])
async def get_low_stock_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get products that need immediate attention.

    Returns products with critical or high urgency levels.
    """
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI predictions not enabled")

    service = SavanaFlowPredictionService(db, store_id=current_user.store_id)
    return await service.get_low_stock_alerts()


@router.get("/stock/suggestions")
async def get_purchase_suggestions(
    days_ahead: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get purchase suggestions based on predictions.

    Returns suggested orders grouped by supplier.
    """
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI predictions not enabled")

    service = SavanaFlowPredictionService(db, store_id=current_user.store_id)
    predictions = await service.get_all_predictions(days_ahead)

    # Filter products that need ordering
    to_order = [p for p in predictions if p.suggested_order_quantity > 0]

    # Group by category (could be extended to supplier)
    suggestions = []
    for pred in to_order:
        suggestions.append({
            "product_id": pred.product_id,
            "product_name": pred.product_name,
            "sku": pred.sku,
            "current_stock": pred.current_stock,
            "quantity_to_order": pred.suggested_order_quantity,
            "urgency": pred.urgency.value,
            "estimated_cost": None,  # Would need cost_price
        })

    return {
        "total_items": len(suggestions),
        "suggestions": suggestions,
    }


@router.get("/stock", response_model=PredictionResponse)
async def get_all_predictions(
    days_ahead: int = Query(default=30, ge=7, le=90),
    urgency: Optional[UrgencyLevel] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get stock predictions for all products.

    Returns comprehensive prediction report with:
    - Summary statistics
    - Individual product predictions
    """
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI predictions not enabled")

    service = SavanaFlowPredictionService(db, store_id=current_user.store_id)
    predictions = await service.get_all_predictions(days_ahead, urgency)

    # Calculate summary
    summary = PredictionSummary(
        total_products=len(predictions),
        critical_count=sum(1 for p in predictions if p.urgency == UrgencyLevel.CRITICAL),
        high_count=sum(1 for p in predictions if p.urgency == UrgencyLevel.HIGH),
        medium_count=sum(1 for p in predictions if p.urgency == UrgencyLevel.MEDIUM),
        low_count=sum(1 for p in predictions if p.urgency == UrgencyLevel.LOW),
        total_to_order=sum(p.suggested_order_quantity for p in predictions),
    )

    return PredictionResponse(
        summary=summary,
        predictions=predictions,
        generated_at=datetime.utcnow(),
    )


@router.get("/demand/report")
async def get_demand_forecast_report(
    days_ahead: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed demand forecast report.

    Returns analysis of demand patterns and forecasts.
    """
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI predictions not enabled")

    service = SavanaFlowPredictionService(db, store_id=current_user.store_id)
    predictions = await service.get_all_predictions(days_ahead)

    # Analyze trends
    increasing = [p for p in predictions if p.trend == TrendDirection.INCREASING]
    decreasing = [p for p in predictions if p.trend == TrendDirection.DECREASING]
    stable = [p for p in predictions if p.trend == TrendDirection.STABLE]

    # Total predicted demand
    total_demand = sum(p.predicted_demand for p in predictions)
    avg_confidence = sum(p.confidence for p in predictions) / len(predictions) if predictions else 0

    return {
        "period_days": days_ahead,
        "total_predicted_demand": round(total_demand, 2),
        "average_confidence": round(avg_confidence, 2),
        "trend_analysis": {
            "increasing_count": len(increasing),
            "decreasing_count": len(decreasing),
            "stable_count": len(stable),
        },
        "top_demand_products": sorted(
            predictions,
            key=lambda x: x.predicted_demand,
            reverse=True
        )[:10],
        "generated_at": datetime.utcnow().isoformat(),
    }


# ── Insights Endpoints ─────────────────────────────────────────────

@insights_router.get("/sales", response_model=DashboardInsights)
async def get_sales_insights(
    days: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get sales insights and analytics.

    Returns AI-generated insights about sales performance.
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)

    # Current period stats
    current_stats = await db.execute(
        select(
            func.count(Sale.id).label("count"),
            func.sum(Sale.total_amount).label("revenue"),
        ).where(
            Sale.created_at >= start_date,
            Sale.status == "COMPLETED",
        )
    )
    current = current_stats.first()

    # Previous period stats
    prev_stats = await db.execute(
        select(
            func.count(Sale.id).label("count"),
            func.sum(Sale.total_amount).label("revenue"),
        ).where(
            Sale.created_at >= prev_start,
            Sale.created_at < start_date,
            Sale.status == "COMPLETED",
        )
    )
    prev = prev_stats.first()

    # Calculate changes
    current_revenue = float(current.revenue or 0)
    prev_revenue = float(prev.revenue or 0)
    revenue_change = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0

    current_sales = current.count or 0
    prev_sales = prev.count or 0
    sales_change = ((current_sales - prev_sales) / prev_sales * 100) if prev_sales > 0 else 0

    avg_order = current_revenue / current_sales if current_sales > 0 else 0

    # Top products
    top_products_query = await db.execute(
        select(
            SaleItem.product_id,
            Product.name.label("product_name"),
            func.sum(SaleItem.quantity).label("quantity"),
            func.sum(SaleItem.line_total).label("revenue"),
        ).join(
            Product, SaleItem.product_id == Product.id
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).where(
            Sale.created_at >= start_date,
            Sale.status == "COMPLETED",
        ).group_by(
            SaleItem.product_id, Product.name
        ).order_by(
            func.sum(SaleItem.line_total).desc()
        ).limit(5)
    )

    top_products = [
        TopProduct(
            product_id=row.product_id,
            product_name=row.product_name,
            quantity_sold=float(row.quantity),
            revenue=float(row.revenue),
            percentage_of_total=round(float(row.revenue) / current_revenue * 100, 1) if current_revenue > 0 else 0,
        )
        for row in top_products_query.all()
    ]

    # Low stock count
    low_stock_query = await db.execute(
        select(func.count(Product.id)).where(
            Product.stock_quantity <= Product.low_stock_threshold,
            Product.is_active == True,
        )
    )
    low_stock_count = low_stock_query.scalar() or 0

    # Generate insights
    insights = []

    if revenue_change > 10:
        insights.append(SalesInsight(
            type="sales_trend",
            title="Ventes en hausse",
            description=f"Les revenus ont augmenté de {revenue_change:.1f}% par rapport à la période précédente.",
            priority="low",
            value=current_revenue,
            change_percent=revenue_change,
        ))
    elif revenue_change < -10:
        insights.append(SalesInsight(
            type="sales_trend",
            title="Ventes en baisse",
            description=f"Les revenus ont diminué de {abs(revenue_change):.1f}%. Envisagez des promotions.",
            priority="high",
            value=current_revenue,
            change_percent=revenue_change,
            recommendation="Analysez les produits à faible performance et envisagez des remises.",
        ))

    if low_stock_count > 0:
        insights.append(SalesInsight(
            type="low_stock",
            title="Produits en stock bas",
            description=f"{low_stock_count} produits sont en dessous du seuil de réapprovisionnement.",
            priority="high" if low_stock_count > 5 else "medium",
            value=low_stock_count,
            recommendation="Consultez les prédictions de stock et passez vos commandes.",
        ))

    if top_products:
        insights.append(SalesInsight(
            type="top_product",
            title="Produit phare",
            description=f"'{top_products[0].product_name}' génère {top_products[0].percentage_of_total}% de vos revenus.",
            priority="low",
            value=top_products[0].revenue,
        ))

    return DashboardInsights(
        total_revenue=round(current_revenue, 2),
        revenue_change=round(revenue_change, 1),
        total_sales=current_sales,
        sales_change=round(sales_change, 1),
        average_order_value=round(avg_order, 2),
        top_products=top_products,
        low_stock_count=low_stock_count,
        insights=insights,
    )


@insights_router.get("/dashboard")
async def get_insights_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get combined insights dashboard.

    Returns all key metrics and AI-generated insights.
    """
    # This combines sales, stock, and customer insights
    # For now, redirect to sales insights
    return await get_sales_insights(days=30, current_user=current_user, db=db)


@insights_router.get("/customers")
async def get_customer_insights(
    days: int = Query(default=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get customer behavior insights.

    Returns analysis of customer segments and value.
    """
    start_date = date.today() - timedelta(days=days)

    # Customer stats
    total_customers = await db.execute(
        select(func.count(POSCustomer.id)).where(
            POSCustomer.is_active == True
        )
    )

    new_customers = await db.execute(
        select(func.count(POSCustomer.id)).where(
            POSCustomer.created_at >= start_date,
            POSCustomer.is_active == True
        )
    )

    returning_customers = await db.execute(
        select(func.count(func.distinct(Sale.customer_id))).where(
            Sale.created_at >= start_date,
            Sale.customer_id.isnot(None),
        )
    )

    # Top customers
    top_customers_query = await db.execute(
        select(
            POSCustomer.id,
            POSCustomer.name,
            func.sum(Sale.total_amount).label("total_spent"),
            func.count(Sale.id).label("visit_count"),
        ).join(
            Sale, POSCustomer.id == Sale.customer_id
        ).where(
            Sale.created_at >= start_date,
        ).group_by(
            POSCustomer.id, POSCustomer.name
        ).order_by(
            func.sum(Sale.total_amount).desc()
        ).limit(10)
    )

    return {
        "total_customers": total_customers.scalar() or 0,
        "new_customers": new_customers.scalar() or 0,
        "returning_customers": returning_customers.scalar() or 0,
        "period_days": days,
        "top_customers": [
            {
                "id": row.id,
                "name": row.name,
                "total_spent": float(row.total_spent),
                "visit_count": row.visit_count,
            }
            for row in top_customers_query.all()
        ],
    }
