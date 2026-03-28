"""Pydantic schemas for Timetable module."""
from __future__ import annotations

from datetime import datetime, time
from typing import Any

from pydantic import BaseModel, Field


# ──────────────── TimeSlot Schemas ────────────────
class TimeSlotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    start_time: time
    end_time: time
    order: int = Field(default=0, ge=0)


class TimeSlotUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    start_time: time | None = None
    end_time: time | None = None
    order: int | None = Field(None, ge=0)
    is_active: bool | None = None


class TimeSlotOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    start_time: time
    end_time: time
    order: int
    is_active: bool
    created_at: datetime


# ──────────────── TimetableEntry Schemas ────────────────
class TimetableEntryCreate(BaseModel):
    class_id: int
    subject_id: int
    teacher_id: int | None = None
    time_slot_id: int
    day_of_week: int = Field(ge=0, le=6)  # 0=Lundi, 6=Dimanche
    room: str | None = Field(None, max_length=100)
    notes: str | None = None


class TimetableEntryUpdate(BaseModel):
    subject_id: int | None = None
    teacher_id: int | None = None
    time_slot_id: int | None = None
    day_of_week: int | None = Field(None, ge=0, le=6)
    room: str | None = Field(None, max_length=100)
    notes: str | None = None


class TimetableEntryOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    class_id: int
    subject_id: int
    teacher_id: int | None
    time_slot_id: int
    day_of_week: int
    room: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    # Nested objects for detailed view
    class_: dict[str, Any] | None = None
    subject: dict[str, Any] | None = None
    teacher: dict[str, Any] | None = None
    time_slot: dict[str, Any] | None = None


class TimetableEntryWithDetails(TimetableEntryOut):
    """Entry with full related objects."""
    class_name: str | None = None
    subject_name: str | None = None
    teacher_name: str | None = None
    time_slot_name: str | None = None
    start_time: time | None = None
    end_time: time | None = None


# ──────────────── TimetableConflict Schemas ────────────────
class TimetableConflictCreate(BaseModel):
    entry1_id: int
    entry2_id: int
    conflict_type: str = Field(pattern="^(teacher_double_booking|room_conflict)$")
    severity: str = Field(default="warning", pattern="^(warning|error)$")
    description: str | None = None


class TimetableConflictResolve(BaseModel):
    conflict_id: int
    action: str = Field(pattern="^(ignore|swap|delete_entry1|delete_entry2)$")


class TimetableConflictOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    entry1_id: int
    entry2_id: int
    conflict_type: str
    severity: str
    description: str | None
    resolved: bool
    resolved_at: datetime | None
    created_at: datetime

    # Details about conflicting entries
    entry1: dict[str, Any] | None = None
    entry2: dict[str, Any] | None = None


class TimetableConflictWithDetails(TimetableConflictOut):
    """Conflict with detailed info about entries."""
    entry1_details: dict[str, Any] | None = None
    entry2_details: dict[str, Any] | None = None


# ──────────────── Timetable Grid Schemas ────────────────
class DaySchedule(BaseModel):
    """Schedule for a single day."""
    day_of_week: int
    day_name: str
    entries: list[TimetableEntryWithDetails]


class ClassTimetableOut(BaseModel):
    """Complete timetable for a class."""
    class_id: int
    class_name: str
    level: str
    academic_year: str
    days: list[DaySchedule]


class TeacherTimetableOut(BaseModel):
    """Complete timetable for a teacher."""
    teacher_id: int
    teacher_name: str
    days: list[DaySchedule]


# ──────────────── Timetable Generation Schemas ────────────────
class TimetableGenerateRequest(BaseModel):
    """Request for automatic timetable generation."""
    class_id: int
    constraints: dict[str, Any] | None = None  # e.g., {"max_hours_per_day": 6, "prefer_mornings": True}


class TimetableGenerateResponse(BaseModel):
    """Response from timetable generation."""
    success: bool
    message: str
    generated_entries: list[TimetableEntryOut]
    conflicts_detected: list[TimetableConflictOut]


# ──────────────── PDF Export Schema ────────────────
class TimetablePDFRequest(BaseModel):
    class_id: int
    include_teacher_names: bool = True
    include_room: bool = True
