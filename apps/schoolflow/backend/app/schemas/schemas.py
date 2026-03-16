"""Pydantic v2 schemas for SchoolFlow Africa."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ──────────────── Auth ────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshRequest(BaseModel):
    refresh_token: str


# ──────────────── User ────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    role: str = Field(default="user", pattern="^(admin|manager|user)$")


class UserOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    created_at: datetime


# ──────────────── Term ────────────────
class TermCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    academic_year: str = Field(min_length=4, max_length=20)
    start_date: datetime
    end_date: datetime


class TermOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    academic_year: str
    start_date: datetime
    end_date: datetime
    is_active: bool


# ──────────────── Class ────────────────
class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    level: str = Field(min_length=1, max_length=50)
    academic_year: str = Field(min_length=4, max_length=20)
    max_students: int = Field(default=40, ge=1, le=200)


class ClassOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    level: str
    academic_year: str
    max_students: int
    is_active: bool


# ──────────────── Teacher ────────────────
class TeacherCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    speciality: str | None = Field(None, max_length=100)


class TeacherOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    speciality: str | None
    is_active: bool


# ──────────────── Subject ────────────────
class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    class_id: int
    teacher_id: int | None = None
    coefficient: float = Field(default=1.0, gt=0, le=10)


class SubjectOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    class_id: int
    teacher_id: int | None
    coefficient: float
    is_active: bool


# ──────────────── Parent ────────────────
class ParentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = None


class ParentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    address: str | None
    is_active: bool


# ──────────────── Student ────────────────
class StudentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    birth_date: datetime | None = None
    gender: str | None = Field(None, pattern="^(M|F|other)$")
    class_id: int | None = None
    parent_id: int | None = None


class StudentUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    class_id: int | None = None
    parent_id: int | None = None
    is_active: bool | None = None


class StudentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    student_number: str
    first_name: str
    last_name: str
    birth_date: datetime | None
    gender: str | None
    class_id: int | None
    parent_id: int | None
    is_active: bool
    created_at: datetime


# ──────────────── Grade ────────────────
class GradeCreate(BaseModel):
    student_id: int
    subject_id: int
    term_id: int
    score: float = Field(ge=0, le=20)
    max_score: float = Field(default=20.0, gt=0)
    comment: str | None = Field(None, max_length=500)


class GradeUpdate(BaseModel):
    score: float | None = Field(None, ge=0, le=20)
    comment: str | None = Field(None, max_length=500)


class GradeOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    student_id: int
    subject_id: int
    term_id: int
    score: float
    max_score: float
    comment: str | None
    created_at: datetime


# ──────────────── FeeInvoice ────────────────
class FeeInvoiceCreate(BaseModel):
    student_id: int
    term_id: int | None = None
    amount: float = Field(gt=0)
    description: str = Field(min_length=1, max_length=500)
    due_date: datetime | None = None


class FeePaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: str = Field(default="CASH", pattern="^(CASH|MOBILE_MONEY|BANK_TRANSFER)$")
    reference: str | None = None


class FeeInvoiceOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    invoice_number: str
    student_id: int
    term_id: int | None
    amount: float
    description: str
    due_date: datetime | None
    status: str
    created_at: datetime
    payments: list["FeePaymentOut"]


class FeePaymentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    fee_invoice_id: int
    amount: float
    method: str
    reference: str | None
    paid_at: datetime


# ──────────────── Bulletin ────────────────
class BulletinRequest(BaseModel):
    student_id: int
    term_id: int


# ──────────────── Dashboard ────────────────
class SchoolDashboard(BaseModel):
    total_students: int
    active_classes: int
    total_teachers: int
    fees_collected: float
    fees_pending: float
    top_students: list[dict[str, Any]]


# ──────────────── Pagination ────────────────
class Paginated(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
