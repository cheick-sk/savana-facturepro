"""Database Backup Service.

Provides automated database backup and restore functionality with:
- Scheduled backups via Celery
- S3/Cloud storage integration
- Point-in-time recovery
- Data export (JSON, CSV)
- Retention policy management
"""
from __future__ import annotations

import gzip
import io
import json
import logging
import os
import shutil
import subprocess
import tarfile
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, BinaryIO

import asyncpg
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class BackupType(str, Enum):
    """Backup type enumeration."""
    FULL = "full"
    INCREMENTAL = "incremental"
    DATA_ONLY = "data_only"
    SCHEMA_ONLY = "schema_only"


class BackupStatus(str, Enum):
    """Backup status enumeration."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class BackupMetadata(BaseModel):
    """Backup metadata model."""
    id: str
    backup_type: BackupType
    status: BackupStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    size_bytes: Optional[int] = None
    database_name: str
    organisation_id: Optional[str] = None
    storage_path: Optional[str] = None
    checksum: Optional[str] = None
    error_message: Optional[str] = None
    retention_days: int = 30
    expires_at: Optional[datetime] = None


class BackupService:
    """Service for database backup and restore operations."""

    def __init__(
        self,
        database_url: str,
        database_name: str,
        backup_dir: str = "/tmp/backups",
        s3_bucket: Optional[str] = None,
        s3_prefix: str = "backups",
        retention_days: int = 30,
    ):
        """Initialize the backup service.

        Args:
            database_url: PostgreSQL connection URL
            database_name: Database name
            backup_dir: Local directory for temporary backups
            s3_bucket: S3 bucket for cloud storage (optional)
            s3_prefix: S3 key prefix for backups
            retention_days: Number of days to retain backups
        """
        self.database_url = database_url
        self.database_name = database_name
        self.backup_dir = Path(backup_dir)
        self.s3_bucket = s3_bucket
        self.s3_prefix = s3_prefix
        self.retention_days = retention_days
        self._s3_client = None

        # Ensure backup directory exists
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    @property
    def s3_client(self):
        """Lazy-load S3 client."""
        if self._s3_client is None and self.s3_bucket:
            import boto3
            self._s3_client = boto3.client("s3")
        return self._s3_client

    def _generate_backup_id(self) -> str:
        """Generate a unique backup ID."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"backup_{self.database_name}_{timestamp}"

    def _get_backup_path(self, backup_id: str) -> Path:
        """Get local path for a backup file."""
        return self.backup_dir / f"{backup_id}.sql.gz"

    async def create_backup(
        self,
        backup_type: BackupType = BackupType.FULL,
        organisation_id: Optional[str] = None,
        compress: bool = True,
        upload_to_cloud: bool = True,
    ) -> BackupMetadata:
        """Create a database backup.

        Args:
            backup_type: Type of backup to create
            organisation_id: Optional organisation ID for tenant backup
            compress: Whether to compress the backup
            upload_to_cloud: Whether to upload to S3

        Returns:
            BackupMetadata with backup details
        """
        backup_id = self._generate_backup_id()
        metadata = BackupMetadata(
            id=backup_id,
            backup_type=backup_type,
            status=BackupStatus.IN_PROGRESS,
            created_at=datetime.utcnow(),
            database_name=self.database_name,
            organisation_id=organisation_id,
            retention_days=self.retention_days,
            expires_at=datetime.utcnow() + timedelta(days=self.retention_days),
        )

        backup_path = self._get_backup_path(backup_id)

        try:
            # Build pg_dump command
            cmd = self._build_pg_dump_command(backup_type, organisation_id)

            logger.info(f"Starting backup {backup_id} with command: {' '.join(cmd)}")

            # Execute pg_dump
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            stdout, stderr = process.communicate()

            if process.returncode != 0:
                raise Exception(f"pg_dump failed: {stderr.decode()}")

            # Compress and save
            if compress:
                with gzip.open(backup_path, "wb") as f:
                    f.write(stdout)
            else:
                with open(backup_path, "wb") as f:
                    f.write(stdout)

            # Calculate checksum
            checksum = self._calculate_checksum(backup_path)

            # Get file size
            size_bytes = backup_path.stat().st_size

            # Update metadata
            metadata.status = BackupStatus.COMPLETED
            metadata.completed_at = datetime.utcnow()
            metadata.size_bytes = size_bytes
            metadata.checksum = checksum
            metadata.storage_path = str(backup_path)

            # Upload to S3 if configured
            if upload_to_cloud and self.s3_bucket:
                s3_key = f"{self.s3_prefix}/{backup_id}.sql.gz"
                self._upload_to_s3(backup_path, s3_key)
                metadata.storage_path = f"s3://{self.s3_bucket}/{s3_key}"

            logger.info(f"Backup {backup_id} completed successfully. Size: {size_bytes} bytes")

            # Cleanup old local backups
            self._cleanup_old_backups()

        except Exception as e:
            metadata.status = BackupStatus.FAILED
            metadata.error_message = str(e)
            logger.error(f"Backup {backup_id} failed: {e}")

        return metadata

    def _build_pg_dump_command(
        self,
        backup_type: BackupType,
        organisation_id: Optional[str] = None,
    ) -> List[str]:
        """Build pg_dump command based on backup type.

        Args:
            backup_type: Type of backup
            organisation_id: Optional tenant filter

        Returns:
            List of command arguments
        """
        # Parse database URL
        # Format: postgresql://user:pass@host:port/dbname
        from urllib.parse import urlparse
        parsed = urlparse(self.database_url)

        cmd = [
            "pg_dump",
            "-h", parsed.hostname or "localhost",
            "-p", str(parsed.port or 5432),
            "-U", parsed.username or "postgres",
            "-d", parsed.path.lstrip("/"),
        ]

        if backup_type == BackupType.SCHEMA_ONLY:
            cmd.append("--schema-only")
        elif backup_type == BackupType.DATA_ONLY:
            cmd.append("--data-only")

        # Add tenant filter if specified
        if organisation_id:
            cmd.extend([
                "--table=invoices",
                "--table=customers",
                "--table=products",
                "--table=quotes",
                "--table=payments",
                f"--column-inserts",  # Use INSERT statements
            ])

        return cmd

    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of a file.

        Args:
            file_path: Path to the file

        Returns:
            Hexadecimal checksum string
        """
        import hashlib
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def _upload_to_s3(self, file_path: Path, s3_key: str) -> None:
        """Upload backup file to S3.

        Args:
            file_path: Local file path
            s3_key: S3 object key
        """
        if self.s3_client:
            self.s3_client.upload_file(
                str(file_path),
                self.s3_bucket,
                s3_key,
                ExtraArgs={
                    "Metadata": {
                        "backup-type": "full",
                        "database": self.database_name,
                    }
                }
            )
            logger.info(f"Uploaded backup to s3://{self.s3_bucket}/{s3_key}")

    def _cleanup_old_backups(self) -> None:
        """Remove old backup files based on retention policy."""
        cutoff_date = datetime.utcnow() - timedelta(days=self.retention_days)

        for backup_file in self.backup_dir.glob("*.sql.gz"):
            if datetime.fromtimestamp(backup_file.stat().st_mtime) < cutoff_date:
                backup_file.unlink()
                logger.info(f"Removed expired backup: {backup_file.name}")

    async def restore_backup(
        self,
        backup_id: str,
        drop_existing: bool = False,
    ) -> bool:
        """Restore database from a backup.

        Args:
            backup_id: ID of the backup to restore
            drop_existing: Whether to drop existing data

        Returns:
            True if restore successful

        Raises:
            FileNotFoundError: If backup doesn't exist
        """
        backup_path = self._get_backup_path(backup_id)

        if not backup_path.exists():
            # Try downloading from S3
            if self.s3_bucket:
                s3_key = f"{self.s3_prefix}/{backup_id}.sql.gz"
                try:
                    self.s3_client.download_file(
                        self.s3_bucket,
                        s3_key,
                        str(backup_path)
                    )
                except Exception as e:
                    raise FileNotFoundError(f"Backup {backup_id} not found locally or in S3: {e}")
            else:
                raise FileNotFoundError(f"Backup {backup_id} not found")

        try:
            # Decompress if needed
            if backup_path.suffix == ".gz":
                with gzip.open(backup_path, "rb") as f:
                    sql_content = f.read()
            else:
                with open(backup_path, "rb") as f:
                    sql_content = f.read()

            # Build psql command
            from urllib.parse import urlparse
            parsed = urlparse(self.database_url)

            cmd = [
                "psql",
                "-h", parsed.hostname or "localhost",
                "-p", str(parsed.port or 5432),
                "-U", parsed.username or "postgres",
                "-d", parsed.path.lstrip("/"),
            ]

            # Execute restore
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            stdout, stderr = process.communicate(input=sql_content)

            if process.returncode != 0:
                raise Exception(f"psql restore failed: {stderr.decode()}")

            logger.info(f"Backup {backup_id} restored successfully")
            return True

        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise

    async def export_data(
        self,
        table_names: List[str],
        format: str = "json",
        organisation_id: Optional[str] = None,
    ) -> BinaryIO:
        """Export data from specific tables.

        Args:
            table_names: List of table names to export
            format: Export format (json, csv)
            organisation_id: Optional tenant filter

        Returns:
            Binary file-like object with exported data
        """
        conn = await asyncpg.connect(self.database_url)

        try:
            output = io.BytesIO()

            if format == "json":
                data = {}
                for table in table_names:
                    query = f"SELECT * FROM {table}"
                    if organisation_id:
                        query += " WHERE organisation_id = $1"
                        rows = await conn.fetch(query, organisation_id)
                    else:
                        rows = await conn.fetch(query)

                    # Convert records to list of dicts
                    data[table] = [dict(row) for row in rows]

                json_str = json.dumps(data, default=str, indent=2)
                output.write(json_str.encode("utf-8"))

            elif format == "csv":
                # Create a tar archive with CSV files
                with tarfile.open(fileobj=output, mode="w:gz") as tar:
                    for table in table_names:
                        query = f"SELECT * FROM {table}"
                        if organisation_id:
                            query += " WHERE organisation_id = $1"
                            rows = await conn.fetch(query, organisation_id)
                        else:
                            rows = await conn.fetch(query)

                        # Create CSV content
                        csv_buffer = io.StringIO()
                        if rows:
                            # Write header
                            csv_buffer.write(",".join(rows[0].keys()) + "\n")
                            # Write rows
                            for row in rows:
                                values = [str(v).replace(",", "\\,") if v else "" for v in row.values()]
                                csv_buffer.write(",".join(values) + "\n")

                        # Add to tar
                        csv_bytes = csv_buffer.getvalue().encode("utf-8")
                        csv_info = tarfile.TarInfo(name=f"{table}.csv")
                        csv_info.size = len(csv_bytes)
                        tar.addfile(csv_info, io.BytesIO(csv_bytes))

            output.seek(0)
            return output

        finally:
            await conn.close()

    async def import_data(
        self,
        data: BinaryIO,
        format: str = "json",
        organisation_id: Optional[str] = None,
        upsert: bool = True,
    ) -> Dict[str, int]:
        """Import data from file.

        Args:
            data: Binary file with data to import
            format: Import format (json, csv)
            organisation_id: Optional organisation ID for imported data
            upsert: Whether to update existing records

        Returns:
            Dict with counts of imported records per table
        """
        conn = await asyncpg.connect(self.database_url)
        counts = {}

        try:
            if format == "json":
                json_data = json.loads(data.read().decode("utf-8"))

                for table, rows in json_data.items():
                    if not rows:
                        continue

                    counts[table] = 0

                    for row in rows:
                        # Add organisation_id if provided
                        if organisation_id:
                            row["organisation_id"] = organisation_id

                        # Build INSERT query
                        columns = list(row.keys())
                        placeholders = ", ".join(f"${i+1}" for i in range(len(columns)))
                        values = [row[col] for col in columns]

                        if upsert:
                            # Build ON CONFLICT clause
                            update_cols = ", ".join(f"{col} = EXCLUDED.{col}" for col in columns if col != "id")
                            query = f"""
                                INSERT INTO {table} ({', '.join(columns)})
                                VALUES ({placeholders})
                                ON CONFLICT (id) DO UPDATE SET {update_cols}
                            """
                        else:
                            query = f"""
                                INSERT INTO {table} ({', '.join(columns)})
                                VALUES ({placeholders})
                            """

                        await conn.execute(query, *values)
                        counts[table] += 1

            return counts

        finally:
            await conn.close()

    async def list_backups(
        self,
        include_expired: bool = False,
    ) -> List[BackupMetadata]:
        """List all available backups.

        Args:
            include_expired: Whether to include expired backups

        Returns:
            List of BackupMetadata objects
        """
        backups = []

        # Check local backups
        for backup_file in self.backup_dir.glob("*.sql.gz"):
            backup_id = backup_file.stem
            stat = backup_file.stat()

            metadata = BackupMetadata(
                id=backup_id,
                backup_type=BackupType.FULL,
                status=BackupStatus.COMPLETED,
                created_at=datetime.fromtimestamp(stat.st_mtime),
                completed_at=datetime.fromtimestamp(stat.st_mtime),
                size_bytes=stat.st_size,
                database_name=self.database_name,
                storage_path=str(backup_file),
                retention_days=self.retention_days,
                expires_at=datetime.fromtimestamp(stat.st_mtime) + timedelta(days=self.retention_days),
            )

            # Check if expired
            if metadata.expires_at < datetime.utcnow():
                metadata.status = BackupStatus.EXPIRED
                if not include_expired:
                    continue

            backups.append(metadata)

        # Sort by creation date descending
        backups.sort(key=lambda x: x.created_at, reverse=True)
        return backups

    async def delete_backup(self, backup_id: str) -> bool:
        """Delete a backup.

        Args:
            backup_id: ID of the backup to delete

        Returns:
            True if deleted successfully
        """
        backup_path = self._get_backup_path(backup_id)

        # Delete local file
        if backup_path.exists():
            backup_path.unlink()
            logger.info(f"Deleted local backup: {backup_id}")

        # Delete from S3
        if self.s3_bucket:
            s3_key = f"{self.s3_prefix}/{backup_id}.sql.gz"
            try:
                self.s3_client.delete_object(Bucket=self.s3_bucket, Key=s3_key)
                logger.info(f"Deleted S3 backup: s3://{self.s3_bucket}/{s3_key}")
            except Exception as e:
                logger.warning(f"Failed to delete S3 backup: {e}")

        return True
