"""Offline sync tasks for SavanaFlow POS."""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name="app.tasks.sync.sync_offline_sales")
def sync_offline_sales():
    """Sync offline sales to the server."""
    logger.info("Syncing offline sales...")
    # TODO: Implement offline sales sync logic
    return {"status": "completed", "synced": 0}
