"""Prometheus metrics module for FacturePro Africa.

This module provides comprehensive metrics for monitoring:
- Business metrics (invoices, payments, revenue)
- System metrics (HTTP requests, active users, database connections)
- Subscription metrics (active subscriptions by plan)

Usage:
    from app.core.metrics import (
        INVOICES_CREATED,
        PAYMENTS_RECEIVED,
        track_request_duration,
        increment_active_users,
        set_database_connections,
    )
    
    # Track business events
    INVOICES_CREATED.labels(organisation_id='123', status='draft').inc()
    PAYMENTS_RECEIVED.labels(organisation_id='123', payment_method='mpesa', currency='KES').inc()
"""
from __future__ import annotations

import time
from typing import Callable
from functools import wraps

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Info,
    CollectorRegistry,
    REGISTRY,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp


# ─────────────────────────────────────────────────────────────────────────────
# BUSINESS METRICS
# ─────────────────────────────────────────────────────────────────────────────

# Invoice metrics
INVOICES_CREATED = Counter(
    'facturepro_invoices_created_total',
    'Total number of invoices created',
    ['organisation_id', 'status'],
    registry=REGISTRY,
)

INVOICES_SENT = Counter(
    'facturepro_invoices_sent_total',
    'Total number of invoices sent to customers',
    ['organisation_id', 'channel'],  # channel: email, whatsapp, sms
    registry=REGISTRY,
)

INVOICES_PAID = Counter(
    'facturepro_invoices_paid_total',
    'Total number of invoices fully paid',
    ['organisation_id'],
    registry=REGISTRY,
)

INVOICES_OVERDUE = Gauge(
    'facturepro_invoices_overdue',
    'Current number of overdue invoices',
    ['organisation_id'],
    registry=REGISTRY,
)

