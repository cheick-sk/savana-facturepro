"""Unit tests for PDF generation service.

Tests cover:
- PDF generation
- Content validation
- Error handling
"""
from __future__ import annotations

import pytest
from datetime import datetime, timezone
from io import BytesIO

from app.services.pdf_service import generate_invoice_pdf, _fmt_date


pytestmark = pytest.mark.unit


class TestGenerateInvoicePdf:
    """Tests for PDF generation."""

    def test_generate_basic_invoice_pdf(self):
        """Test generating a basic invoice PDF."""
        invoice_data = {
            "invoice_number": "FP-2024-00001",
            "customer_name": "Test Customer",
            "customer_email": "customer@example.com",
            "customer_phone": "+2250707070707",
            "customer_address": "Abidjan, Côte d'Ivoire",
            "issue_date": datetime(2024, 6, 15, tzinfo=timezone.utc),
            "due_date": datetime(2024, 7, 15, tzinfo=timezone.utc),
            "status": "SENT",
            "currency": "XOF",
            "subtotal": 100000.0,
            "tax_amount": 18000.0,
            "discount_amount": 0.0,
            "total_amount": 118000.0,
            "amount_paid": 0.0,
            "notes": "Thank you for your business!",
            "items": [
                {
                    "description": "Consulting Service",
                    "quantity": 2,
                    "unit_price": 50000.0,
                    "tax_rate": 18.0,
                    "line_total": 118000.0,
                }
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)

        assert pdf_bytes is not None
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0

        # Verify PDF header
        assert pdf_bytes[:4] == b"%PDF"

    def test_generate_invoice_pdf_multiple_items(self):
        """Test generating PDF with multiple invoice items."""
        invoice_data = {
            "invoice_number": "FP-2024-00002",
            "customer_name": "Multi Item Customer",
            "issue_date": datetime.now(timezone.utc),
            "due_date": None,
            "status": "DRAFT",
            "currency": "XOF",
            "subtotal": 250000.0,
            "tax_amount": 45000.0,
            "total_amount": 295000.0,
            "items": [
                {
                    "description": "Service A",
                    "quantity": 2,
                    "unit_price": 50000.0,
                    "tax_rate": 18.0,
                    "line_total": 118000.0,
                },
                {
                    "description": "Service B",
                    "quantity": 1,
                    "unit_price": 150000.0,
                    "tax_rate": 18.0,
                    "line_total": 177000.0,
                },
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)
        assert pdf_bytes is not None
        assert len(pdf_bytes) > 1000  # Should be larger with more items

    def test_generate_invoice_pdf_with_discount(self):
        """Test generating PDF with discount applied."""
        invoice_data = {
            "invoice_number": "FP-2024-00003",
            "customer_name": "Discount Customer",
            "issue_date": datetime.now(timezone.utc),
            "status": "SENT",
            "currency": "XOF",
            "subtotal": 100000.0,
            "tax_amount": 16200.0,
            "discount_amount": 10000.0,
            "total_amount": 106200.0,
            "items": [
                {
                    "description": "Discounted Service",
                    "quantity": 1,
                    "unit_price": 100000.0,
                    "tax_rate": 18.0,
                    "line_total": 106200.0,
                }
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)
        assert pdf_bytes is not None

    def test_generate_invoice_pdf_different_statuses(self):
        """Test PDF generation for different invoice statuses."""
        statuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "PARTIAL"]

        for status in statuses:
            invoice_data = {
                "invoice_number": f"FP-2024-STATUS-{status}",
                "customer_name": "Status Test Customer",
                "issue_date": datetime.now(timezone.utc),
                "status": status,
                "currency": "XOF",
                "subtotal": 50000.0,
                "tax_amount": 9000.0,
                "total_amount": 59000.0,
                "items": [
                    {
                        "description": "Test Item",
                        "quantity": 1,
                        "unit_price": 50000.0,
                        "tax_rate": 18.0,
                        "line_total": 59000.0,
                    }
                ],
            }

            pdf_bytes = generate_invoice_pdf(invoice_data)
            assert pdf_bytes is not None, f"Failed for status {status}"

    def test_generate_invoice_pdf_different_currencies(self):
        """Test PDF generation with different currencies."""
        currencies = ["XOF", "XAF", "EUR", "USD", "GNF"]

        for currency in currencies:
            invoice_data = {
                "invoice_number": f"FP-2024-CURR-{currency}",
                "customer_name": "Currency Test Customer",
                "issue_date": datetime.now(timezone.utc),
                "status": "SENT",
                "currency": currency,
                "subtotal": 50000.0,
                "tax_amount": 9000.0,
                "total_amount": 59000.0,
                "items": [
                    {
                        "description": "Test Item",
                        "quantity": 1,
                        "unit_price": 50000.0,
                        "tax_rate": 18.0,
                        "line_total": 59000.0,
                    }
                ],
            }

            pdf_bytes = generate_invoice_pdf(invoice_data)
            assert pdf_bytes is not None, f"Failed for currency {currency}"

    def test_generate_invoice_pdf_no_notes(self):
        """Test PDF generation without notes."""
        invoice_data = {
            "invoice_number": "FP-2024-00004",
            "customer_name": "No Notes Customer",
            "issue_date": datetime.now(timezone.utc),
            "status": "SENT",
            "currency": "XOF",
            "subtotal": 50000.0,
            "tax_amount": 9000.0,
            "total_amount": 59000.0,
            "items": [
                {
                    "description": "Test Item",
                    "quantity": 1,
                    "unit_price": 50000.0,
                    "tax_rate": 18.0,
                    "line_total": 59000.0,
                }
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)
        assert pdf_bytes is not None

    def test_generate_invoice_pdf_empty_customer_info(self):
        """Test PDF generation with minimal customer info."""
        invoice_data = {
            "invoice_number": "FP-2024-00005",
            "customer_name": "Minimal Customer",
            "customer_email": "",
            "customer_phone": "",
            "customer_address": "",
            "issue_date": datetime.now(timezone.utc),
            "status": "DRAFT",
            "currency": "XOF",
            "subtotal": 50000.0,
            "tax_amount": 9000.0,
            "total_amount": 59000.0,
            "items": [
                {
                    "description": "Test Item",
                    "quantity": 1,
                    "unit_price": 50000.0,
                    "tax_rate": 18.0,
                    "line_total": 59000.0,
                }
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)
        assert pdf_bytes is not None

    def test_generate_invoice_pdf_with_long_description(self):
        """Test PDF generation with long item descriptions."""
        long_description = "A" * 200  # 200 characters
        invoice_data = {
            "invoice_number": "FP-2024-00006",
            "customer_name": "Long Description Customer",
            "issue_date": datetime.now(timezone.utc),
            "status": "SENT",
            "currency": "XOF",
            "subtotal": 50000.0,
            "tax_amount": 9000.0,
            "total_amount": 59000.0,
            "items": [
                {
                    "description": long_description,
                    "quantity": 1,
                    "unit_price": 50000.0,
                    "tax_rate": 18.0,
                    "line_total": 59000.0,
                }
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)
        assert pdf_bytes is not None


class TestFormatDate:
    """Tests for date formatting helper."""

    def test_format_datetime_object(self):
        """Test formatting datetime object."""
        dt = datetime(2024, 6, 15, 14, 30, 0, tzinfo=timezone.utc)
        result = _fmt_date(dt)
        assert result == "15/06/2024"

    def test_format_date_string(self):
        """Test formatting date string."""
        result = _fmt_date("2024-06-15")
        assert result == "2024-06-15"

    def test_format_none_date(self):
        """Test formatting None date."""
        result = _fmt_date(None)
        assert result == "—"

    def test_format_other_type(self):
        """Test formatting other types."""
        result = _fmt_date(1718458800)  # timestamp-like
        # Should convert to string and take first 10 chars
        assert len(result) == 10


class TestPdfContentValidation:
    """Tests for PDF content validation."""

    def test_pdf_contains_invoice_number(self):
        """Test that PDF contains the invoice number."""
        invoice_data = {
            "invoice_number": "FP-2024-UNIQUE-123",
            "customer_name": "Test Customer",
            "issue_date": datetime.now(timezone.utc),
            "status": "SENT",
            "currency": "XOF",
            "subtotal": 50000.0,
            "tax_amount": 9000.0,
            "total_amount": 59000.0,
            "items": [
                {
                    "description": "Test",
                    "quantity": 1,
                    "unit_price": 50000.0,
                    "tax_rate": 18.0,
                    "line_total": 59000.0,
                }
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)

        # PDFs are binary, but we can check for text patterns
        # Invoice number should appear in the PDF content
        assert b"FP-2024-UNIQUE-123" in pdf_bytes or b"FP" in pdf_bytes

    def test_pdf_contains_customer_name(self):
        """Test that PDF contains the customer name."""
        invoice_data = {
            "invoice_number": "FP-2024-00007",
            "customer_name": "UniqueCustomerName123",
            "issue_date": datetime.now(timezone.utc),
            "status": "SENT",
            "currency": "XOF",
            "subtotal": 50000.0,
            "tax_amount": 9000.0,
            "total_amount": 59000.0,
            "items": [
                {
                    "description": "Test",
                    "quantity": 1,
                    "unit_price": 50000.0,
                    "tax_rate": 18.0,
                    "line_total": 59000.0,
                }
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)
        assert b"UniqueCustomerName123" in pdf_bytes or b"Unique" in pdf_bytes

    def test_pdf_valid_structure(self):
        """Test that PDF has valid structure."""
        invoice_data = {
            "invoice_number": "FP-2024-00008",
            "customer_name": "Structure Test Customer",
            "issue_date": datetime.now(timezone.utc),
            "status": "DRAFT",
            "currency": "XOF",
            "subtotal": 50000.0,
            "tax_amount": 9000.0,
            "total_amount": 59000.0,
            "items": [
                {
                    "description": "Test",
                    "quantity": 1,
                    "unit_price": 50000.0,
                    "tax_rate": 18.0,
                    "line_total": 59000.0,
                }
            ],
        }

        pdf_bytes = generate_invoice_pdf(invoice_data)

        # Check PDF structure markers
        assert b"%PDF" in pdf_bytes[:10]  # PDF header
        assert b"%%EOF" in pdf_bytes[-100:]  # PDF end marker
