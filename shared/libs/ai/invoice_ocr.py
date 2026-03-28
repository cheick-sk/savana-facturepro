"""
Invoice OCR Service using AI Vision APIs
Extracts structured data from invoice images/pdfs

Supports multiple AI providers:
- Google Gemini Vision
- OpenAI GPT-4 Vision
- Anthropic Claude Vision
"""
from __future__ import annotations

from typing import Optional, Any
from dataclasses import dataclass, field
import base64
import json
import logging
from datetime import datetime
import httpx

logger = logging.getLogger(__name__)


@dataclass
class ExtractedInvoiceData:
    """Structured data extracted from an invoice image."""
    supplier_name: str = ""
    supplier_address: str = ""
    supplier_phone: str = ""
    invoice_number: str = ""
    date: Optional[str] = None
    due_date: Optional[str] = None
    items: list[dict] = field(default_factory=list)
    subtotal: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    currency: str = "XOF"
    payment_terms: str = ""
    notes: str = ""
    confidence: float = 0.0
    raw_response: dict = field(default_factory=dict)


class InvoiceOCRService:
    """
    Service d'extraction de données de factures par IA

    Uses AI vision models to extract structured data from
    invoice images and PDF documents.
    """

    def __init__(
        self,
        api_key: str,
        provider: str = "gemini",
        api_base_url: Optional[str] = None,
    ):
        """
        Initialize the OCR service.

        Args:
            api_key: API key for the AI provider
            provider: AI provider to use ('gemini', 'openai', 'anthropic')
            api_base_url: Optional custom API base URL
        """
        self.api_key = api_key
        self.provider = provider.lower()
        self.api_base_url = api_base_url
        self.client = httpx.AsyncClient(timeout=60.0)

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def extract_invoice_data(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        language_hint: str = "fr"
    ) -> ExtractedInvoiceData:
        """
        Extract structured data from an invoice image.

        Args:
            image_bytes: Raw bytes of the image/PDF
            mime_type: MIME type of the input (image/jpeg, image/png, application/pdf)
            language_hint: Language hint for OCR (default: French)

        Returns:
            ExtractedInvoiceData with structured invoice information
        """
        try:
            if self.provider == "gemini":
                return await self._extract_with_gemini(image_bytes, mime_type, language_hint)
            elif self.provider == "openai":
                return await self._extract_with_openai(image_bytes, mime_type, language_hint)
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            raise

    async def _extract_with_gemini(
        self,
        image_bytes: bytes,
        mime_type: str,
        language_hint: str
    ) -> ExtractedInvoiceData:
        """Extract data using Google Gemini Vision API."""

        # Encode image to base64
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt = f"""
        Analyze this invoice image and extract the following information.
        Return ONLY valid JSON, no other text or markdown.

        Language hint: {language_hint} (West African context - amounts likely in XOF/XAF)

        {{
            "supplier_name": "",
            "supplier_address": "",
            "supplier_phone": "",
            "invoice_number": "",
            "date": "YYYY-MM-DD",
            "due_date": "YYYY-MM-DD",
            "items": [
                {{
                    "description": "",
                    "quantity": 0,
                    "unit_price": 0,
                    "tax_rate": 0,
                    "total": 0
                }}
            ],
            "subtotal": 0,
            "tax": 0,
            "total": 0,
            "currency": "XOF",
            "payment_terms": "",
            "notes": ""
        }}

        If any field is not found, use null or empty string.
        Ensure all numbers are numeric (no currency symbols).
        For amounts, extract the numerical value only.
        """

        # Gemini API request
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_base64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 2048,
            }
        }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        response = await self.client.post(url, json=payload, headers=headers)
        response.raise_for_status()

        result = response.json()

        # Extract text from response
        text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

        # Parse JSON response
        return self._parse_extraction_response(text, result)

    async def _extract_with_openai(
        self,
        image_bytes: bytes,
        mime_type: str,
        language_hint: str
    ) -> ExtractedInvoiceData:
        """Extract data using OpenAI GPT-4 Vision API."""

        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{image_base64}"

        prompt = f"""
        Analyze this invoice image and extract the following information.
        Return ONLY valid JSON, no other text or markdown.

        Language hint: {language_hint} (West African context - amounts likely in XOF/XAF)

        {{
            "supplier_name": "",
            "supplier_address": "",
            "supplier_phone": "",
            "invoice_number": "",
            "date": "YYYY-MM-DD",
            "due_date": "YYYY-MM-DD",
            "items": [
                {{
                    "description": "",
                    "quantity": 0,
                    "unit_price": 0,
                    "tax_rate": 0,
                    "total": 0
                }}
            ],
            "subtotal": 0,
            "tax": 0,
            "total": 0,
            "currency": "XOF",
            "payment_terms": "",
            "notes": ""
        }}

        If any field is not found, use null or empty string.
        Ensure all numbers are numeric (no currency symbols).
        """

        url = "https://api.openai.com/v1/chat/completions"

        payload = {
            "model": "gpt-4o",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url}
                    }
                ]
            }],
            "max_tokens": 2048,
            "temperature": 0.1,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        response = await self.client.post(url, json=payload, headers=headers)
        response.raise_for_status()

        result = response.json()

        text = result.get("choices", [{}])[0].get("message", {}).get("content", "")

        return self._parse_extraction_response(text, result)

    def _parse_extraction_response(
        self,
        text: str,
        raw_response: dict
    ) -> ExtractedInvoiceData:
        """Parse the AI response into structured data."""

        # Clean up the text
        text = text.strip()

        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.debug(f"Raw text: {text}")
            # Return empty data with raw response
            return ExtractedInvoiceData(
                raw_response=raw_response,
                confidence=0.0
            )

        # Calculate confidence based on fields present
        required_fields = ["supplier_name", "invoice_number", "date", "total"]
        filled_required = sum(1 for f in required_fields if data.get(f))
        confidence = filled_required / len(required_fields)

        return ExtractedInvoiceData(
            supplier_name=data.get("supplier_name", ""),
            supplier_address=data.get("supplier_address", ""),
            supplier_phone=data.get("supplier_phone", ""),
            invoice_number=data.get("invoice_number", ""),
            date=data.get("date"),
            due_date=data.get("due_date"),
            items=data.get("items", []),
            subtotal=float(data.get("subtotal", 0) or 0),
            tax=float(data.get("tax", 0) or 0),
            total=float(data.get("total", 0) or 0),
            currency=data.get("currency", "XOF"),
            payment_terms=data.get("payment_terms", ""),
            notes=data.get("notes", ""),
            confidence=confidence,
            raw_response=raw_response,
        )

    async def extract_receipt_data(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> dict:
        """
        Extract data from a receipt (for expense tracking).

        Returns simplified structure for receipts.
        """

        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt = """
        Analyze this receipt image and extract information.
        Return ONLY valid JSON.

        {
            "merchant_name": "",
            "merchant_address": "",
            "date": "YYYY-MM-DD",
            "time": "HH:MM",
            "items": [
                {
                    "name": "",
                    "quantity": 0,
                    "unit_price": 0,
                    "total": 0
                }
            ],
            "subtotal": 0,
            "tax": 0,
            "total": 0,
            "payment_method": "",
            "currency": "XOF"
        }
        """

        if self.provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_base64
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 1024,
                }
            }

            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            }

            response = await self.client.post(url, json=payload, headers=headers)
            response.raise_for_status()

            result = response.json()
            text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

            # Clean and parse
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            return json.loads(text.strip())

        raise ValueError(f"Provider {self.provider} not implemented for receipts")

    def validate_extraction(self, data: ExtractedInvoiceData) -> dict:
        """
        Validate and clean extracted data.

        Returns validation result with any corrections made.
        """
        issues = []
        corrections = []

        # Check required fields
        if not data.supplier_name:
            issues.append("Missing supplier name")

        if not data.invoice_number:
            issues.append("Missing invoice number")

        if not data.date:
            issues.append("Missing invoice date")

        # Validate totals
        items_total = sum(
            float(item.get("total", 0) or 0)
            for item in data.items
        )

        if data.subtotal > 0 and items_total > 0:
            # Allow 1% tolerance for rounding
            if abs(data.subtotal - items_total) > data.subtotal * 0.01:
                issues.append(f"Subtotal mismatch: {data.subtotal} vs items sum {items_total}")

        # Validate currency (African currencies)
        valid_currencies = ["XOF", "XAF", "NGN", "GHS", "KES", "ZAR", "GNF", "CDF", "MAD", "TND"]
        if data.currency not in valid_currencies:
            corrections.append(f"Currency '{data.currency}' may not be standard African currency")

        return {
            "is_valid": len(issues) == 0,
            "issues": issues,
            "corrections": corrections,
            "confidence": data.confidence,
        }


# Convenience function for quick extraction
async def extract_invoice(
    image_bytes: bytes,
    api_key: str,
    provider: str = "gemini",
    mime_type: str = "image/jpeg"
) -> ExtractedInvoiceData:
    """
    Quick extraction function for single invoices.

    Usage:
        with open("invoice.jpg", "rb") as f:
            data = await extract_invoice(f.read(), api_key="your-key")
    """
    service = InvoiceOCRService(api_key=api_key, provider=provider)
    try:
        return await service.extract_invoice_data(image_bytes, mime_type)
    finally:
        await service.close()
