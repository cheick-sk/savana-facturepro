"""
AI/ML Services Module for SaaS Africa Platform

This module provides AI-powered features including:
- Invoice OCR: Extract structured data from invoice images/PDFs
- Stock Predictions: ML-based demand forecasting and reorder recommendations
- Business Insights: Smart analytics and recommendations
"""

from shared.libs.ai.invoice_ocr import InvoiceOCRService
from shared.libs.ai.predictions import StockPredictionService, StockPrediction
from shared.libs.ai.insights import InsightsService

__all__ = [
    "InvoiceOCRService",
    "StockPredictionService",
    "StockPrediction",
    "InsightsService",
]
