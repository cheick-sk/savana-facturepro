"""
Celery configuration for SavanaFlow POS
Handles asynchronous tasks for inventory, sales, and reporting.
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "savanaflow_pos",
    broker=settings.CELERY_BROKER,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.inventory",
        "app.tasks.reports",
        "app.tasks.sync",
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
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
    beat_schedule={
        # Check low stock every 12 hours
        "check-low-stock": {
            "task": "app.tasks.inventory.check_low_stock",
            "schedule": crontab(hour="*/12"),
        },
        # Auto close shifts at midnight
        "auto-close-shifts": {
            "task": "app.tasks.inventory.auto_close_shifts",
            "schedule": crontab(hour=0, minute=0),
        },
        # Generate daily sales report at 6:00 UTC
        "generate-daily-sales-report": {
            "task": "app.tasks.reports.generate_daily_sales_report",
            "schedule": crontab(hour=6, minute=0),
        },
        # Sync offline sales every 5 minutes
        "sync-offline-sales": {
            "task": "app.tasks.sync.sync_offline_sales",
            "schedule": crontab(minute="*/5"),
        },
    },
)
