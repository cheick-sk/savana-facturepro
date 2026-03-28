"""Notification tasks for SchoolFlow Africa."""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name="app.tasks.notifications.send_bulk_notifications")
def send_bulk_notifications():
    """Send bulk notifications to parents."""
    logger.info("Sending bulk notifications...")
    # TODO: Implement bulk notification logic
    return {"status": "completed", "notifications_sent": 0}
