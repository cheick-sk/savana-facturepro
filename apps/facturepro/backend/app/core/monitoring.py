"""Sentry monitoring integration for Africa SaaS platform.
Error tracking, performance monitoring, and release tracking.
"""
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk import capture_exception, capture_message, set_context, set_tag, set_user
import logging
from typing import Optional
from functools import wraps

from app.core.config import settings


def init_sentry():
    """Initialize Sentry SDK with all integrations."""
    
    if not settings.SENTRY_DSN:
        print("Sentry DSN not configured, skipping initialization")
        return
    
    # Configure logging integration
    logging_integration = LoggingIntegration(
        level=logging.INFO,        # Capture info and above as breadcrumbs
        event_level=logging.ERROR  # Send errors as events
    )
    
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT or "development",
        release=f"facturepro@{settings.APP_VERSION if hasattr(settings, 'APP_VERSION') else '1.0.0'}",
        
        # Performance monitoring
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=0.1,  # Profile 10% of transactions
        
        # Integrations
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
            logging_integration,
        ],
        
        # Error sampling
        sample_rate=1.0,  # Capture all errors
        
        # Attach stack traces
        attach_stacktrace=True,
        
        # Send default PII
        send_default_pii=False,  # Privacy: don't send user data by default
        
        # Before send hook
        before_send=before_send_handler,
        
        # Ignore specific errors
        ignore_errors=[
            KeyboardInterrupt,
            SystemExit,
        ],
    )
    
    # Set common tags
    set_tag("app_name", settings.APP_NAME)
    set_tag("app_env", settings.APP_ENV)


def before_send_handler(event, hint):
    """Process events before sending to Sentry.
    
    This allows us to:
    - Filter out sensitive data
    - Add additional context
    - Skip certain events
    """
    # Don't send health check errors
    if event.get("request", {}).get("url", "").endswith("/health"):
        return None
    
    # Don't send favicon errors
    if event.get("request", {}).get("url", "").endswith("/favicon.ico"):
        return None
    
    # Scrub sensitive headers
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        sensitive_headers = ["authorization", "cookie", "set-cookie", "x-api-key"]
        for header in sensitive_headers:
            if header in headers:
                headers[header] = "[Filtered]"
    
    # Scrub sensitive body fields
    if "request" in event and "data" in event["request"]:
        sensitive_fields = ["password", "token", "secret", "api_key", "credit_card"]
        data = event["request"]["data"]
        if isinstance(data, dict):
            for field in sensitive_fields:
                if field in data:
                    data[field] = "[Filtered]"
    
    return event


def set_user_context(
    user_id: int,
    email: str,
    organisation_id: int = None,
    role: str = None
):
    """Set user context for Sentry events.
    
    Args:
        user_id: User ID
        email: User email
        organisation_id: Organisation ID (for multi-tenant)
        role: User role
    """
    set_user({
        "id": str(user_id),
        "email": email,
        "organisation_id": str(organisation_id) if organisation_id else None,
        "role": role,
    })


def set_organisation_context(organisation_id: int, organisation_name: str, plan: str):
    """Set organisation context for multi-tenant tracking.
    
    Args:
        organisation_id: Organisation ID
        organisation_name: Organisation name
        plan: Subscription plan
    """
    set_context("organisation", {
        "id": organisation_id,
        "name": organisation_name,
        "plan": plan,
    })
    set_tag("organisation_id", str(organisation_id))
    set_tag("plan", plan)


def capture_error(
    error: Exception,
    context: dict = None,
    tags: dict = None,
    level: str = "error"
):
    """Capture an error with additional context.
    
    Args:
        error: The exception to capture
        context: Additional context data
        tags: Additional tags
        level: Error level (debug, info, warning, error, fatal)
    """
    if context:
        set_context("additional_context", context)
    
    if tags:
        for key, value in tags.items():
            set_tag(key, value)
    
    with sentry_sdk.push_scope() as scope:
        scope.level = level
        capture_exception(error)


def capture_custom_message(
    message: str,
    level: str = "info",
    context: dict = None,
    tags: dict = None
):
    """Capture a custom message.
    
    Args:
        message: The message to capture
        level: Message level
        context: Additional context
        tags: Additional tags
    """
    if context:
        set_context("additional_context", context)
    
    if tags:
        for key, value in tags.items():
            set_tag(key, value)
    
    capture_message(message, level=level)


def track_performance(operation_name: str):
    """Decorator to track performance of a function.
    
    Usage:
        @track_performance("create_invoice")
        async def create_invoice(...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            with sentry_sdk.start_span(op=operation_name, description=func.__name__):
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            with sentry_sdk.start_span(op=operation_name, description=func.__name__):
                return func(*args, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


class SentryTransactionMiddleware:
    """Middleware to create Sentry transactions for each request."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if not settings.SENTRY_DSN:
            await self.app(scope, receive, send)
            return
        
        # Start a transaction
        with sentry_sdk.start_transaction(
            op="http.server",
            name=f"{scope.get('method', 'GET')} {scope.get('path', '/')}",
        ) as transaction:
            # Set transaction data
            transaction.set_tag("http.method", scope.get("method", "GET"))
            transaction.set_tag("http.path", scope.get("path", "/"))
            
            # Continue with request
            await self.app(scope, receive, send)


# Payment-specific error tracking
def track_payment_error(
    provider: str,
    error: Exception,
    amount: float,
    currency: str,
    phone: str = None,
    organisation_id: int = None
):
    """Track payment-related errors with specific context.
    
    Args:
        provider: Payment provider name
        error: The exception
        amount: Payment amount
        currency: Currency code
        phone: Phone number (masked)
        organisation_id: Organisation ID
    """
    set_context("payment", {
        "provider": provider,
        "amount": amount,
        "currency": currency,
        "phone": mask_phone(phone) if phone else None,
        "organisation_id": organisation_id,
    })
    
    set_tag("payment_provider", provider)
    set_tag("currency", currency)
    
    capture_exception(error)


def mask_phone(phone: str) -> str:
    """Mask phone number for privacy."""
    if not phone or len(phone) < 6:
        return phone
    return phone[:3] + "****" + phone[-3:]


# Celery task error tracking
def track_celery_error(
    task_name: str,
    error: Exception,
    task_id: str = None,
    args: tuple = None,
    kwargs: dict = None
):
    """Track Celery task errors.
    
    Args:
        task_name: Name of the failed task
        error: The exception
        task_id: Celery task ID
        args: Task arguments (will be filtered)
        kwargs: Task keyword arguments (will be filtered)
    """
    set_context("celery_task", {
        "task_name": task_name,
        "task_id": task_id,
    })
    
    set_tag("celery_task", task_name)
    
    capture_exception(error)