INVOICE_AMOUNT = Histogram(
    'facturepro_invoice_amount',
    'Distribution of invoice amounts',
    ['organisation_id', 'currency'],
    buckets=[100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
    registry=REGISTRY,
)

# Payment metrics
PAYMENTS_RECEIVED = Counter(
    'facturepro_payments_received_total',
    'Total number of payments received',
    ['organisation_id', 'payment_method', 'currency'],
    registry=REGISTRY,
)

PAYMENT_AMOUNT = Histogram(
    'facturepro_payment_amount',
    'Distribution of payment amounts',
    ['organisation_id', 'currency', 'payment_method'],
    buckets=[100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
    registry=REGISTRY,
)

PAYMENT_FAILURES = Counter(
    'facturepro_payment_failures_total',
    'Total number of failed payment attempts',
    ['organisation_id', 'payment_method', 'error_type'],
    registry=REGISTRY,
)

# Revenue metrics
REVENUE_TOTAL = Counter(
    'facturepro_revenue_total',
    'Total revenue in smallest currency unit (e.g., cents)',
    ['organisation_id', 'currency'],
    registry=REGISTRY,
)

REVENUE_PENDING = Gauge(
    'facturepro_revenue_pending',
    'Total pending revenue (unpaid invoices)',
    ['organisation_id', 'currency'],
    registry=REGISTRY,
)

# Customer metrics
CUSTOMERS_TOTAL = Gauge(
    'facturepro_customers_total',
    'Total number of customers',
    ['organisation_id'],
    registry=REGISTRY,
)

CUSTOMERS_ACTIVE = Gauge(
    'facturepro_customers_active',
    'Number of active customers (with recent activity)',
    ['organisation_id'],
    registry=REGISTRY,
)

# Quote metrics
QUOTES_CREATED = Counter(
    'facturepro_quotes_created_total',
    'Total number of quotes created',
    ['organisation_id', 'status'],
    registry=REGISTRY,
)

QUOTES_CONVERTED = Counter(
    'facturepro_quotes_converted_total',
    'Total number of quotes converted to invoices',
    ['organisation_id'],
    registry=REGISTRY,
)


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM METRICS
# ─────────────────────────────────────────────────────────────────────────────

# HTTP request metrics
REQUEST_DURATION = Histogram(
    'facturepro_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint', 'status_code'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    registry=REGISTRY,
)

REQUEST_COUNT = Counter(
    'facturepro_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code'],
    registry=REGISTRY,
)

REQUEST_SIZE = Histogram(
    'facturepro_http_request_size_bytes',
    'HTTP request size in bytes',
    ['method', 'endpoint'],
    buckets=[100, 500, 1000, 5000, 10000, 50000, 100000],
    registry=REGISTRY,
)

RESPONSE_SIZE = Histogram(
    'facturepro_http_response_size_bytes',
    'HTTP response size in bytes',
    ['method', 'endpoint', 'status_code'],
    buckets=[100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
    registry=REGISTRY,
)

REQUESTS_IN_PROGRESS = Gauge(
    'facturepro_http_requests_in_progress',
    'Number of HTTP requests currently being processed',
    ['method', 'endpoint'],
    registry=REGISTRY,
)

# Active users
ACTIVE_USERS = Gauge(
    'facturepro_active_users',
    'Number of active users',
    ['application'],
    registry=REGISTRY,
)

ACTIVE_SESSIONS = Gauge(
    'facturepro_active_sessions',
    'Number of active user sessions',
    ['application'],
    registry=REGISTRY,
)

# Database metrics
DATABASE_CONNECTIONS = Gauge(
    'facturepro_database_connections',
    'Number of database connections',
    ['pool_status'],  # pool_status: idle, in_use, overflow
    registry=REGISTRY,
)

DATABASE_QUERY_DURATION = Histogram(
    'facturepro_database_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type', 'table'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
    registry=REGISTRY,
)

DATABASE_ERRORS = Counter(
    'facturepro_database_errors_total',
    'Total database errors',
    ['error_type', 'operation'],
    registry=REGISTRY,
)

# Cache (Redis) metrics
CACHE_OPERATIONS = Counter(
    'facturepro_cache_operations_total',
    'Total cache operations',
    ['operation', 'result'],  # operation: get, set, delete; result: hit, miss, error
    registry=REGISTRY,
)

CACHE_LATENCY = Histogram(
    'facturepro_cache_latency_seconds',
    'Cache operation latency',
    ['operation'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
    registry=REGISTRY,
)

# Celery task metrics
CELERY_TASKS_TOTAL = Counter(
    'facturepro_celery_tasks_total',
    'Total Celery tasks processed',
    ['task_name', 'status'],  # status: success, failure, retry
    registry=REGISTRY,
)

CELERY_TASK_DURATION = Histogram(
    'facturepro_celery_task_duration_seconds',
    'Celery task duration in seconds',
    ['task_name'],
    buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0],
    registry=REGISTRY,
)

CELERY_QUEUE_LENGTH = Gauge(
    'facturepro_celery_queue_length',
    'Number of tasks waiting in Celery queue',
    ['queue_name'],
    registry=REGISTRY,
)


# ─────────────────────────────────────────────────────────────────────────────
# SUBSCRIPTION METRICS
# ─────────────────────────────────────────────────────────────────────────────

ACTIVE_SUBSCRIPTIONS = Gauge(
    'facturepro_active_subscriptions',
    'Number of active subscriptions by plan',
    ['plan'],
    registry=REGISTRY,
)

SUBSCRIPTION_REVENUE = Gauge(
    'facturepro_subscription_revenue',
    'Monthly recurring revenue by plan',
    ['plan', 'currency'],
    registry=REGISTRY,
)

SUBSCRIPTION_CHURNS = Counter(
    'facturepro_subscription_churns_total',
    'Total subscription cancellations',
    ['plan', 'reason'],
    registry=REGISTRY,
)

SUBSCRIPTION_SIGNUPS = Counter(
    'facturepro_subscription_signups_total',
    'Total new subscription signups',
    ['plan', 'source'],
    registry=REGISTRY,
)

TRIAL_CONVERSIONS = Counter(
    'facturepro_trial_conversions_total',
    'Total trial to paid conversions',
    ['plan'],
    registry=REGISTRY,
)


# ─────────────────────────────────────────────────────────────────────────────
# APPLICATION INFO
# ─────────────────────────────────────────────────────────────────────────────

APP_INFO = Info(
    'facturepro_app',
    'Application information',
    registry=REGISTRY,
)


def set_app_info(version: str, environment: str, commit: str = None):
    """Set application information metrics."""
    info = {
        'version': version,
        'environment': environment,
    }
    if commit:
        info['commit'] = commit
    APP_INFO.info(info)


# ─────────────────────────────────────────────────────────────────────────────
# PROMETHEUS MIDDLEWARE
# ─────────────────────────────────────────────────────────────────────────────

# Paths to exclude from metrics collection
EXCLUDED_PATHS = {
    '/metrics',
    '/health',
    '/docs',
    '/redoc',
    '/openapi.json',
    '/favicon.ico',
}


def normalize_path(path: str) -> str:
    """Normalize path for metrics grouping.
    
    Replaces dynamic path segments (IDs, UUIDs) with placeholders.
    """
    if not path:
        return '/'
    
    parts = path.split('/')
    normalized = []
    
    for part in parts:
        if not part:
            continue
        # Replace UUIDs
        if len(part) == 36 and part.count('-') == 4:
            normalized.append('{id}')
        # Replace numeric IDs
        elif part.isdigit():
            normalized.append('{id}')
        # Replace other likely IDs (alphanumeric, long)
        elif len(part) > 20 and part.isalnum():
            normalized.append('{id}')
        else:
            normalized.append(part)
    
    return '/' + '/'.join(normalized)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware to collect HTTP request metrics for Prometheus.
    
    Collects:
    - Request duration histogram
    - Request count
    - Request/response size
    - In-progress requests gauge
    
    Usage:
        app.add_middleware(PrometheusMiddleware)
    """
    
    def __init__(self, app: ASGIApp, app_name: str = 'facturepro'):
        super().__init__(app)
        self.app_name = app_name
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip excluded paths
        path = request.url.path
        if path in EXCLUDED_PATHS or path.startswith('/static'):
            return await call_next(request)
        
        # Normalize path for metrics
        normalized_path = normalize_path(path)
        method = request.method
        
        # Track in-progress requests
        REQUESTS_IN_PROGRESS.labels(method=method, endpoint=normalized_path).inc()
        
        # Record start time
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            
            # Record metrics
            duration = time.perf_counter() - start_time
            status_code = str(response.status_code)
            
            REQUEST_DURATION.labels(
                method=method,
                endpoint=normalized_path,
                status_code=status_code,
            ).observe(duration)
            
            REQUEST_COUNT.labels(
                method=method,
                endpoint=normalized_path,
                status_code=status_code,
            ).inc()
            
            # Record response size if available
            if hasattr(response, 'headers'):
                content_length = response.headers.get('content-length')
                if content_length:
                    try:
                        RESPONSE_SIZE.labels(
                            method=method,
                            endpoint=normalized_path,
                            status_code=status_code,
                        ).observe(float(content_length))
                    except ValueError:
                        pass
            
            return response
            
        except Exception as e:
            # Record error metrics
            duration = time.perf_counter() - start_time
            
            REQUEST_DURATION.labels(
                method=method,
                endpoint=normalized_path,
                status_code='500',
            ).observe(duration)
            
            REQUEST_COUNT.labels(
                method=method,
                endpoint=normalized_path,
                status_code='500',
            ).inc()
            
            raise
            
        finally:
            # Decrement in-progress counter
            REQUESTS_IN_PROGRESS.labels(method=method, endpoint=normalized_path).dec()


def metrics_endpoint():
    """Generate metrics response for Prometheus scraping.
    
    Returns:
        Response with Prometheus-formatted metrics.
    """
    return Response(
        content=generate_latest(REGISTRY),
        media_type=CONTENT_TYPE_LATEST,
    )


# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def track_invoice_created(organisation_id: str, status: str, amount: float, currency: str):
    """Track invoice creation metrics."""
    INVOICES_CREATED.labels(
        organisation_id=organisation_id,
        status=status,
    ).inc()
    
    INVOICE_AMOUNT.labels(
        organisation_id=organisation_id,
        currency=currency,
    ).observe(amount)


def track_payment_received(
    organisation_id: str,
    payment_method: str,
    currency: str,
    amount: float,
):
    """Track payment received metrics."""
    PAYMENTS_RECEIVED.labels(
        organisation_id=organisation_id,
        payment_method=payment_method,
        currency=currency,
    ).inc()
    
    PAYMENT_AMOUNT.labels(
        organisation_id=organisation_id,
        currency=currency,
        payment_method=payment_method,
    ).observe(amount)
    
    REVENUE_TOTAL.labels(
        organisation_id=organisation_id,
        currency=currency,
    ).inc(int(amount * 100))  # Convert to smallest unit


def track_payment_failure(
    organisation_id: str,
    payment_method: str,
    error_type: str,
):
    """Track payment failure metrics."""
    PAYMENT_FAILURES.labels(
        organisation_id=organisation_id,
        payment_method=payment_method,
        error_type=error_type,
    ).inc()


def track_database_query(query_type: str, table: str, duration: float):
    """Track database query duration."""
    DATABASE_QUERY_DURATION.labels(
        query_type=query_type,
        table=table,
    ).observe(duration)


def track_cache_operation(operation: str, result: str, duration: float = None):
    """Track cache operation metrics."""
    CACHE_OPERATIONS.labels(
        operation=operation,
        result=result,
    ).inc()
    
    if duration is not None:
        CACHE_LATENCY.labels(
            operation=operation,
        ).observe(duration)


def track_celery_task(task_name: str, status: str, duration: float = None):
    """Track Celery task metrics."""
    CELERY_TASKS_TOTAL.labels(
        task_name=task_name,
        status=status,
    ).inc()
    
    if duration is not None:
        CELERY_TASK_DURATION.labels(
            task_name=task_name,
        ).observe(duration)


def update_subscription_metrics(plan: str, count: int, mrr: float, currency: str):
    """Update subscription gauge metrics."""
    ACTIVE_SUBSCRIPTIONS.labels(plan=plan).set(count)
    SUBSCRIPTION_REVENUE.labels(plan=plan, currency=currency).set(mrr)


def set_active_users(count: int, application: str = 'facturepro'):
    """Set active users gauge."""
    ACTIVE_USERS.labels(application=application).set(count)


def set_database_connections(idle: int, in_use: int, overflow: int = 0):
    """Set database connection gauge metrics."""
    DATABASE_CONNECTIONS.labels(pool_status='idle').set(idle)
    DATABASE_CONNECTIONS.labels(pool_status='in_use').set(in_use)
    DATABASE_CONNECTIONS.labels(pool_status='overflow').set(overflow)


# ─────────────────────────────────────────────────────────────────────────────
# DECORATORS
# ─────────────────────────────────────────────────────────────────────────────

def track_performance(operation_name: str):
    """Decorator to track function performance.
    
    Usage:
        @track_performance('create_invoice')
        async def create_invoice(...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                duration = time.perf_counter() - start_time
                DATABASE_QUERY_DURATION.labels(
                    query_type=operation_name,
                    table='function',
                ).observe(duration)
                return result
            except Exception:
                DATABASE_ERRORS.labels(
                    error_type='exception',
                    operation=operation_name,
                ).inc()
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                duration = time.perf_counter() - start_time
                DATABASE_QUERY_DURATION.labels(
                    query_type=operation_name,
                    table='function',
                ).observe(duration)
                return result
            except Exception:
                DATABASE_ERRORS.labels(
                    error_type='exception',
                    operation=operation_name,
                ).inc()
                raise
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator
