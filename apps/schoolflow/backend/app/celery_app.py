"""
Celery configuration for SchoolFlow Africa
Handles asynchronous tasks for fees, reports, and notifications.
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "schoolflow_africa",
    broker=settings.CELERY_BROKER,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.fees",
        "app.tasks.reports",
        "app.tasks.notifications",
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
        # Send fee reminders daily at 8:00 UTC
        "send-fee-reminders": {
            "task": "app.tasks.fees.send_fee_reminders",
            "schedule": crontab(hour=8, minute=0),
        },
        # Generate fee invoices on the 1st of each month
        "generate-fee-invoices": {
            "task": "app.tasks.fees.generate_fee_invoices",
            "schedule": crontab(day_of_month=1, hour=1, minute=0),
        },
        # Generate term reports weekly on Monday at 6:00 UTC
        "generate-term-reports": {
            "task": "app.tasks.reports.generate_term_reports",
            "schedule": crontab(day_of_week=1, hour=6, minute=0),
        },
    },
)
