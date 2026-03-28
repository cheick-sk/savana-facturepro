"""Timetable models for SchoolFlow Africa."""
from __future__ import annotations

from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────── TimeSlot (Créneau horaire) ────────────────
class TimeSlot(Base):
    """Créneau horaire configurable."""
    __tablename__ = "time_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("organisations.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # "Matin 1", "Après-midi 2"
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relations
    entries: Mapped[list["TimetableEntry"]] = relationship(back_populates="time_slot", lazy="noload")


# ──────────────── TimetableEntry (Entrée d'emploi du temps) ────────────────
class TimetableEntry(Base):
    """Entrée d'emploi du temps."""
    __tablename__ = "timetable_entries"
    __table_args__ = (
        UniqueConstraint("class_id", "time_slot_id", "day_of_week", name="uq_entry_class_slot_day"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("organisations.id"), nullable=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("teachers.id"), nullable=True)
    time_slot_id: Mapped[int] = mapped_column(Integer, ForeignKey("time_slots.id"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Lundi, 6=Dimanche
    room: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relations
    class_: Mapped["Class"] = relationship(lazy="selectin")
    subject: Mapped["Subject"] = relationship(lazy="selectin")
    teacher: Mapped["Teacher | None"] = relationship(lazy="selectin")
    time_slot: Mapped["TimeSlot"] = relationship(back_populates="entries", lazy="selectin")
    conflicts_as_entry1: Mapped[list["TimetableConflict"]] = relationship(
        foreign_keys="TimetableConflict.entry1_id", back_populates="entry1", lazy="noload"
    )
    conflicts_as_entry2: Mapped[list["TimetableConflict"]] = relationship(
        foreign_keys="TimetableConflict.entry2_id", back_populates="entry2", lazy="noload"
    )


# ──────────────── TimetableConflict (Conflit détecté) ────────────────
class TimetableConflict(Base):
    """Conflit détecté dans l'emploi du temps."""
    __tablename__ = "timetable_conflicts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organisation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("organisations.id"), nullable=True)
    entry1_id: Mapped[int] = mapped_column(Integer, ForeignKey("timetable_entries.id", ondelete="CASCADE"), nullable=False)
    entry2_id: Mapped[int] = mapped_column(Integer, ForeignKey("timetable_entries.id", ondelete="CASCADE"), nullable=False)
    conflict_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "teacher_double_booking", "room_conflict"
    severity: Mapped[str] = mapped_column(String(20), default="warning")  # "warning", "error"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relations
    entry1: Mapped["TimetableEntry"] = relationship(foreign_keys=[entry1_id], back_populates="conflicts_as_entry1", lazy="selectin")
    entry2: Mapped["TimetableEntry"] = relationship(foreign_keys=[entry2_id], back_populates="conflicts_as_entry2", lazy="selectin")
