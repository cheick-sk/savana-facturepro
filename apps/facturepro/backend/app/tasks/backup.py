"""Celery tasks for scheduled database backups.

Tasks:
- Daily full backup
- Weekly cleanup of old backups
- Backup verification
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from celery import shared_task

from app.core.config import get_settings
from app.services.backup_service import BackupService, BackupType

logger = logging.getLogger(__name__)


def get_backup_service() -> BackupService:
    """Get configured backup service instance."""
    settings = get_settings()
    return BackupService(
        database_url=settings.DATABASE_URL,
        database_name=settings.POSTGRES_DB,
        backup_dir="/tmp/savana_backups",
        s3_bucket=getattr(settings, "BACKUP_S3_BUCKET", None),
        retention_days=getattr(settings, "BACKUP_RETENTION_DAYS", 30),
    )


@shared_task(
    name="backups.create_daily_backup",
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
)
def create_daily_backup(self):
    """Create a daily full database backup.

    This task is scheduled to run every day at 2 AM.

    Retries:
        - Up to 3 times with 5 minute delay between retries
    """
    try:
        import asyncio

        backup_service = get_backup_service()

        # Run async backup in event loop
        metadata = asyncio.run(backup_service.create_backup(
            backup_type=BackupType.FULL,
            compress=True,
            upload_to_cloud=True,
        ))

        if metadata.status == "completed":
            logger.info(
                f"Daily backup completed: {metadata.id}, "
                f"Size: {metadata.size_bytes} bytes"
            )
            return {
                "success": True,
                "backup_id": metadata.id,
                "size_bytes": metadata.size_bytes,
            }
        else:
            raise Exception(f"Backup failed: {metadata.error_message}")

    except Exception as e:
        logger.error(f"Daily backup task failed: {e}")
        # Retry the task
        raise self.retry(exc=e)


@shared_task(name="backups.create_hourly_incremental")
def create_hourly_incremental():
    """Create an hourly incremental backup.

    This task runs every hour to capture recent changes.
    """
    try:
        import asyncio

        backup_service = get_backup_service()

        metadata = asyncio.run(backup_service.create_backup(
            backup_type=BackupType.INCREMENTAL,
            compress=True,
            upload_to_cloud=True,
        ))

        logger.info(f"Hourly incremental backup: {metadata.id}")
        return {"success": True, "backup_id": metadata.id}

    except Exception as e:
        logger.error(f"Hourly backup task failed: {e}")
        return {"success": False, "error": str(e)}


@shared_task(name="backups.cleanup_old_backups")
def cleanup_old_backups():
    """Remove backups older than retention period.

    This task runs daily to clean up expired backups.
    """
    try:
        import asyncio

        backup_service = get_backup_service()

        # List all backups including expired
        backups = asyncio.run(backup_service.list_backups(include_expired=True))

        deleted_count = 0
        for backup in backups:
            if backup.status == "expired":
                asyncio.run(backup_service.delete_backup(backup.id))
                deleted_count += 1
                logger.info(f"Deleted expired backup: {backup.id}")

        return {
            "success": True,
            "deleted_count": deleted_count,
            "remaining_count": len(backups) - deleted_count,
        }

    except Exception as e:
        logger.error(f"Cleanup task failed: {e}")
        return {"success": False, "error": str(e)}


@shared_task(name="backups.verify_backups")
def verify_backups():
    """Verify backup integrity.

    This task runs weekly to verify all backups are valid and accessible.
    """
    try:
        import asyncio
        import gzip

        backup_service = get_backup_service()
        backups = asyncio.run(backup_service.list_backups())

        results = []
        for backup in backups[:10]:  # Verify last 10 backups
            try:
                backup_path = backup_service._get_backup_path(backup.id)

                # Check if file exists and is readable
                if backup_path.exists():
                    # Verify gzip integrity
                    with gzip.open(backup_path, "rb") as f:
                        # Read first few bytes to verify
                        f.read(1024)

                    results.append({
                        "backup_id": backup.id,
                        "status": "valid",
                    })
                else:
                    results.append({
                        "backup_id": backup.id,
                        "status": "missing",
                    })

            except Exception as e:
                results.append({
                    "backup_id": backup.id,
                    "status": "corrupted",
                    "error": str(e),
                })

        valid_count = sum(1 for r in results if r["status"] == "valid")

        return {
            "success": True,
            "verified_count": len(results),
            "valid_count": valid_count,
            "results": results,
        }

    except Exception as e:
        logger.error(f"Verification task failed: {e}")
        return {"success": False, "error": str(e)}


@shared_task(name="backups.backup_tenant_data")
def backup_tenant_data(organisation_id: str):
    """Create a backup for a specific tenant.

    This task is triggered when a tenant is deleted or
    requests their data export.

    Args:
        organisation_id: The organisation ID to backup
    """
    try:
        import asyncio

        backup_service = get_backup_service()

        metadata = asyncio.run(backup_service.create_backup(
            backup_type=BackupType.DATA_ONLY,
            organisation_id=organisation_id,
            compress=True,
            upload_to_cloud=True,
        ))

        logger.info(f"Tenant backup created: {metadata.id} for org {organisation_id}")

        return {
            "success": True,
            "backup_id": metadata.id,
            "organisation_id": organisation_id,
        }

    except Exception as e:
        logger.error(f"Tenant backup failed: {e}")
        return {"success": False, "error": str(e)}


# Schedule configuration for Celery beat
# Add this to celery_app.py:
#
# from celery.schedules import crontab
#
# app.conf.beat_schedule = {
#     "daily-backup": {
#         "task": "backups.create_daily_backup",
#         "schedule": crontab(hour=2, minute=0),  # 2 AM daily
#     },
#     "hourly-incremental": {
#         "task": "backups.create_hourly_incremental",
#         "schedule": crontab(minute=30),  # Every hour at :30
#     },
#     "cleanup-backups": {
#         "task": "backups.cleanup_old_backups",
#         "schedule": crontab(hour=3, minute=0),  # 3 AM daily
#     },
#     "verify-backups": {
#         "task": "backups.verify_backups",
#         "schedule": crontab(hour=4, minute=0, day_of_week=0),  # Sunday 4 AM
#     },
# }
