"""Email service using aiosmtplib (Mailhog compatible)."""
from __future__ import annotations

import logging
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def send_invoice_email(
    to_email: str,
    customer_name: str,
    invoice_number: str,
    total_amount: float,
    currency: str,
    pdf_bytes: bytes,
) -> bool:
    """Send invoice email with PDF attachment. Returns True on success."""
    settings = get_settings()

    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Votre facture {invoice_number} — FacturePro Africa"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email

    body_html = f"""
    <html><body style="font-family: Arial, sans-serif; color: #374151;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a56db;">FacturePro Africa</h2>
            <hr style="border-color: #1a56db;">
            <p>Bonjour <strong>{customer_name}</strong>,</p>
            <p>Veuillez trouver ci-joint votre facture <strong>{invoice_number}</strong>.</p>
            <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px;">
                    Montant total : <strong style="color: #1a56db;">{total_amount:,.2f} {currency}</strong>
                </p>
            </div>
            <p>Pour toute question, contactez-nous à contact@facturepro.africa</p>
            <p style="color: #6b7280; font-size: 12px;">— L'équipe FacturePro Africa</p>
        </div>
    </body></html>
    """

    msg.attach(MIMEText(body_html, "html", "utf-8"))

    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=f"facture_{invoice_number}.pdf",
    )
    msg.attach(attachment)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=False,
            start_tls=settings.SMTP_STARTTLS,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
        )
        logger.info(f"Invoice email sent to {to_email} for invoice {invoice_number}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send email to {to_email}: {exc}")
        return False
