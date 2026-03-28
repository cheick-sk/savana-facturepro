"""Pydantic v2 schemas for Attendance module."""
from __future__ import annotations

from datetime import date, datetime, time
from typing import Any

from pydantic import BaseModel, Field


# ──────────────── Attendance Session ────────────────
class AttendanceSessionCreate(BaseModel):
    """Create a new attendance session."""
    class_id: int
    date: date | None = None  # Defaults to today if not provided


class AttendanceSessionOut(BaseModel):
    """Attendance session output."""
    model_config = {"from_attributes": True}
    
    id: int
    class_id: int
    date: date
    created_by: int
    total_students: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    status: str
    created_at: datetime
    updated_at: datetime | None = None


class AttendanceSessionDetail(AttendanceSessionOut):
    """Attendance session with records."""
    records: list["AttendanceRecordOut"] = []
    class_name: str | None = None
    created_by_name: str | None = None


# ──────────────── Attendance Record ────────────────
class AttendanceRecordCreate(BaseModel):
    """Create a single attendance record."""
    session_id: int
    student_id: int
    status: str = Field(pattern="^(present|absent|late|excused)$")
    arrival_time: time | None = None
    notes: str | None = Field(None, max_length=500)


class AttendanceRecordUpdate(BaseModel):
    """Update an attendance record."""
    status: str | None = Field(None, pattern="^(present|absent|late|excused)$")
    arrival_time: time | None = None
    notes: str | None = Field(None, max_length=500)


class AttendanceRecordOut(BaseModel):
    """Attendance record output."""
    model_config = {"from_attributes": True}
    
    id: int
    session_id: int
    student_id: int
    status: str
    arrival_time: time | None
    notes: str | None
    parent_notified: bool
    notification_sent_at: datetime | None
    created_at: datetime


class AttendanceRecordWithStudent(AttendanceRecordOut):
    """Attendance record with student info."""
    student_first_name: str | None = None
    student_last_name: str | None = None
    student_number: str | None = None


# ──────────────── Bulk Attendance ────────────────
class BulkAttendanceItem(BaseModel):
    """Single item in bulk attendance update."""
    student_id: int
    status: str = Field(pattern="^(present|absent|late|excused)$")
    arrival_time: time | None = None
    notes: str | None = None


class BulkAttendanceCreate(BaseModel):
    """Bulk attendance records for a session."""
    class_id: int
    date: date | None = None  # Defaults to today
    records: list[BulkAttendanceItem]


# ──────────────── Attendance Settings ────────────────
class AttendanceSettingsCreate(BaseModel):
    """Create attendance settings."""
    auto_notify_absence: bool = True
    notification_channels: list[str] = Field(default=["sms", "whatsapp"])
    late_threshold_minutes: int = Field(default=15, ge=0, le=120)
    absence_alert_after: int = Field(default=3, ge=1, le=30)
    school_start_time: time | None = None
    school_end_time: time | None = None


class AttendanceSettingsUpdate(BaseModel):
    """Update attendance settings."""
    auto_notify_absence: bool | None = None
    notification_channels: list[str] | None = None
    late_threshold_minutes: int | None = Field(None, ge=0, le=120)
    absence_alert_after: int | None = Field(None, ge=1, le=30)
    school_start_time: time | None = None
    school_end_time: time | None = None


class AttendanceSettingsOut(BaseModel):
    """Attendance settings output."""
    model_config = {"from_attributes": True}
    
    id: int
    auto_notify_absence: bool
    notification_channels: list[str]
    late_threshold_minutes: int
    absence_alert_after: int
    school_start_time: time | None
    school_end_time: time | None
    created_at: datetime
    updated_at: datetime | None = None


# ──────────────── Statistics ────────────────
class AttendanceStats(BaseModel):
    """Attendance statistics for a class or student."""
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    excused_days: int
    attendance_rate: float  # Percentage
    punctuality_rate: float  # Percentage of on-time arrivals


class ClassAttendanceStats(AttendanceStats):
    """Attendance statistics for a class."""
    class_id: int
    class_name: str
    period_start: date
    period_end: date
    student_stats: list["StudentAttendanceStats"]


class StudentAttendanceStats(AttendanceStats):
    """Attendance statistics for a student."""
    student_id: int
    student_name: str
    student_number: str
    consecutive_absences: int


class DailyAttendanceStats(BaseModel):
    """Daily attendance statistics."""
    date: date
    present: int
    absent: int
    late: int
    excused: int
    total: int
    attendance_rate: float


# ──────────────── Calendar ────────────────
class AttendanceCalendarDay(BaseModel):
    """Attendance status for a calendar day."""
    date: date
    status: str  # "completed", "in_progress", "not_started"
    present_count: int
    absent_count: int
    late_count: int
    total_students: int


class AttendanceCalendarMonth(BaseModel):
    """Attendance calendar for a month."""
    class_id: int
    class_name: str
    month: int
    year: int
    days: list[AttendanceCalendarDay]


# ──────────────── Reports ────────────────
class AttendanceReportRequest(BaseModel):
    """Request for attendance report."""
    class_id: int
    month: int = Field(ge=1, le=12)
    year: int
    format: str = Field(default="pdf", pattern="^(pdf|excel)$")


class AttendanceReport(BaseModel):
    """Generated attendance report."""
    report_id: str
    class_id: int
    class_name: str
    month: int
    year: int
    generated_at: datetime
    download_url: str
    stats: ClassAttendanceStats


# ──────────────── Notifications ────────────────
class AbsenceNotification(BaseModel):
    """Notification for parent about absence."""
    student_id: int
    student_name: str
    date: date
    status: str
    parent_phone: str | None
    parent_email: str | None
    channels: list[str]


# ──────────────── History ────────────────
class StudentAttendanceHistory(BaseModel):
    """Attendance history for a student."""
    student_id: int
    student_name: str
    student_number: str
    records: list[AttendanceRecordWithStudent]
    stats: StudentAttendanceStats


# Update forward references
AttendanceSessionDetail.model_rebuild()
ClassAttendanceStats.model_rebuild()
