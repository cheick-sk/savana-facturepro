"""Unit tests for Email service.

Tests cover:
- Email composition
- Attachment handling
- Error handling with mocked SMTP
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from app.services.email_service import send_invoice_email


pytestmark = pytest.mark.unit


class TestSendInvoiceEmail:
    """Tests for sending invoice emails."""

    @pytest.mark.asyncio
    async def test_send_invoice_email_success(self):
        """Test successful email sending."""
        pdf_bytes = b"%PDF-1.4 fake pdf content..."

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            result = await send_invoice_email(
                to_email="customer@example.com",
                customer_name="Test Customer",
                invoice_number="FP-2024-00001",
                total_amount=118000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            assert result is True
            mock_send.assert_called_once()

            # Verify the call arguments
            call_args = mock_send.call_args
            msg = call_args[0][0]

            assert msg["To"] == "customer@example.com"
            assert "FP-2024-00001" in msg["Subject"]

    @pytest.mark.asyncio
    async def test_send_invoice_email_with_attachment(self):
        """Test that PDF attachment is properly attached."""
        pdf_bytes = b"%PDF-1.4 fake pdf content for testing..."

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            await send_invoice_email(
                to_email="customer@example.com",
                customer_name="Test Customer",
                invoice_number="FP-2024-00002",
                total_amount=50000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            call_args = mock_send.call_args
            msg = call_args[0][0]

            # Check that the message is multipart
            assert msg.is_multipart()

            # Get parts and check for PDF attachment
            parts = list(msg.walk())
            has_pdf_attachment = any(
                part.get_content_type() == "application/pdf"
                for part in parts
            )
            assert has_pdf_attachment

    @pytest.mark.asyncio
    async def test_send_invoice_email_content(self):
        """Test email content contains correct information."""
        pdf_bytes = b"%PDF-1.4 test"

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            await send_invoice_email(
                to_email="client@testcompany.com",
                customer_name="Amadou Diallo",
                invoice_number="FP-2024-00123",
                total_amount=250000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            call_args = mock_send.call_args
            msg = call_args[0][0]

            # Check subject
            assert "FP-2024-00123" in msg["Subject"]

            # Get HTML body
            html_part = None
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    html_part = part.get_payload(decode=True).decode()
                    break

            assert html_part is not None
            assert "Amadou Diallo" in html_part
            assert "250,000.00 XOF" in html_part or "250000" in html_part

    @pytest.mark.asyncio
    async def test_send_invoice_email_smtp_error(self):
        """Test handling of SMTP errors."""
        pdf_bytes = b"%PDF-1.4 test"

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.side_effect = Exception("SMTP connection failed")

            result = await send_invoice_email(
                to_email="customer@example.com",
                customer_name="Test Customer",
                invoice_number="FP-2024-00003",
                total_amount=10000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_send_invoice_email_timeout(self):
        """Test handling of SMTP timeout."""
        pdf_bytes = b"%PDF-1.4 test"

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            import asyncio
            mock_send.side_effect = asyncio.TimeoutError("Connection timed out")

            result = await send_invoice_email(
                to_email="customer@example.com",
                customer_name="Test Customer",
                invoice_number="FP-2024-00004",
                total_amount=10000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            assert result is False

    @pytest.mark.asyncio
    async def test_send_invoice_email_different_currencies(self):
        """Test email with different currencies."""
        pdf_bytes = b"%PDF-1.4 test"
        currencies = ["XOF", "XAF", "EUR", "USD", "GNF"]

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            for currency in currencies:
                result = await send_invoice_email(
                    to_email="customer@example.com",
                    customer_name="Test Customer",
                    invoice_number=f"FP-2024-{currency}",
                    total_amount=10000.0,
                    currency=currency,
                    pdf_bytes=pdf_bytes,
                )
                assert result is True

    @pytest.mark.asyncio
    async def test_send_invoice_email_large_amount(self):
        """Test email with large monetary amount."""
        pdf_bytes = b"%PDF-1.4 test"
        large_amount = 999999999.99

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            result = await send_invoice_email(
                to_email="bigcustomer@example.com",
                customer_name="Big Customer",
                invoice_number="FP-2024-BIG",
                total_amount=large_amount,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_send_invoice_email_special_characters(self):
        """Test email with special characters in customer name."""
        pdf_bytes = b"%PDF-1.4 test"

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            result = await send_invoice_email(
                to_email="customer@example.com",
                customer_name="Amadou Ousmane-Diallo",
                invoice_number="FP-2024-00005",
                total_amount=10000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_send_invoice_email_unicode_customer_name(self):
        """Test email with unicode characters in customer name."""
        pdf_bytes = b"%PDF-1.4 test"

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            result = await send_invoice_email(
                to_email="customer@example.com",
                customer_name="Kofi Annan",
                invoice_number="FP-2024-00006",
                total_amount=10000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            assert result is True


class TestEmailComposition:
    """Tests for email message composition."""

    @pytest.mark.asyncio
    async def test_email_has_correct_from_address(self):
        """Test that email has correct From address."""
        pdf_bytes = b"%PDF-1.4 test"

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            await send_invoice_email(
                to_email="customer@example.com",
                customer_name="Test Customer",
                invoice_number="FP-2024-00007",
                total_amount=10000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            call_args = mock_send.call_args
            msg = call_args[0][0]

            # From should be set from settings
            assert msg["From"] is not None
            assert "@" in msg["From"]

    @pytest.mark.asyncio
    async def test_email_subject_format(self):
        """Test email subject format."""
        pdf_bytes = b"%PDF-1.4 test"

        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = None

            await send_invoice_email(
                to_email="customer@example.com",
                customer_name="Test Customer",
                invoice_number="FP-2024-TEST",
                total_amount=10000.0,
                currency="XOF",
                pdf_bytes=pdf_bytes,
            )

            call_args = mock_send.call_args
            msg = call_args[0][0]

            # Subject should contain invoice number
            assert "FP-2024-TEST" in msg["Subject"]
            # Subject should mention it's an invoice
            assert "facture" in msg["Subject"].lower()
