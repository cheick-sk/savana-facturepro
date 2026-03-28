"""
Stock prediction and demand forecasting service
Uses statistical methods and ML for inventory optimization

Features:
- Sales trend analysis
- Seasonality detection
- Safety stock calculation
- Reorder point optimization
- Demand forecasting
"""
from __future__ import annotations

from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from enum import Enum
import logging
import math

logger = logging.getLogger(__name__)


class UrgencyLevel(str, Enum):
    """Urgency levels for stock recommendations."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class StockPrediction:
    """Stock prediction result for a single product."""
    product_id: int
    product_name: str
    sku: Optional[str]
    current_stock: float
    predicted_demand: float
    days_of_stock: float
    reorder_point: float
    safety_stock: float
    suggested_order_quantity: float
    confidence: float
    urgency: UrgencyLevel
    recommendation: str
    trend: str  # "increasing", "decreasing", "stable"
    trend_percentage: float
    avg_daily_sales: float
    sales_velocity: float  # units per day


@dataclass
class SalesHistory:
    """Daily sales history for a product."""
    date: date
    quantity: float
    revenue: float


class StockPredictionService:
    """
    Service de prédiction des besoins de réapprovisionnement

    Utilise:
    - Historique des ventes
    - Saisonnalité (jour de semaine, mensuelle)
    - Tendances (croissance/décroissance)
    - Calcul du stock de sécurité
    """

    # Z-scores for different service levels
    SERVICE_LEVELS = {
        0.90: 1.28,  # 90% service level
        0.95: 1.65,  # 95% service level
        0.98: 2.05,  # 98% service level
        0.99: 2.33,  # 99% service level
    }

    def __init__(
        self,
        db_session,
        default_lead_time: int = 7,
        default_service_level: float = 0.95,
        min_data_points: int = 14,
    ):
        """
        Initialize the prediction service.

        Args:
            db_session: Database session for querying sales data
            default_lead_time: Default supplier lead time in days
            default_service_level: Target service level (0-1)
            min_data_points: Minimum data points required for prediction
        """
        self.db = db_session
        self.default_lead_time = default_lead_time
        self.default_service_level = default_service_level
        self.min_data_points = min_data_points

    async def predict_stock_needs(
        self,
        product_id: int,
        days_ahead: int = 30,
        lead_time: Optional[int] = None,
        service_level: Optional[float] = None,
    ) -> StockPrediction:
        """
        Prédit les besoins en stock pour un produit

        Args:
            product_id: ID du produit
            days_ahead: Nombre de jours à prévoir
            lead_time: Délai de livraison (défaut: default_lead_time)
            service_level: Niveau de service souhaité (défaut: default_service_level)

        Returns:
            StockPrediction avec recommandations
        """
        lead_time = lead_time or self.default_lead_time
        service_level = service_level or self.default_service_level

        # 1. Récupérer les données du produit
        product_data = await self._get_product_data(product_id)
        if not product_data:
            raise ValueError(f"Product {product_id} not found")

        # 2. Récupérer l'historique des ventes
        sales_history = await self._get_sales_history(product_id, days=90)

        current_stock = float(product_data.get("stock_quantity", 0))
        product_name = product_data.get("name", f"Product {product_id}")
        sku = product_data.get("sku")

        # 3. Vérifier si on a assez de données
        if len(sales_history) < self.min_data_points:
            return self._simple_prediction(
                product_id=product_id,
                product_name=product_name,
                sku=sku,
                current_stock=current_stock,
                sales_history=sales_history,
                days_ahead=days_ahead,
                lead_time=lead_time,
            )

        # 4. Calculer les métriques statistiques
        daily_sales = [s.quantity for s in sales_history]
        daily_avg = self._calculate_average(daily_sales)
        daily_std = self._calculate_std(daily_sales)

        # 5. Détecter la tendance
        trend, trend_pct = self._detect_trend(daily_sales)

        # 6. Détecter la saisonnalité
        weekly_pattern = self._detect_weekly_pattern(daily_sales)

        # 7. Prédiction de la demande
        predicted_demand = self._forecast_demand(
            daily_avg=daily_avg,
            daily_std=daily_std,
            weekly_pattern=weekly_pattern,
            trend=trend,
            trend_pct=trend_pct,
            days_ahead=days_ahead,
        )

        # 8. Calculer le stock de sécurité
        safety_stock = self._calculate_safety_stock(
            daily_avg=daily_avg,
            daily_std=daily_std,
            lead_time=lead_time,
            service_level=service_level,
        )

        # 9. Calculer le point de commande
        reorder_point = self._calculate_reorder_point(
            daily_avg=daily_avg,
            safety_stock=safety_stock,
            lead_time=lead_time,
        )

        # 10. Générer la recommandation
        recommendation = self._generate_recommendation(
            current_stock=current_stock,
            predicted_demand=predicted_demand,
            safety_stock=safety_stock,
            reorder_point=reorder_point,
            days_ahead=days_ahead,
        )

        # 11. Calculer les jours de stock restants
        daily_rate = predicted_demand / days_ahead if days_ahead > 0 else 0
        days_of_stock = current_stock / daily_rate if daily_rate > 0 else 999

        # 12. Calculer la confiance
        confidence = self._calculate_confidence(len(sales_history), daily_std, daily_avg)

        return StockPrediction(
            product_id=product_id,
            product_name=product_name,
            sku=sku,
            current_stock=round(current_stock, 2),
            predicted_demand=round(predicted_demand, 2),
            days_of_stock=round(min(days_of_stock, 999), 1),
            reorder_point=round(reorder_point, 2),
            safety_stock=round(safety_stock, 2),
            suggested_order_quantity=round(recommendation["quantity"], 0),
            confidence=confidence,
            urgency=UrgencyLevel(recommendation["urgency"]),
            recommendation=recommendation["message"],
            trend=trend,
            trend_percentage=round(trend_pct, 1),
            avg_daily_sales=round(daily_avg, 2),
            sales_velocity=round(daily_rate, 2),
        )

    async def _get_product_data(self, product_id: int) -> Optional[dict]:
        """Récupérer les données du produit depuis la base."""
        # This should be implemented by the calling app
        # Return basic product info including stock_quantity, name, sku
        raise NotImplementedError("Subclasses must implement _get_product_data")

    async def _get_sales_history(
        self,
        product_id: int,
        days: int = 90
    ) -> list[SalesHistory]:
        """Récupérer l'historique des ventes quotidiennes."""
        # This should be implemented by the calling app
        # Return list of SalesHistory for each day
        raise NotImplementedError("Subclasses must implement _get_sales_history")

    def _calculate_average(self, values: list[float]) -> float:
        """Calculer la moyenne."""
        if not values:
            return 0.0
        return sum(values) / len(values)

    def _calculate_std(self, values: list[float]) -> float:
        """Calculer l'écart-type."""
        if len(values) < 2:
            return 0.0
        avg = self._calculate_average(values)
        variance = sum((x - avg) ** 2 for x in values) / (len(values) - 1)
        return math.sqrt(variance)

    def _detect_trend(self, sales: list[float]) -> tuple[str, float]:
        """
        Détecter la tendance (croissance/décroissance).

        Returns:
            Tuple of (trend_direction, percentage_change)
        """
        if len(sales) < 14:
            return "stable", 0.0

        # Simple linear regression
        n = len(sales)
        x = list(range(n))
        y = sales

        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x, y))
        sum_x2 = sum(xi ** 2 for xi in x)

        denominator = n * sum_x2 - sum_x ** 2
        if denominator == 0:
            return "stable", 0.0

        slope = (n * sum_xy - sum_x * sum_y) / denominator

        # Calculate percentage change over the period
        avg = sum_y / n if n > 0 else 1
        if avg == 0:
            return "stable", 0.0

        # Project the trend over the entire period
        total_change = slope * n
        pct_change = (total_change / avg) * 100

        if pct_change > 5:
            return "increasing", pct_change
        elif pct_change < -5:
            return "decreasing", pct_change
        else:
            return "stable", pct_change

    def _detect_weekly_pattern(self, sales: list[float]) -> dict[int, float]:
        """
        Détecter les patterns hebdomadaires.

        Returns:
            Dict mapping day of week (0=Monday) to relative sales ratio
        """
        if len(sales) < 14:
            # Not enough data, return flat pattern
            return {i: 1.0 for i in range(7)}

        # Group sales by day of week
        day_totals = {i: [] for i in range(7)}

        for i, sale in enumerate(sales):
            # Assume sales list starts from most recent, going back
            # We need to know actual dates, but for now use index
            day_of_week = i % 7
            day_totals[day_of_week].append(sale)

        # Calculate average for each day
        day_averages = {}
        for day, values in day_totals.items():
            if values:
                day_averages[day] = sum(values) / len(values)
            else:
                day_averages[day] = 0.0

        # Normalize to ratios
        overall_avg = sum(day_averages.values()) / 7 if day_averages else 1.0
        if overall_avg == 0:
            return {i: 1.0 for i in range(7)}

        return {day: avg / overall_avg for day, avg in day_averages.items()}

    def _forecast_demand(
        self,
        daily_avg: float,
        daily_std: float,
        weekly_pattern: dict[int, float],
        trend: str,
        trend_pct: float,
        days_ahead: int,
    ) -> float:
        """
        Générer la prévision de demande.

        Combines:
        - Base average demand
        - Trend adjustment
        - Weekly seasonality
        """
        # Base forecast
        base_forecast = daily_avg * days_ahead

        # Apply trend adjustment (partial effect)
        trend_factor = 1 + (trend_pct / 100) * 0.3  # 30% of trend effect
        base_forecast *= max(0.5, min(2.0, trend_factor))  # Cap between 50% and 200%

        # Apply weekly seasonality adjustment (small effect)
        # This would ideally use actual day-of-week for each future day
        seasonality_factor = sum(weekly_pattern.values()) / 7
        base_forecast *= seasonality_factor

        return max(0, base_forecast)

    def _calculate_safety_stock(
        self,
        daily_avg: float,
        daily_std: float,
        lead_time: int,
        service_level: float = 0.95,
    ) -> float:
        """
        Calculer le stock de sécurité.

        Formula: Z * σ * √(Lead Time)

        Where Z is the Z-score for the desired service level.
        """
        # Get Z-score for service level
        z_score = self.SERVICE_LEVELS.get(service_level, 1.65)

        # Safety stock formula
        safety_stock = z_score * daily_std * math.sqrt(lead_time)

        return max(0, safety_stock)

    def _calculate_reorder_point(
        self,
        daily_avg: float,
        safety_stock: float,
        lead_time: int,
    ) -> float:
        """
        Calculer le point de commande.

        Formula: (Daily Average × Lead Time) + Safety Stock
        """
        return (daily_avg * lead_time) + safety_stock

    def _generate_recommendation(
        self,
        current_stock: float,
        predicted_demand: float,
        safety_stock: float,
        reorder_point: float,
        days_ahead: int,
    ) -> dict:
        """Générer une recommandation d'achat."""

        if current_stock <= safety_stock * 0.5:
            return {
                "action": "urgent_order",
                "quantity": predicted_demand - current_stock + safety_stock * 2,
                "urgency": "critical",
                "message": "Stock critique - Commander immédiatement"
            }
        elif current_stock <= safety_stock:
            return {
                "action": "urgent_order",
                "quantity": predicted_demand - current_stock + safety_stock,
                "urgency": "critical",
                "message": "Stock de sécurité atteint - Commander d'urgence"
            }
        elif current_stock <= reorder_point:
            return {
                "action": "order",
                "quantity": predicted_demand - current_stock + safety_stock,
                "urgency": "high",
                "message": "Point de commande atteint - Passer commande"
            }
        elif current_stock <= predicted_demand * 1.2:
            return {
                "action": "plan_order",
                "quantity": safety_stock,
                "urgency": "medium",
                "message": "Planifier une commande dans les prochains jours"
            }
        elif current_stock <= predicted_demand * 1.5:
            return {
                "action": "monitor",
                "quantity": 0,
                "urgency": "low",
                "message": "Stock suffisant - Surveiller les ventes"
            }
        else:
            return {
                "action": "no_action",
                "quantity": 0,
                "urgency": "low",
                "message": "Stock confortable"
            }

    def _calculate_confidence(
        self,
        data_points: int,
        daily_std: float,
        daily_avg: float,
    ) -> float:
        """
        Calculer le niveau de confiance de la prévision.

        Based on:
        - Amount of historical data
        - Variability of sales (coefficient of variation)
        """
        # Base confidence from data quantity
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

        # Adjust for variability
        if daily_avg > 0:
            cv = daily_std / daily_avg  # Coefficient of variation
            if cv < 0.3:
                variability_confidence = 1.0
            elif cv < 0.5:
                variability_confidence = 0.9
            elif cv < 0.7:
                variability_confidence = 0.75
            elif cv < 1.0:
                variability_confidence = 0.6
            else:
                variability_confidence = 0.4
        else:
            variability_confidence = 0.5

        return round(quantity_confidence * variability_confidence, 2)

    def _simple_prediction(
        self,
        product_id: int,
        product_name: str,
        sku: Optional[str],
        current_stock: float,
        sales_history: list[SalesHistory],
        days_ahead: int,
        lead_time: int,
    ) -> StockPrediction:
        """Simple prediction when not enough data is available."""

        # Calculate simple average from available data
        if sales_history:
            total_sales = sum(s.quantity for s in sales_history)
            days = len(sales_history)
            daily_avg = total_sales / days if days > 0 else 0
        else:
            daily_avg = 0

        predicted_demand = daily_avg * days_ahead
        safety_stock = daily_avg * lead_time * 1.5  # Conservative estimate
        reorder_point = (daily_avg * lead_time) + safety_stock

        recommendation = self._generate_recommendation(
            current_stock=current_stock,
            predicted_demand=predicted_demand,
            safety_stock=safety_stock,
            reorder_point=reorder_point,
            days_ahead=days_ahead,
        )

        daily_rate = predicted_demand / days_ahead if days_ahead > 0 else 0
        days_of_stock = current_stock / daily_rate if daily_rate > 0 else 999

        return StockPrediction(
            product_id=product_id,
            product_name=product_name,
            sku=sku,
            current_stock=round(current_stock, 2),
            predicted_demand=round(predicted_demand, 2),
            days_of_stock=round(min(days_of_stock, 999), 1),
            reorder_point=round(reorder_point, 2),
            safety_stock=round(safety_stock, 2),
            suggested_order_quantity=round(recommendation["quantity"], 0),
            confidence=0.4,  # Low confidence for simple prediction
            urgency=UrgencyLevel(recommendation["urgency"]),
            recommendation=recommendation["message"],
            trend="stable",
            trend_percentage=0.0,
            avg_daily_sales=round(daily_avg, 2),
            sales_velocity=round(daily_rate, 2),
        )

    async def get_low_stock_alerts(
        self,
        store_id: int,
        threshold_multiplier: float = 1.0,
    ) -> list[StockPrediction]:
        """
        Get all products that need attention.

        Args:
            store_id: Store ID to check
            threshold_multiplier: Multiplier for reorder point threshold

        Returns:
            List of predictions for products needing attention
        """
        # This should be implemented by the calling app
        raise NotImplementedError("Subclasses must implement get_low_stock_alerts")

    async def get_purchase_suggestions(
        self,
        store_id: int,
        days_ahead: int = 30,
    ) -> list[dict]:
        """
        Get suggested purchase orders based on predictions.

        Returns grouped suggestions by supplier.
        """
        # This should be implemented by the calling app
        raise NotImplementedError("Subclasses must implement get_purchase_suggestions")
