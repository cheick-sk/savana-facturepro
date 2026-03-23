"""
Sync tasks for SavanaFlow POS
"""
from app.celery_app import celery_app


@celery_app.task(name="app.tasks.sync.sync_offline_sales")
def sync_offline_sales():
    """Sync offline sales to server"""
    # TODO: Implement offline sales sync logic
    return {"status": "completed", "message": "Offline sales synced"}
