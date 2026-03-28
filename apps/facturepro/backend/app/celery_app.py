"""Celery application configuration for FacturePro.
Handles: recurring invoices, payment reminders, quota resets, notifications, webhooks.
"""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "facturepro",
    broker=settings.CELERY_BROKER or "redis://localhost:6379/0",
    backend=settings.REDIS_URL or "redis://localhost:6379/0",
    include=[
        "app.tasks.invoices",
        "app.tasks.tenant",
        "app.tasks.notifications",
        "app.tasks.webhooks",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Abidjan",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max per task
    task_soft_time_limit=25 * 60,  # Soft limit at 25 minutes
    worker_prefetch_multiplier=1,  # Only fetch one task at a time
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks
    
    # Beat schedule for periodic tasks
    beat_schedule={
        # Process recurring invoices daily at 6 AM UTC
        "process-recurring-invoices": {
            "task": "app.tasks.invoices.process_recurring_invoices",
            "schedule": crontab(hour=6, minute=0),
            "options": {"queue": "invoices"},
        },
        
        # Send payment reminders at 9 AM UTC
        "send-payment-reminders": {
            "task": "app.tasks.invoices.send_payment_reminders",
            "schedule": crontab(hour=9, minute=0),
            "options": {"queue": "notifications"},
        },
        
        # Reset monthly quotas on 1st of each month
        "reset-monthly-quotas": {
            "task": "app.tasks.tenant.reset_monthly_quotas",
            "schedule": crontab(day_of_month=1, hour=0, minute=0),
            "options": {"queue": "tenant"},
        },
        
        # Check subscription expiry daily
        "check-subscription-expiry": {
            "task": "app.tasks.tenant.check_subscription_expiry",
            "schedule": crontab(hour=0, minute=30),
            "options": {"queue": "tenant"},
        },
        
        # Cleanup old audit logs weekly
        "cleanup-audit-logs": {
            "task": "app.tasks.tenant.cleanup_audit_logs",
            "schedule": crontab(day_of_week=0, hour=2, minute=0),  # Sunday 2 AM
            "options": {"queue": "maintenance"},
        },
        
        # Retry failed webhooks every minute
        "retry-failed-webhooks": {
            "task": "app.tasks.webhooks.retry_failed_webhooks",
            "schedule": crontab(minute="*"),  # Every minute
            "options": {"queue": "webhooks"},
        },
        
        # Cleanup old webhook events weekly (Sunday 3 AM)
        "cleanup-old-webhook-events": {
            "task": "app.tasks.webhooks.cleanup_old_webhook_events",
            "schedule": crontab(day_of_week=0, hour=3, minute=0),
            "options": {"queue": "maintenance"},
        },
        
        # Send webhook summary daily at 8 AM UTC
        "send-webhook-summary": {
            "task": "app.tasks.webhooks.send_webhook_summary",
            "schedule": crontab(hour=8, minute=0),
            "options": {"queue": "notifications"},
        },
    },
    
    # Task routing
    task_routes={
        "app.tasks.invoices.*": {"queue": "invoices"},
        "app.tasks.tenant.*": {"queue": "tenant"},
        "app.tasks.notifications.*": {"queue": "notifications"},
        "app.tasks.webhooks.*": {"queue": "webhooks"},
    },
    
    # Task default queue
    task_default_queue="default",
)
