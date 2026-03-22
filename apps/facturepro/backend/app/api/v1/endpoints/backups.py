"""Backup Management API Endpoints.

Provides REST API for:
- Creating backups
- Listing backups
- Restoring backups
- Exporting data
- Importing data
"""
from __future__ import annotations

import logging
from datetime import datetime
from io import BytesIO
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import get_current_user, require_admin
from app.services.backup_service import BackupService, BackupType, BackupMetadata

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backups", tags=["Backups"])


# Request/Response Models
class BackupCreateRequest(BaseModel):
    """Request model for creating a backup."""
    backup_type: BackupType = BackupType.FULL
    organisation_id: Optional[str] = None
    compress: bool = True
    upload_to_cloud: bool = True


class BackupRestoreRequest(BaseModel):
    """Request model for restoring a backup."""
    backup_id: str
    drop_existing: bool = False


class ExportRequest(BaseModel):
    """Request model for data export."""
    tables: List[str]
    format: str = "json"  # json or csv
    organisation_id: Optional[str] = None


class ImportRequest(BaseModel):
    """Request model for data import."""
    format: str = "json"
    organisation_id: Optional[str] = None
    upsert: bool = True


# Dependency to get backup service
def get_backup_service() -> BackupService:
    """Get configured backup service instance."""
    settings = get_settings()
    return BackupService(
        database_url=settings.DATABASE_URL,
        database_name=settings.POSTGRES_DB,
        backup_dir="/tmp/savana_backups",
        s3_bucket=settings.BACKUP_S3_BUCKET,
        retention_days=settings.BACKUP_RETENTION_DAYS,
    )


@router.post("", response_model=BackupMetadata)
async def create_backup(
    request: BackupCreateRequest,
    background_tasks: BackgroundTasks,
    backup_service: BackupService = Depends(get_backup_service),
    current_user: dict = Depends(require_admin),
):
    """Create a new database backup.

    Requires admin privileges.

    - **backup_type**: Type of backup (full, incremental, data_only, schema_only)
    - **organisation_id**: Optional tenant ID for tenant-specific backup
    - **compress**: Whether to compress the backup file
    - **upload_to_cloud**: Whether to upload to S3
    """
    try:
        # Run backup in background for large databases
        metadata = await backup_service.create_backup(
            backup_type=request.backup_type,
            organisation_id=request.organisation_id,
            compress=request.compress,
            upload_to_cloud=request.upload_to_cloud,
        )
        return metadata

    except Exception as e:
        logger.error(f"Backup creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


@router.get("", response_model=List[BackupMetadata])
async def list_backups(
    include_expired: bool = False,
    backup_service: BackupService = Depends(get_backup_service),
    current_user: dict = Depends(require_admin),
):
    """List all available backups.

    Requires admin privileges.

    - **include_expired**: Whether to include expired backups in the list
    """
    backups = await backup_service.list_backups(include_expired=include_expired)
    return backups


@router.get("/{backup_id}", response_model=BackupMetadata)
async def get_backup(
    backup_id: str,
    backup_service: BackupService = Depends(get_backup_service),
    current_user: dict = Depends(require_admin),
):
    """Get details of a specific backup.

    Requires admin privileges.
    """
    backups = await backup_service.list_backups(include_expired=True)
    for backup in backups:
        if backup.id == backup_id:
            return backup

    raise HTTPException(status_code=404, detail="Backup not found")


@router.post("/restore")
async def restore_backup(
    request: BackupRestoreRequest,
    backup_service: BackupService = Depends(get_backup_service),
    current_user: dict = Depends(require_admin),
):
    """Restore database from a backup.

    **WARNING**: This will overwrite existing data!

    Requires admin privileges.

    - **backup_id**: ID of the backup to restore
    - **drop_existing**: Whether to drop existing data before restore
    """
    try:
        success = await backup_service.restore_backup(
            backup_id=request.backup_id,
            drop_existing=request.drop_existing,
        )

        if success:
            return {"message": f"Backup {request.backup_id} restored successfully"}
        else:
            raise HTTPException(status_code=500, detail="Restore failed")

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Backup not found")
    except Exception as e:
        logger.error(f"Restore failed: {e}")
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")


@router.delete("/{backup_id}")
async def delete_backup(
    backup_id: str,
    backup_service: BackupService = Depends(get_backup_service),
    current_user: dict = Depends(require_admin),
):
    """Delete a backup.

    Requires admin privileges.
    """
    try:
        success = await backup_service.delete_backup(backup_id)
        if success:
            return {"message": f"Backup {backup_id} deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Delete failed")

    except Exception as e:
        logger.error(f"Delete failed: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.post("/export")
async def export_data(
    request: ExportRequest,
    backup_service: BackupService = Depends(get_backup_service),
    current_user: dict = Depends(get_current_user),
):
    """Export data from specific tables.

    - **tables**: List of table names to export
    - **format**: Export format (json or csv)
    - **organisation_id**: Optional tenant filter
    """
    try:
        data = await backup_service.export_data(
            table_names=request.tables,
            format=request.format,
            organisation_id=request.organisation_id,
        )

        # Generate filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        if request.format == "json":
            filename = f"export_{timestamp}.json"
            media_type = "application/json"
        else:
            filename = f"export_{timestamp}.tar.gz"
            media_type = "application/gzip"

        return StreamingResponse(
            data,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    format: str = "json",
    organisation_id: Optional[str] = None,
    upsert: bool = True,
    backup_service: BackupService = Depends(get_backup_service),
    current_user: dict = Depends(require_admin),
):
    """Import data from a file.

    Requires admin privileges.

    - **file**: Data file to import
    - **format**: Import format (json)
    - **organisation_id**: Optional organisation ID for imported data
    - **upsert**: Whether to update existing records
    """
    try:
        # Read uploaded file
        content = await file.read()
        data = BytesIO(content)

        # Import data
        counts = await backup_service.import_data(
            data=data,
            format=format,
            organisation_id=organisation_id,
            upsert=upsert,
        )

        return {
            "message": "Import completed successfully",
            "imported_counts": counts,
        }

    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/download/{backup_id}")
async def download_backup(
    backup_id: str,
    backup_service: BackupService = Depends(get_backup_service),
    current_user: dict = Depends(require_admin),
):
    """Download a backup file.

    Requires admin privileges.
    """
    from pathlib import Path

    backup_path = backup_service._get_backup_path(backup_id)

    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup file not found")

    def iterfile():
        with open(backup_path, "rb") as f:
            yield from f

    return StreamingResponse(
        iterfile(),
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{backup_id}.sql.gz"'
        }
    )
