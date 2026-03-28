"""Attendance models for SchoolFlow Africa."""
from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, Time,
    UniqueConstraint, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.all_models import Class, Student, User


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class AttendanceSession(Base):
    """Session d'appel (une journée pour une classe)."""
    __tablename__ = "attendance_sessions"
    __table_args__ = (
        UniqueConstraint("class_id", "date", name="uq_attendance_session_class_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("organisations.id"), nullable=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False)
    date: Mapped[date] = mapped_column(nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Compteurs
    total_students: Mapped[int] = mapped_column(Integer, default=0)
    present_count: Mapped[int] = mapped_column(Integer, default=0)
    absent_count: Mapped[int] = mapped_column(Integer, default=0)
    late_count: Mapped[int] = mapped_column(Integer, default=0)
    excused_count: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(String(20), default="in_progress")  # in_progress, completed

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relations
    class_: Mapped["Class"] = relationship(back_populates="attendance_sessions", lazy="selectin")
    created_by_user: Mapped["User"] = relationship(lazy="selectin")
    records: Mapped[list["AttendanceRecord"]] = relationship(
        back_populates="session", lazy="selectin", cascade="all, delete-orphan"
    )


class AttendanceRecord(Base):
    """Enregistrement de présence individuelle."""
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_record_session_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("organisations.id"), nullable=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id"), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False)  # "present", "absent", "late", "excused"
    arrival_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Notification envoyée aux parents ?
    parent_notified: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relations
    session: Mapped["AttendanceSession"] = relationship(back_populates="records", lazy="selectin")
    student: Mapped["Student"] = relationship(back_populates="attendance_records", lazy="selectin")


class AttendanceSettings(Base):
    """Configuration des présences par organisation."""
    __tablename__ = "attendance_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("organisations.id"), nullable=True)

    auto_notify_absence: Mapped[bool] = mapped_column(Boolean, default=True)
    notification_channels: Mapped[list[str]] = mapped_column(JSON, default=["sms", "whatsapp"])
    late_threshold_minutes: Mapped[int] = mapped_column(Integer, default=15)
    absence_alert_after: Mapped[int] = mapped_column(Integer, default=3)  # alert after N consecutive absences
    school_start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    school_end_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
