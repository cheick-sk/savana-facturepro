"""Pydantic schemas for Parent Portal."""
from __future__ import annotations

from datetime import datetime, date
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ──────────────── Authentication ────────────────
class ParentRegisterRequest(BaseModel):
    """Registration request for parent account."""
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = Field(None, max_length=30)
    password: str = Field(min_length=6)
    
    # Link to student(s) - optional at registration
    student_ids: list[int] | None = None


class ParentMagicLinkRequest(BaseModel):
    """Request magic link authentication."""
    email: EmailStr


class ParentVerifyMagicRequest(BaseModel):
    """Verify magic link token."""
    token: str


class ParentLoginRequest(BaseModel):
    """Password login request."""
    email: EmailStr
    password: str = Field(min_length=6)


class ParentTokenResponse(BaseModel):
    """Token response for parent authentication."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    parent: "ParentAccountOut"


class ParentRefreshRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


# ──────────────── Profile ────────────────
class ParentProfileUpdate(BaseModel):
    """Update parent profile."""
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=30)
    address: str | None = None


class ParentAccountUpdate(BaseModel):
    """Update parent account settings."""
    preferred_language: str | None = Field(None, pattern="^(fr|en|sw|wo)$")
    notification_channels: list[str] | None = None
    receive_sms_notifications: bool | None = None
    receive_email_notifications: bool | None = None


class ParentPasswordChange(BaseModel):
    """Change password request."""
    current_password: str
    new_password: str = Field(min_length=6)


class ParentAccountOut(BaseModel):
    """Parent account output."""
    model_config = {"from_attributes": True}
    
    id: int
    email: str
    phone: str | None
    preferred_language: str
    notification_channels: list[str]
    receive_sms_notifications: bool
    receive_email_notifications: bool
    is_active: bool
    email_verified: bool
    last_login: datetime | None
    created_at: datetime
    
    # Parent info
    parent: "ParentInfoOut"


class ParentInfoOut(BaseModel):
    """Basic parent information."""
    model_config = {"from_attributes": True}
    
    id: int
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    address: str | None
    full_name: str


# ──────────────── Children ────────────────
class ChildOut(BaseModel):
    """Child (student) information for parent."""
    model_config = {"from_attributes": True}
    
    id: int
    student_number: str
    first_name: str
    last_name: str
    full_name: str
    birth_date: datetime | None
    gender: str | None
    is_active: bool
    
    # Class info
    class_id: int | None
    class_name: str | None
    class_level: str | None
    
    # Parent relationship info
    relationship: str | None
    is_primary: bool


class ChildDetailOut(ChildOut):
    """Detailed child information."""
    
    # Academic summary
    average_grade: float | None
    attendance_rate: float | None
    pending_fees: float
    total_fees: float


# ──────────────── Grades ────────────────
class GradeForParentOut(BaseModel):
    """Grade information for parent view."""
    model_config = {"from_attributes": True}
    
    id: int
    subject_id: int
    subject_name: str
    subject_coefficient: float
    term_id: int
    term_name: str
    academic_year: str
    score: float
    max_score: float
    percentage: float
    comment: str | None
    created_at: datetime


class SubjectGradesOut(BaseModel):
    """Grades grouped by subject."""
    subject_id: int
    subject_name: str
    coefficient: float
    teacher_name: str | None
    grades: list[GradeForParentOut]
    average: float


class TermGradesOut(BaseModel):
    """Grades for a term."""
    term_id: int
    term_name: str
    academic_year: str
    subjects: list[SubjectGradesOut]
    overall_average: float
    class_average: float | None
    rank: int | None


class ReportCardOut(BaseModel):
    """Report card for a term."""
    student_id: int
    student_name: str
    student_number: str
    class_name: str
    class_level: str
    
    term_id: int
    term_name: str
    academic_year: str
    
    subjects: list[SubjectGradesOut]
    overall_average: float
    class_average: float | None
    rank: int | None
    total_students: int | None
    
    # Attendance summary
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    attendance_rate: float
    
    # Comments
    teacher_comment: str | None
    principal_comment: str | None
    
    generated_at: datetime


# ──────────────── Attendance ────────────────
class AttendanceRecordForParentOut(BaseModel):
    """Attendance record for parent view."""
    model_config = {"from_attributes": True}
    
    id: int
    date: date
    status: str  # present, absent, late, excused
    arrival_time: str | None
    notes: str | None
    class_name: str


class AttendanceStatsForParentOut(BaseModel):
    """Attendance statistics for parent."""
    student_id: int
    period_start: date
    period_end: date
    
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    excused_days: int
    
    attendance_rate: float
    punctuality_rate: float
    consecutive_absences: int


class AttendanceCalendarDay(BaseModel):
    """Single day attendance status."""
    date: date
    status: str  # present, absent, late, excused, no_school
    is_weekend: bool
    is_holiday: bool


# ──────────────── Timetable ────────────────
class TimetableEntryForParentOut(BaseModel):
    """Timetable entry for parent view."""
    id: int
    day_of_week: int  # 0=Monday, 5=Saturday
    day_name: str
    time_slot_id: int
    slot_name: str
    start_time: str
    end_time: str
    subject_name: str
    teacher_name: str | None
    room: str | None


class DayTimetableOut(BaseModel):
    """Timetable for a single day."""
    day_of_week: int
    day_name: str
    entries: list[TimetableEntryForParentOut]


class WeekTimetableOut(BaseModel):
    """Full week timetable."""
    student_id: int
    student_name: str
    class_name: str
    days: list[DayTimetableOut]


# ──────────────── Fees ────────────────
class FeeInvoiceForParentOut(BaseModel):
    """Fee invoice for parent view."""
    model_config = {"from_attributes": True}
    
    id: int
    invoice_number: str
    student_id: int
    student_name: str
    term_id: int | None
    term_name: str | None
    amount: float
    description: str
    due_date: datetime | None
    status: str
    created_at: datetime
    
    # Payment info
    amount_paid: float
    amount_remaining: float
    payments: list["FeePaymentForParentOut"]


class FeePaymentForParentOut(BaseModel):
    """Fee payment for parent view."""
    model_config = {"from_attributes": True}
    
    id: int
    amount: float
    method: str
    reference: str | None
    paid_at: datetime


class FeePaymentRequest(BaseModel):
    """Payment request."""
    fee_invoice_id: int
    amount: float = Field(gt=0)
    method: str = Field(pattern="^(CASH|MOBILE_MONEY|BANK_TRANSFER|CARD)$")
    phone_number: str | None = None  # For mobile money
    provider: str | None = None  # Orange, MTN, Wave, etc.


class MobileMoneyPaymentRequest(BaseModel):
    """Mobile money payment request."""
    fee_invoice_id: int
    amount: float = Field(gt=0)
    provider: str  # orange, mtn, wave, moov, mpesa
    phone_number: str = Field(min_length=8, max_length=15)


# ──────────────── Messages ────────────────
class ParentMessageOut(BaseModel):
    """Message for parent view."""
    model_config = {"from_attributes": True}
    
    id: int
    subject: str
    content: str
    sender_type: str
    sender_name: str | None
    thread_id: str | None
    reply_to_id: int | None
    student_id: int | None
    student_name: str | None
    priority: str
    category: str | None
    read: bool
    read_at: datetime | None
    created_at: datetime


class ParentMessageCreate(BaseModel):
    """Create new message from parent."""
    subject: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    student_id: int | None = None  # Optional: related to a specific child
    category: str | None = None
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")


class ParentMessageReply(BaseModel):
    """Reply to a message."""
    content: str = Field(min_length=1)


class MessageThreadOut(BaseModel):
    """Message thread."""
    thread_id: str
    subject: str
    messages: list[ParentMessageOut]
    latest_message: datetime
    unread_count: int


# ──────────────── Notifications ────────────────
class ParentNotificationOut(BaseModel):
    """Notification for parent."""
    model_config = {"from_attributes": True}
    
    id: int
    type: str
    title: str
    content: str
    student_id: int | None
    student_name: str | None
    reference_type: str | None
    reference_id: int | None
    read: bool
    read_at: datetime | None
    created_at: datetime


class NotificationListOut(BaseModel):
    """Paginated notification list."""
    items: list[ParentNotificationOut]
    total: int
    unread_count: int


# ──────────────── Dashboard ────────────────
class ParentDashboardOut(BaseModel):
    """Parent dashboard data."""
    parent: ParentInfoOut
    
    # Children count
    children_count: int
    
    # Quick stats
    unread_messages: int
    unread_notifications: int
    pending_fees_total: float
    upcoming_payments: list[FeeInvoiceForParentOut]
    
    # Recent activity
    recent_grades: list[GradeForParentOut]
    recent_attendance: list[AttendanceRecordForParentOut]
    recent_notifications: list[ParentNotificationOut]
    
    # Children summaries
    children: list[ChildDetailOut]


# ──────────────── Link Student ────────────────
class LinkStudentRequest(BaseModel):
    """Request to link a student to parent account."""
    student_number: str
    relationship: str = Field(default="parent", pattern="^(parent|guardian|other)$")


class LinkStudentVerify(BaseModel):
    """Verify student for linking (returns info without linking)."""
    student_number: str
    birth_date: date | None = None  # For verification


# ──────────────── Update forward references ────────────────
ParentAccountOut.model_rebuild()
FeeInvoiceForParentOut.model_rebuild()
