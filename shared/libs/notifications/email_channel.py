"""Email notification channel using SMTP.

Supports:
- HTML and plain text emails
- File attachments (PDFs, images)
- Template-based emails
- Multiple recipients

This integrates with existing email_service.py in FacturePro.
"""
from __future__ import annotations

import logging
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import aiohttp

from .base import (
    NotificationChannel,
    NotificationMessage,
    NotificationResult,
)

logger = logging.getLogger(__name__)


class EmailChannel(NotificationChannel):
    """Email notification channel using SMTP."""

    def __init__(
        self,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str = "",
        smtp_password: str = "",
        smtp_from: str = "noreply@example.com",
        smtp_starttls: bool = False,
    ):
        """Initialize email channel.

        Args:
            smtp_host: SMTP server hostname
            smtp_port: SMTP server port
            smtp_user: SMTP username (optional)
            smtp_password: SMTP password (optional)
            smtp_from: Default sender email address
            smtp_starttls: Use STARTTLS for encryption
        """
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.smtp_from = smtp_from
        self.smtp_starttls = smtp_starttls

    @property
    def name(self) -> str:
        return "email"

    @property
    def is_available(self) -> bool:
        return bool(self.smtp_host)

    async def send(self, message: NotificationMessage) -> NotificationResult:
        """Send an email.

        Args:
            message: Notification message with:
                - to: Recipient email address
                - subject: Email subject
                - body: Email body (HTML supported)
                - attachments: URLs or local paths to attach

        Returns:
            NotificationResult with send status
        """
        if not self.is_available:
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message="Email channel not configured",
            )

        if not message.subject:
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message="Email subject is required",
            )

        try:
            import aiosmtplib

            msg = MIMEMultipart("mixed")

            # Build HTML body
            html_body = self._build_html_body(message)
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            # Add attachments if provided
            if message.attachments:
                for attachment_url in message.attachments:
                    await self._attach_from_url(msg, attachment_url)

            msg["Subject"] = message.subject
            msg["From"] = self.smtp_from
            msg["To"] = message.to

            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=False,
                start_tls=self.smtp_starttls,
                username=self.smtp_user or None,
                password=self.smtp_password or None,
            )

            logger.info(f"Email sent to {message.to}")
            return NotificationResult(
                success=True,
                channel=self.name,
            )

        except Exception as e:
            logger.error(f"Email send failed: {e}")
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message=str(e),
            )

    async def send_with_pdf(
        self,
        to_email: str,
        subject: str,
        body: str,
        pdf_bytes: bytes,
        pdf_filename: str = "document.pdf",
    ) -> NotificationResult:
        """Send an email with a PDF attachment.

        Args:
            to_email: Recipient email
            subject: Email subject
            body: HTML body
            pdf_bytes: PDF content as bytes
            pdf_filename: Name for the PDF attachment

        Returns:
            NotificationResult with send status
        """
        message = NotificationMessage(
            to=to_email,
            subject=subject,
            body=body,
        )

        if not self.is_available:
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message="Email channel not configured",
            )

        try:
            import aiosmtplib

            msg = MIMEMultipart("mixed")

            # Build HTML body
            html_body = self._build_html_body(message)
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            # Attach PDF
            attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
            attachment.add_header(
                "Content-Disposition",
                "attachment",
                filename=pdf_filename,
            )
            msg.attach(attachment)

            msg["Subject"] = subject
            msg["From"] = self.smtp_from
            msg["To"] = to_email

            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=False,
                start_tls=self.smtp_starttls,
                username=self.smtp_user or None,
                password=self.smtp_password or None,
            )

            logger.info(f"Email with PDF sent to {to_email}")
            return NotificationResult(
                success=True,
                channel=self.name,
            )

        except Exception as e:
            logger.error(f"Email send failed: {e}")
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message=str(e),
            )

    async def send_template_email(
        self,
        to_email: str,
        template_name: str,
        context: dict,
        subject: Optional[str] = None,
    ) -> NotificationResult:
        """Send an email using a template.

        Templates are simple string templates with {{placeholder}} syntax.

        Args:
            to_email: Recipient email
            template_name: Template identifier
            context: Template context variables
            subject: Email subject (can use template)

        Returns:
            NotificationResult with send status
        """
        # Get template content (in production, load from DB or files)
        template = self._get_template(template_name)
        if not template:
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message=f"Template not found: {template_name}",
            )

        # Render template
        try:
            body = self._render_template(template["body"], context)
            rendered_subject = subject or self._render_template(
                template.get("subject", ""), context
            )
        except Exception as e:
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message=f"Template rendering failed: {e}",
            )

        message = NotificationMessage(
            to=to_email,
            subject=rendered_subject,
            body=body,
        )

        return await self.send(message)

    def _build_html_body(self, message: NotificationMessage) -> str:
        """Build HTML email body with styling.

        Args:
            message: Notification message

        Returns:
            Styled HTML body
        """
        # Check if body is already HTML
        body = message.body
        if not body.startswith("<"):
            # Convert plain text to HTML
            body = f"<p>{body}</p>"

        # Wrap in styled container
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 20px;">
                    <h1 style="color: #1a56db; margin: 0; font-size: 24px;">SAVANA</h1>
                </div>
                <div style="line-height: 1.6;">
                    {body}
                </div>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
                    </p>
                    <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0;">
                        — L'équipe SAVANA
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    async def _attach_from_url(
        self,
        msg: MIMEMultipart,
        url: str,
    ) -> None:
        """Attach a file from URL.

        Args:
            msg: Email message to attach to
            url: URL of the file to attach
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status == 200:
                        content = await resp.read()

                        # Determine filename from URL
                        filename = url.split("/")[-1]
                        if not filename or "." not in filename:
                            filename = "attachment.pdf"

                        # Determine content type
                        content_type = "application/pdf"
                        if filename.endswith(".png"):
                            content_type = "image/png"
                        elif filename.endswith(".jpg") or filename.endswith(".jpeg"):
                            content_type = "image/jpeg"

                        attachment = MIMEApplication(content, _subtype=content_type.split("/")[1])
                        attachment.add_header(
                            "Content-Disposition",
                            "attachment",
                            filename=filename,
                        )
                        msg.attach(attachment)

        except Exception as e:
            logger.warning(f"Failed to attach file from URL {url}: {e}")

    def _get_template(self, template_name: str) -> Optional[dict]:
        """Get email template by name.

        In production, this would load from database or template files.

        Args:
            template_name: Template identifier

        Returns:
            Template dict with subject and body, or None
        """
        # Built-in templates
        templates = {
            "invoice_sent": {
                "subject": "Votre facture {{invoice_number}}",
                "body": """
                    <p>Bonjour {{customer_name}},</p>
                    <p>Veuillez trouver ci-joint votre facture <strong>{{invoice_number}}</strong>.</p>
                    <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 18px;">
                            Montant total : <strong style="color: #1a56db;">{{amount}} {{currency}}</strong>
                        </p>
                    </div>
                    <p>Pour toute question, contactez-nous à {{support_email}}.</p>
                """,
            },
            "payment_received": {
                "subject": "Confirmation de paiement - {{invoice_number}}",
                "body": """
                    <p>Bonjour {{customer_name}},</p>
                    <p>Nous avons bien reçu votre paiement de <strong>{{amount}} {{currency}}</strong> pour la facture {{invoice_number}}.</p>
                    <p>Merci pour votre confiance !</p>
                """,
            },
            "payment_reminder": {
                "subject": "Rappel : Facture {{invoice_number}} en attente",
                "body": """
                    <p>Bonjour {{customer_name}},</p>
                    <p>Nous vous rappelons que la facture <strong>{{invoice_number}}</strong> de <strong>{{amount}} {{currency}}</strong> est en attente de paiement.</p>
                    <p>Échéance : {{due_date}}</p>
                    <p>Merci de régulariser votre situation dans les meilleurs délais.</p>
                """,
            },
            "quote_sent": {
                "subject": "Votre devis {{quote_number}}",
                "body": """
                    <p>Bonjour {{customer_name}},</p>
                    <p>Veuillez trouver ci-joint votre devis <strong>{{quote_number}}</strong>.</p>
                    <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 18px;">
                            Montant : <strong style="color: #1a56db;">{{amount}} {{currency}}</strong>
                        </p>
                    </div>
                    <p>Ce devis est valable jusqu'au {{expiry_date}}.</p>
                """,
            },
        }

        return templates.get(template_name)

    def _render_template(self, template: str, context: dict) -> str:
        """Render a template string with context variables.

        Uses simple {{variable}} syntax.

        Args:
            template: Template string with {{placeholder}} syntax
            context: Dict of variable values

        Returns:
            Rendered string
        """
        result = template
        for key, value in context.items():
            result = result.replace("{{" + key + "}}", str(value))
        return result
