"""Email Template Service using Jinja2.

Provides professional email templates with multi-language support for:
- French (fr) - Default
- English (en)
- Wolof (wo) - West Africa
- Swahili (sw) - East Africa

Template types:
- invoice: Invoice sent to customer
- welcome: New user welcome
- password_reset: Password reset request
- payment_reminder: Payment due reminder
- payment_confirmation: Payment received confirmation
- quote: Quote/estimate sent
- email_verification: Email address verification
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

from jinja2 import Environment, FileSystemLoader, Template, select_autoescape

logger = logging.getLogger(__name__)

# Template directory path
TEMPLATE_DIR = Path(__file__).parent / "email_templates"

# Supported languages
SUPPORTED_LANGUAGES = ["fr", "en", "wo", "sw"]
DEFAULT_LANGUAGE = "fr"


class EmailTemplateService:
    """Service for rendering email templates with Jinja2."""

    def __init__(self, template_dir: Optional[Path] = None, default_lang: str = DEFAULT_LANGUAGE):
        """Initialize the template service.

        Args:
            template_dir: Custom template directory path
            default_lang: Default language for templates
        """
        self.template_dir = template_dir or TEMPLATE_DIR
        self.default_lang = default_lang
        self._env_cache: Dict[str, Environment] = {}

    def _get_environment(self, lang: str) -> Environment:
        """Get or create Jinja2 environment for a language.

        Args:
            lang: Language code (fr, en, wo, sw)

        Returns:
            Configured Jinja2 Environment
        """
        if lang not in SUPPORTED_LANGUAGES:
            lang = self.default_lang

        if lang not in self._env_cache:
            template_path = self.template_dir / "templates" / lang

            # Fall back to default language if template dir doesn't exist
            if not template_path.exists():
                template_path = self.template_dir / "templates" / self.default_lang

            # Create environment with multiple loaders for inheritance
            loaders = [
                FileSystemLoader(str(template_path)),  # Language-specific templates
                FileSystemLoader(str(self.template_dir)),  # Layouts and partials
            ]

            self._env_cache[lang] = Environment(
                loader=FileSystemLoader([
                    str(self.template_dir),
                    str(template_path),
                ]),
                autoescape=select_autoescape(["html", "xml"]),
                trim_blocks=True,
                lstrip_blocks=True,
            )

        return self._env_cache[lang]

    def render_template(
        self,
        template_name: str,
        context: Dict[str, Any],
        lang: str = DEFAULT_LANGUAGE,
    ) -> str:
        """Render an email template with context.

        Args:
            template_name: Template name without extension (e.g., 'invoice', 'welcome')
            context: Dictionary of template variables
            lang: Language code for template

        Returns:
            Rendered HTML string

        Raises:
            TemplateNotFound: If template doesn't exist
        """
        env = self._get_environment(lang)

        # Add language to context
        context = {**context, "lang": lang}

        # Load and render template
        template = env.get_template(f"{template_name}.html")
        return template.render(**context)

    def render_invoice_email(
        self,
        customer_name: str,
        invoice_number: str,
        amount: float,
        currency: str = "XOF",
        invoice_date: Optional[str] = None,
        due_date: Optional[str] = None,
        payment_link: Optional[str] = None,
        items: Optional[list] = None,
        support_email: Optional[str] = None,
        lang: str = DEFAULT_LANGUAGE,
        **kwargs,
    ) -> str:
        """Render an invoice email template.

        Args:
            customer_name: Customer's name
            invoice_number: Invoice reference number
            amount: Total invoice amount
            currency: Currency code (XOF, USD, EUR, etc.)
            invoice_date: Invoice issue date
            due_date: Payment due date
            payment_link: URL for online payment
            items: List of invoice line items
            support_email: Support contact email
            lang: Template language
            **kwargs: Additional context variables

        Returns:
            Rendered HTML email
        """
        context = {
            "customer_name": customer_name,
            "invoice_number": invoice_number,
            "amount": f"{amount:,.2f}",
            "currency": currency,
            "invoice_date": invoice_date,
            "due_date": due_date,
            "payment_link": payment_link,
            "items": items,
            "support_email": support_email,
            "subject": f"Facture {invoice_number}",
            **kwargs,
        }
        return self.render_template("invoice", context, lang)

    def render_welcome_email(
        self,
        user_name: str,
        app_name: str = "SAVANA",
        verify_url: Optional[str] = None,
        login_url: Optional[str] = None,
        support_email: Optional[str] = None,
        lang: str = DEFAULT_LANGUAGE,
        **kwargs,
    ) -> str:
        """Render a welcome email template.

        Args:
            user_name: New user's name
            app_name: Application name
            verify_url: Email verification URL
            login_url: Login page URL
            support_email: Support contact email
            lang: Template language
            **kwargs: Additional context variables

        Returns:
            Rendered HTML email
        """
        context = {
            "user_name": user_name,
            "app_name": app_name,
            "verify_url": verify_url,
            "login_url": login_url,
            "support_email": support_email,
            "subject": f"Bienvenue sur {app_name}!",
            **kwargs,
        }
        return self.render_template("welcome", context, lang)

    def render_password_reset_email(
        self,
        user_name: str,
        reset_url: str,
        expiry_hours: int = 24,
        support_email: Optional[str] = None,
        lang: str = DEFAULT_LANGUAGE,
        **kwargs,
    ) -> str:
        """Render a password reset email template.

        Args:
            user_name: User's name
            reset_url: Password reset URL
            expiry_hours: Hours until link expires
            support_email: Support contact email
            lang: Template language
            **kwargs: Additional context variables

        Returns:
            Rendered HTML email
        """
        context = {
            "user_name": user_name,
            "reset_url": reset_url,
            "expiry_hours": expiry_hours,
            "support_email": support_email,
            "subject": "Réinitialisation de votre mot de passe",
            **kwargs,
        }
        return self.render_template("password_reset", context, lang)

    def render_payment_reminder_email(
        self,
        customer_name: str,
        invoice_number: str,
        amount: float,
        currency: str = "XOF",
        invoice_date: Optional[str] = None,
        due_date: Optional[str] = None,
        is_overdue: bool = False,
        days_overdue: int = 0,
        late_fee: Optional[float] = None,
        payment_link: Optional[str] = None,
        company_name: Optional[str] = None,
        support_email: Optional[str] = None,
        lang: str = DEFAULT_LANGUAGE,
        **kwargs,
    ) -> str:
        """Render a payment reminder email template.

        Args:
            customer_name: Customer's name
            invoice_number: Invoice reference number
            amount: Amount due
            currency: Currency code
            invoice_date: Invoice issue date
            due_date: Payment due date
            is_overdue: Whether payment is overdue
            days_overdue: Number of days overdue
            late_fee: Late payment fee
            payment_link: URL for online payment
            company_name: Sender company name
            support_email: Support contact email
            lang: Template language
            **kwargs: Additional context variables

        Returns:
            Rendered HTML email
        """
        context = {
            "customer_name": customer_name,
            "invoice_number": invoice_number,
            "amount": f"{amount:,.2f}",
            "currency": currency,
            "invoice_date": invoice_date,
            "due_date": due_date,
            "is_overdue": is_overdue,
            "days_overdue": days_overdue,
            "late_fee": f"{late_fee:,.2f}" if late_fee else None,
            "payment_link": payment_link,
            "company_name": company_name,
            "support_email": support_email,
            "subject": f"Rappel : Facture {invoice_number}",
            **kwargs,
        }
        return self.render_template("payment_reminder", context, lang)

    def render_payment_confirmation_email(
        self,
        customer_name: str,
        invoice_number: str,
        amount: float,
        currency: str = "XOF",
        payment_date: Optional[str] = None,
        payment_method: Optional[str] = None,
        transaction_id: Optional[str] = None,
        receipt_url: Optional[str] = None,
        support_email: Optional[str] = None,
        lang: str = DEFAULT_LANGUAGE,
        **kwargs,
    ) -> str:
        """Render a payment confirmation email template.

        Args:
            customer_name: Customer's name
            invoice_number: Invoice reference number
            amount: Amount paid
            currency: Currency code
            payment_date: Date of payment
            payment_method: Payment method used
            transaction_id: Transaction reference
            receipt_url: URL to download receipt
            support_email: Support contact email
            lang: Template language
            **kwargs: Additional context variables

        Returns:
            Rendered HTML email
        """
        context = {
            "customer_name": customer_name,
            "invoice_number": invoice_number,
            "amount": f"{amount:,.2f}",
            "currency": currency,
            "payment_date": payment_date,
            "payment_method": payment_method,
            "transaction_id": transaction_id,
            "receipt_url": receipt_url,
            "support_email": support_email,
            "subject": f"Confirmation de paiement - {invoice_number}",
            **kwargs,
        }
        return self.render_template("payment_confirmation", context, lang)

    def render_quote_email(
        self,
        customer_name: str,
        quote_number: str,
        amount: float,
        currency: str = "XOF",
        quote_date: Optional[str] = None,
        expiry_date: Optional[str] = None,
        items: Optional[list] = None,
        accept_url: Optional[str] = None,
        reject_url: Optional[str] = None,
        notes: Optional[str] = None,
        company_name: Optional[str] = None,
        support_email: Optional[str] = None,
        lang: str = DEFAULT_LANGUAGE,
        **kwargs,
    ) -> str:
        """Render a quote/estimate email template.

        Args:
            customer_name: Customer's name
            quote_number: Quote reference number
            amount: Quote total amount
            currency: Currency code
            quote_date: Quote issue date
            expiry_date: Quote validity expiry date
            items: List of quote line items
            accept_url: URL to accept quote
            reject_url: URL to reject quote
            notes: Additional notes
            company_name: Sender company name
            support_email: Support contact email
            lang: Template language
            **kwargs: Additional context variables

        Returns:
            Rendered HTML email
        """
        context = {
            "customer_name": customer_name,
            "quote_number": quote_number,
            "amount": f"{amount:,.2f}",
            "currency": currency,
            "quote_date": quote_date,
            "expiry_date": expiry_date,
            "items": items,
            "accept_url": accept_url,
            "reject_url": reject_url,
            "notes": notes,
            "company_name": company_name,
            "support_email": support_email,
            "subject": f"Votre devis {quote_number}",
            **kwargs,
        }
        return self.render_template("quote", context, lang)

    def render_email_verification_email(
        self,
        user_name: str,
        verify_url: str,
        verification_code: Optional[str] = None,
        expiry_minutes: int = 10,
        app_name: str = "SAVANA",
        support_email: Optional[str] = None,
        lang: str = DEFAULT_LANGUAGE,
        **kwargs,
    ) -> str:
        """Render an email verification template.

        Args:
            user_name: User's name
            verify_url: Verification URL
            verification_code: Optional verification code
            expiry_minutes: Minutes until code expires
            app_name: Application name
            support_email: Support contact email
            lang: Template language
            **kwargs: Additional context variables

        Returns:
            Rendered HTML email
        """
        context = {
            "user_name": user_name,
            "verify_url": verify_url,
            "verification_code": verification_code,
            "expiry_minutes": expiry_minutes,
            "app_name": app_name,
            "support_email": support_email,
            "subject": "Vérifiez votre email",
            **kwargs,
        }
        return self.render_template("email_verification", context, lang)


# Singleton instance
_template_service: Optional[EmailTemplateService] = None


def get_template_service() -> EmailTemplateService:
    """Get the global template service instance.

    Returns:
        EmailTemplateService singleton
    """
    global _template_service
    if _template_service is None:
        _template_service = EmailTemplateService()
    return _template_service
