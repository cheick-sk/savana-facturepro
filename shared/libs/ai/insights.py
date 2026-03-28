"""
AI-powered business insights
Generates actionable recommendations for businesses

Features:
- Sales trend analysis and insights
- Customer behavior analysis
- Cash flow predictions
- Anomaly detection
- Business recommendations
"""
from __future__ import annotations

from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from enum import Enum
import logging
import math

logger = logging.getLogger(__name__)


class InsightType(str, Enum):
    """Types of business insights."""
    SALES_TREND = "sales_trend"
    TOP_PRODUCT = "top_product"
    LOW_STOCK = "low_stock"
    CUSTOMER_INSIGHT = "customer_insight"
    REVENUE_FORECAST = "revenue_forecast"
    ANOMALY = "anomaly"
    RECOMMENDATION = "recommendation"


class InsightPriority(str, Enum):
    """Priority levels for insights."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Insight:
    """A single business insight."""
    type: InsightType
    title: str
    description: str
    priority: InsightPriority
    value: Optional[float] = None
    change_percent: Optional[float] = None
    recommendation: Optional[str] = None
    metadata: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SalesInsights:
    """Sales insights result."""
    total_revenue: float
    total_sales: int
    average_order_value: float
    revenue_change: float
    sales_change: float
    top_products: list[dict]
    top_customers: list[dict]
    sales_by_day: list[dict]
    insights: list[Insight]
    period_start: date
    period_end: date


@dataclass
class CustomerInsights:
    """Customer behavior insights."""
    total_customers: int
    new_customers: int
    returning_customers: int
    retention_rate: float
    average_customer_value: float
    top_customers: list[dict]
    customer_segments: list[dict]
    insights: list[Insight]


@dataclass
class CashflowInsights:
    """Cash flow insights and predictions."""
    current_balance: float
    projected_income: float
    projected_expenses: float
    projected_balance: float
    days_of_cash: float
    alerts: list[Insight]
    weekly_forecast: list[dict]


class InsightsService:
    """
    Service de génération d'insights business

    Analyse les données de l'entreprise et génère des
    recommandations actionables.
    """

    def __init__(self, db_session):
        """
        Initialize the insights service.

        Args:
            db_session: Database session for querying data
        """
        self.db = db_session

    async def generate_sales_insights(
        self,
        organisation_id: int,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
    ) -> SalesInsights:
        """
        Génère des insights sur les ventes.

        Args:
            organisation_id: ID de l'organisation
            period_start: Date de début (défaut: 30 jours avant)
            period_end: Date de fin (défaut: aujourd'hui)

        Returns:
            SalesInsights avec analyse complète
        """
        if not period_end:
            period_end = date.today()
        if not period_start:
            period_start = period_end - timedelta(days=30)

        # This should be implemented by the calling app
        raise NotImplementedError("Subclasses must implement generate_sales_insights")

    async def generate_customer_insights(
        self,
        organisation_id: int,
    ) -> CustomerInsights:
        """
        Insights sur les clients.

        - Segmentation client
        - Valeur client lifetime
        - Taux de rétention
        """
        raise NotImplementedError("Subclasses must implement generate_customer_insights")

    async def generate_cashflow_insights(
        self,
        organisation_id: int,
        days_ahead: int = 30,
    ) -> CashflowInsights:
        """
        Insights sur la trésorerie.

        - Prévision de trésorerie
        - Alertes de liquidité
        - Recommandations
        """
        raise NotImplementedError("Subclasses must implement generate_cashflow_insights")

    async def detect_anomalies(
        self,
        organisation_id: int,
        metric: str = "sales",
        sensitivity: float = 2.0,
    ) -> list[Insight]:
        """
        Détecte les anomalies dans les données.

        Args:
            organisation_id: ID de l'organisation
            metric: Métrique à analyser ('sales', 'revenue', 'stock')
            sensitivity: Seuil de détection (z-score)

        Returns:
            Liste des anomalies détectées
        """
        raise NotImplementedError("Subclasses must implement detect_anomalies")

    async def get_dashboard_insights(
        self,
        organisation_id: int,
    ) -> dict:
        """
        Get combined insights for dashboard display.

        Returns all key metrics and top insights.
        """
        raise NotImplementedError("Subclasses must implement get_dashboard_insights")

    def _calculate_growth_rate(
        self,
        current: float,
        previous: float,
    ) -> float:
        """Calculate percentage growth rate."""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100

    def _detect_trend_direction(
        self,
        values: list[float],
    ) -> str:
        """Detect trend direction from a series of values."""
        if len(values) < 3:
            return "stable"

        # Simple linear regression slope
        n = len(values)
        x = list(range(n))

        sum_x = sum(x)
        sum_y = sum(values)
        sum_xy = sum(xi * yi for xi, yi in zip(x, values))
        sum_x2 = sum(xi ** 2 for xi in x)

        denominator = n * sum_x2 - sum_x ** 2
        if denominator == 0:
            return "stable"

        slope = (n * sum_xy - sum_x * sum_y) / denominator

        # Determine direction based on slope
        avg = sum_y / n if n > 0 else 1
        pct_change = (slope * n / avg) * 100 if avg != 0 else 0

        if pct_change > 5:
            return "increasing"
        elif pct_change < -5:
            return "decreasing"
        else:
            return "stable"

    def _generate_sales_recommendations(
        self,
        sales_data: dict,
        top_products: list[dict],
        low_stock: list[dict],
    ) -> list[str]:
        """Generate actionable sales recommendations."""
        recommendations = []

        # Check for declining sales
        if sales_data.get("revenue_change", 0) < -10:
            recommendations.append(
                "Les ventes ont diminué cette période. "
                "Envisagez des promotions pour stimuler la demande."
            )

        # Check for top performing products
        if top_products:
            top = top_products[0]
            recommendations.append(
                f"'{top.get('name', 'Produit')}' est votre meilleur produit. "
                "Assurez-vous d'avoir un stock suffisant."
            )

        # Check for low stock on popular items
        for product in low_stock:
            if product.get("is_top_seller"):
                recommendations.append(
                    f"ALERTE: '{product.get('name')}' est en stock bas "
                    "mais se vend bien. Réapprovisionner rapidement."
                )

        return recommendations

    def _segment_customers(
        self,
        customers_data: list[dict],
    ) -> list[dict]:
        """Segment customers based on RFM analysis."""
        segments = {
            "champions": [],
            "loyal": [],
            "potential": [],
            "at_risk": [],
            "lost": [],
        }

        for customer in customers_data:
            recency = customer.get("days_since_last_purchase", 999)
            frequency = customer.get("purchase_count", 0)
            monetary = customer.get("total_spent", 0)

            # Simple RFM scoring
            if recency <= 30 and frequency >= 5 and monetary >= 100000:
                segments["champions"].append(customer)
            elif recency <= 60 and frequency >= 3:
                segments["loyal"].append(customer)
            elif recency <= 90 and frequency >= 1:
                segments["potential"].append(customer)
            elif recency <= 180:
                segments["at_risk"].append(customer)
            else:
                segments["lost"].append(customer)

        return [
            {"segment": name, "count": len(customers), "customers": customers[:5]}
            for name, customers in segments.items()
        ]

    def _calculate_z_score(
        self,
        value: float,
        mean: float,
        std: float,
    ) -> float:
        """Calculate z-score for anomaly detection."""
        if std == 0:
            return 0.0
        return (value - mean) / std

    def _is_anomaly(
        self,
        z_score: float,
        threshold: float = 2.0,
    ) -> bool:
        """Check if z-score indicates an anomaly."""
        return abs(z_score) > threshold


# Convenience function for quick insight generation
async def get_quick_insights(
    db_session,
    organisation_id: int,
    insight_type: str = "all",
) -> list[Insight]:
    """
    Quick function to generate insights.

    Usage:
        insights = await get_quick_insights(db, org_id, "sales")
    """
    service = InsightsService(db_session)

    if insight_type == "sales":
        result = await service.generate_sales_insights(organisation_id)
        return result.insights
    elif insight_type == "customers":
        result = await service.generate_customer_insights(organisation_id)
        return result.insights
    elif insight_type == "cashflow":
        result = await service.generate_cashflow_insights(organisation_id)
        return result.alerts
    else:
        dashboard = await service.get_dashboard_insights(organisation_id)
        return dashboard.get("insights", [])
