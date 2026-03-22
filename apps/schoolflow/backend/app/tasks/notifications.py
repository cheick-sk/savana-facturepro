"""
Notification tasks for SchoolFlow Africa
"""
from app.celery_app import celery_app


@celery_app.task(name="app.tasks.notifications.send_notification")
def send_notification(user_id: int, message: str):
    """Send notification to user"""
    # TODO: Implement notification logic
    return {"status": "completed", "message": f"Notification sent to user {user_id}"}
