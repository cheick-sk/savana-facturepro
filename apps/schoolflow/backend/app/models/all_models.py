"""All SQLAlchemy models for SchoolFlow Africa."""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceSettings
from app.models.timetable import TimeSlot, TimetableEntry, TimetableConflict
from app.models.parent_portal import (
    ParentStudent, ParentAccount, ParentNotification, ParentMessage, ParentAccessToken
)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ──────────────── User ────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user", lazy="noload")
    attendance_sessions: Mapped[list["AttendanceSession"]] = relationship(back_populates="created_by_user", lazy="noload")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


# ──────────────── Term (Trimestre/Semestre) ────────────────
class Term(Base):
    __tablename__ = "terms"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. "2024-2025"
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    grades: Mapped[list["Grade"]] = relationship(back_populates="term", lazy="noload")
    fee_invoices: Mapped[list["FeeInvoice"]] = relationship(back_populates="term", lazy="noload")


# ──────────────── Class ────────────────
class Class(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    level: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "CM1", "3ème"
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    max_students: Mapped[int] = mapped_column(Integer, default=40)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    students: Mapped[list["Student"]] = relationship(back_populates="class_", lazy="noload")
    subjects: Mapped[list["Subject"]] = relationship(back_populates="class_", lazy="noload")
    attendance_sessions: Mapped[list["AttendanceSession"]] = relationship(back_populates="class_", lazy="noload")


# ──────────────── Subject ────────────────
class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id"), nullable=True)
    coefficient: Mapped[float] = mapped_column(Numeric(4, 2), default=1.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    class_: Mapped["Class"] = relationship(back_populates="subjects", lazy="selectin")
    teacher: Mapped["Teacher | None"] = relationship(back_populates="subjects", lazy="selectin")
    grades: Mapped[list["Grade"]] = relationship(back_populates="subject", lazy="noload")


# ──────────────── Teacher ────────────────
class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    speciality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    subjects: Mapped[list["Subject"]] = relationship(back_populates="teacher", lazy="noload")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


# ──────────────── Parent ────────────────
class Parent(Base):
    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Legacy single student relationship (for backward compatibility)
    students: Mapped[list["Student"]] = relationship(back_populates="parent", lazy="noload")
    
    # New many-to-many relationship via ParentStudent
    children: Mapped[list["Student"]] = relationship(
        secondary="parent_students",
        back_populates="parents",
        lazy="selectin",
        viewonly=True
    )
    
    # Portal account
    account: Mapped["ParentAccount | None"] = relationship(back_populates="parent", lazy="selectin", uselist=False)
    
    # Notifications and messages
    notifications: Mapped[list["ParentNotification"]] = relationship(back_populates="parent", lazy="noload")
    messages: Mapped[list["ParentMessage"]] = relationship(back_populates="parent", lazy="noload")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


# ──────────────── Student ────────────────
class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    birth_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classes.id"), nullable=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("parents.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    class_: Mapped["Class | None"] = relationship(back_populates="students", lazy="selectin")
    parent: Mapped["Parent | None"] = relationship(back_populates="students", lazy="selectin")
    grades: Mapped[list["Grade"]] = relationship(back_populates="student", lazy="noload")
    fee_invoices: Mapped[list["FeeInvoice"]] = relationship(back_populates="student", lazy="noload")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(back_populates="student", lazy="noload")
    
    # Many-to-many parents relationship
    parents: Mapped[list["Parent"]] = relationship(
        secondary="parent_students",
        back_populates="children",
        lazy="selectin",
        viewonly=True
    )
    
    # Portal notifications and messages
    parent_notifications: Mapped[list["ParentNotification"]] = relationship(back_populates="student", lazy="noload")
    parent_messages: Mapped[list["ParentMessage"]] = relationship(back_populates="student", lazy="noload")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


# ──────────────── Grade ────────────────
class Grade(Base):
    __tablename__ = "grades"
    __table_args__ = (
        UniqueConstraint("student_id", "subject_id", "term_id", name="uq_grade_student_subject_term"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    term_id: Mapped[int] = mapped_column(ForeignKey("terms.id"), nullable=False)
    score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    max_score: Mapped[float] = mapped_column(Numeric(5, 2), default=20.0)
    comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    student: Mapped["Student"] = relationship(back_populates="grades", lazy="selectin")
    subject: Mapped["Subject"] = relationship(back_populates="grades", lazy="selectin")
    term: Mapped["Term"] = relationship(back_populates="grades", lazy="selectin")


# ──────────────── FeeInvoice ────────────────
class FeeInvoice(Base):
    __tablename__ = "fee_invoices"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    term_id: Mapped[int | None] = mapped_column(ForeignKey("terms.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING/PAID/OVERDUE
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    student: Mapped["Student"] = relationship(back_populates="fee_invoices", lazy="selectin")
    term: Mapped["Term | None"] = relationship(back_populates="fee_invoices", lazy="selectin")
    payments: Mapped[list["FeePayment"]] = relationship(back_populates="fee_invoice", lazy="selectin", cascade="all, delete-orphan")


# ──────────────── FeePayment ────────────────
class FeePayment(Base):
    __tablename__ = "fee_payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    fee_invoice_id: Mapped[int] = mapped_column(ForeignKey("fee_invoices.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(30), default="CASH")
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    fee_invoice: Mapped["FeeInvoice"] = relationship(back_populates="payments")


# ──────────────── AuditLog ────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped["User | None"] = relationship(back_populates="audit_logs")
