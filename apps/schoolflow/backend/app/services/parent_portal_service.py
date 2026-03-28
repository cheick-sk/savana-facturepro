"""Parent Portal service layer for SchoolFlow Africa."""
from __future__ import annotations

import logging
import secrets
import uuid
from datetime import datetime, timedelta, date, timezone
from typing import Any

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import and_, func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.parent_portal import (
    ParentAccount, ParentNotification, ParentMessage, ParentStudent, ParentAccessToken
)
from app.models.all_models import Parent, Student, Class, Grade, FeeInvoice, FeePayment, Term, User, Subject
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.timetable import TimetableEntry, TimeSlot

logger = logging.getLogger(__name__)
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30
MAGIC_LINK_EXPIRE_MINUTES = 15


class ParentPortalService:
    """Service for parent portal operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────── Authentication ────────────────
    
    def _hash_password(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password."""
        return pwd_context.verify(plain_password, hashed_password)

    def _create_access_token(self, parent_id: int) -> str:
        """Create JWT access token."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        return jwt.encode(
            {"sub": str(parent_id), "type": "access", "exp": expire},
            settings.SECRET_KEY,
            algorithm=ALGORITHM
        )

    def _create_refresh_token(self) -> str:
        """Create refresh token."""
        return secrets.token_urlsafe(32)

    def _create_magic_token(self) -> str:
        """Create magic link token."""
        return secrets.token_urlsafe(32)

    async def register(
        self,
        first_name: str,
        last_name: str,
        email: str,
        password: str,
        phone: str | None = None,
        student_ids: list[int] | None = None
    ) -> ParentAccount:
        """Register a new parent account."""
        # Check if email already exists
        existing = await self.db.execute(
            select(ParentAccount).where(ParentAccount.email == email)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Un compte existe déjà avec cet email")

        # Create parent record
        parent = Parent(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone
        )
        self.db.add(parent)
        await self.db.flush()

        # Create account
        account = ParentAccount(
            parent_id=parent.id,
            email=email,
            phone=phone,
            password_hash=self._hash_password(password),
            notification_channels=["sms", "email"]
        )
        self.db.add(account)
        await self.db.flush()

        # Link students if provided
        if student_ids:
            for student_id in student_ids:
                await self._link_student(parent.id, student_id)

        await self.db.refresh(account)
        return account

    async def login(self, email: str, password: str) -> ParentAccount:
        """Login with email and password."""
        result = await self.db.execute(
            select(ParentAccount)
            .options(selectinload(ParentAccount.parent))
            .where(ParentAccount.email == email)
        )
        account = result.scalar_one_or_none()

        if not account or not account.password_hash:
            raise ValueError("Email ou mot de passe incorrect")

        if not self._verify_password(password, account.password_hash):
            raise ValueError("Email ou mot de passe incorrect")

        if not account.is_active:
            raise ValueError("Votre compte a été désactivé")

        # Update tokens
        access_token = self._create_access_token(account.parent_id)
        refresh_token = self._create_refresh_token()

        account.refresh_token = refresh_token
        account.refresh_token_expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        account.last_login = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(account)

        return account

    async def request_magic_link(self, email: str) -> None:
        """Request a magic link for passwordless login."""
        result = await self.db.execute(
            select(ParentAccount)
            .options(selectinload(ParentAccount.parent))
            .where(ParentAccount.email == email)
        )
        account = result.scalar_one_or_none()

        if not account or not account.is_active:
            # Don't reveal if account exists
            return

        # Generate magic token
        magic_token = self._create_magic_token()
        account.magic_token = magic_token
        account.magic_token_expires = datetime.now(timezone.utc) + timedelta(minutes=MAGIC_LINK_EXPIRE_MINUTES)

        await self.db.flush()

        # TODO: Send email with magic link
        # For now, just log it
        logger.info(f"Magic link for {email}: {magic_token}")

    async def verify_magic_link(self, token: str) -> ParentAccount:
        """Verify magic link token."""
        result = await self.db.execute(
            select(ParentAccount)
            .options(selectinload(ParentAccount.parent))
            .where(
                and_(
                    ParentAccount.magic_token == token,
                    ParentAccount.magic_token_expires > datetime.now(timezone.utc)
                )
            )
        )
        account = result.scalar_one_or_none()

        if not account:
            raise ValueError("Lien invalide ou expiré")

        if not account.is_active:
            raise ValueError("Votre compte a été désactivé")

        # Clear magic token and set tokens
        account.magic_token = None
        account.magic_token_expires = None
        account.refresh_token = self._create_refresh_token()
        account.refresh_token_expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        account.last_login = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(account)

        return account

    async def refresh_tokens(self, refresh_token: str) -> ParentAccount:
        """Refresh access token."""
        result = await self.db.execute(
            select(ParentAccount)
            .options(selectinload(ParentAccount.parent))
            .where(
                and_(
                    ParentAccount.refresh_token == refresh_token,
                    ParentAccount.refresh_token_expires > datetime.now(timezone.utc)
                )
            )
        )
        account = result.scalar_one_or_none()

        if not account:
            raise ValueError("Session expirée")

        # Generate new tokens
        account.refresh_token = self._create_refresh_token()
        account.refresh_token_expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

        await self.db.flush()
        await self.db.refresh(account)

        return account

    async def get_current_parent(self, parent_id: int) -> ParentAccount | None:
        """Get current parent account."""
        result = await self.db.execute(
            select(ParentAccount)
            .options(selectinload(ParentAccount.parent))
            .where(ParentAccount.parent_id == parent_id)
        )
        return result.scalar_one_or_none()

    async def change_password(self, parent_id: int, current_password: str, new_password: str) -> None:
        """Change parent password."""
        account = await self.get_current_parent(parent_id)
        if not account or not account.password_hash:
            raise ValueError("Compte non trouvé")

        if not self._verify_password(current_password, account.password_hash):
            raise ValueError("Mot de passe actuel incorrect")

        account.password_hash = self._hash_password(new_password)
        await self.db.flush()

    # ──────────────── Children Management ────────────────

    async def _link_student(
        self,
        parent_id: int,
        student_id: int,
        relationship: str = "parent",
        is_primary: bool = False
    ) -> ParentStudent:
        """Link a student to a parent."""
        # Check if already linked
        existing = await self.db.execute(
            select(ParentStudent).where(
                and_(
                    ParentStudent.parent_id == parent_id,
                    ParentStudent.student_id == student_id
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Cet élève est déjà lié à ce parent")

        # Create link
        link = ParentStudent(
            parent_id=parent_id,
            student_id=student_id,
            relationship=relationship,
            is_primary=is_primary
        )
        self.db.add(link)
        await self.db.flush()

        return link

    async def link_student_by_number(
        self,
        parent_id: int,
        student_number: str,
        relationship: str = "parent"
    ) -> Student:
        """Link a student by their student number."""
        # Find student
        result = await self.db.execute(
            select(Student).where(Student.student_number == student_number)
        )
        student = result.scalar_one_or_none()

        if not student:
            raise ValueError("Numéro d'élève non trouvé")

        await self._link_student(parent_id, student.id, relationship)

        return student

    async def get_children(self, parent_id: int) -> list[dict[str, Any]]:
        """Get all children for a parent."""
        # Get parent-student relationships
        result = await self.db.execute(
            select(ParentStudent)
            .options(
                selectinload(ParentStudent.student).selectinload(Student.class_)
            )
            .where(ParentStudent.parent_id == parent_id)
        )
        links = result.scalars().all()

        children = []
        for link in links:
            student = link.student
            class_ = student.class_

            children.append({
                "id": student.id,
                "student_number": student.student_number,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "full_name": student.full_name,
                "birth_date": student.birth_date,
                "gender": student.gender,
                "is_active": student.is_active,
                "class_id": student.class_id,
                "class_name": class_.name if class_ else None,
                "class_level": class_.level if class_ else None,
                "relationship": link.relationship,
                "is_primary": link.is_primary
            })

        return children

    async def get_child_detail(self, parent_id: int, student_id: int) -> dict[str, Any] | None:
        """Get detailed child information."""
        # Verify access
        result = await self.db.execute(
            select(ParentStudent)
            .options(
                selectinload(ParentStudent.student).selectinload(Student.class_)
            )
            .where(
                and_(
                    ParentStudent.parent_id == parent_id,
                    ParentStudent.student_id == student_id
                )
            )
        )
        link = result.scalar_one_or_none()

        if not link:
            return None

        student = link.student
        class_ = student.class_

        # Calculate academic stats
        avg_grade = await self._calculate_student_average(student_id)
        attendance_rate = await self._calculate_attendance_rate(student_id)

        # Get fee info
        pending_fees, total_fees = await self._calculate_fee_totals(student_id)

        return {
            "id": student.id,
            "student_number": student.student_number,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "full_name": student.full_name,
            "birth_date": student.birth_date,
            "gender": student.gender,
            "is_active": student.is_active,
            "class_id": student.class_id,
            "class_name": class_.name if class_ else None,
            "class_level": class_.level if class_ else None,
            "relationship": link.relationship,
            "is_primary": link.is_primary,
            "average_grade": avg_grade,
            "attendance_rate": attendance_rate,
            "pending_fees": pending_fees,
            "total_fees": total_fees
        }

    # ──────────────── Grades ────────────────

    async def _calculate_student_average(self, student_id: int) -> float | None:
        """Calculate student's overall average."""
        result = await self.db.execute(
            select(Grade).where(Grade.student_id == student_id)
        )
        grades = result.scalars().all()

        if not grades:
            return None

        # Get subjects for coefficients
        subject_ids = [g.subject_id for g in grades]
        subjects_result = await self.db.execute(
            select(Subject).where(Subject.id.in_(subject_ids))
        )
        subjects = {s.id: s for s in subjects_result.scalars().all()}

        total_weighted = 0.0
        total_coeff = 0.0

        for grade in grades:
            subject = subjects.get(grade.subject_id)
            coeff = subject.coefficient if subject else 1.0
            percentage = (grade.score / grade.max_score) * 20 if grade.max_score > 0 else 0
            total_weighted += percentage * coeff
            total_coeff += coeff

        return round(total_weighted / total_coeff, 2) if total_coeff > 0 else None

    async def get_student_grades(
        self,
        student_id: int,
        term_id: int | None = None
    ) -> list[dict[str, Any]]:
        """Get grades for a student."""
        query = select(Grade).options(
            selectinload(Grade.subject).selectinload(Subject.teacher),
            selectinload(Grade.term)
        ).where(Grade.student_id == student_id)

        if term_id:
            query = query.where(Grade.term_id == term_id)

        result = await self.db.execute(query.order_by(Grade.created_at.desc()))
        grades = result.scalars().all()

        return [
            {
                "id": grade.id,
                "subject_id": grade.subject_id,
                "subject_name": grade.subject.name,
                "subject_coefficient": float(grade.subject.coefficient),
                "teacher_name": grade.subject.teacher.full_name if grade.subject.teacher else None,
                "term_id": grade.term_id,
                "term_name": grade.term.name,
                "academic_year": grade.term.academic_year,
                "score": float(grade.score),
                "max_score": float(grade.max_score),
                "percentage": round((grade.score / grade.max_score) * 100, 2) if grade.max_score > 0 else 0,
                "comment": grade.comment,
                "created_at": grade.created_at
            }
            for grade in grades
        ]

    async def get_student_grades_by_term(self, student_id: int, term_id: int) -> dict[str, Any]:
        """Get grades grouped by subject for a term."""
        grades = await self.get_student_grades(student_id, term_id)

        # Group by subject
        subjects = {}
        for grade in grades:
            subject_id = grade["subject_id"]
            if subject_id not in subjects:
                subjects[subject_id] = {
                    "subject_id": subject_id,
                    "subject_name": grade["subject_name"],
                    "coefficient": grade["subject_coefficient"],
                    "teacher_name": grade["teacher_name"],
                    "grades": [],
                    "average": 0.0
                }
            subjects[subject_id]["grades"].append(grade)

        # Calculate averages
        for subject in subjects.values():
            if subject["grades"]:
                avg = sum(g["score"] for g in subject["grades"]) / len(subject["grades"])
                subject["average"] = round(avg, 2)

        # Get term info
        term_result = await self.db.execute(select(Term).where(Term.id == term_id))
        term = term_result.scalar_one_or_none()

        return {
            "term_id": term_id,
            "term_name": term.name if term else "",
            "academic_year": term.academic_year if term else "",
            "subjects": list(subjects.values()),
            "overall_average": await self._calculate_student_average(student_id)
        }

    async def get_report_card(self, student_id: int, term_id: int) -> dict[str, Any]:
        """Generate report card for a term."""
        # Get student info
        student_result = await self.db.execute(
            select(Student).options(selectinload(Student.class_)).where(Student.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise ValueError("Élève non trouvé")

        # Get grades
        grades_data = await self.get_student_grades_by_term(student_id, term_id)

        # Get attendance stats
        attendance_stats = await self._get_attendance_stats_for_term(student_id, term_id)

        return {
            "student_id": student.id,
            "student_name": student.full_name,
            "student_number": student.student_number,
            "class_name": student.class_.name if student.class_ else "",
            "class_level": student.class_.level if student.class_ else "",
            **grades_data,
            **attendance_stats,
            "teacher_comment": None,  # TODO: Add to model
            "principal_comment": None,  # TODO: Add to model
            "generated_at": datetime.now(timezone.utc)
        }

    # ──────────────── Attendance ────────────────

    async def _calculate_attendance_rate(self, student_id: int) -> float:
        """Calculate attendance rate for current month."""
        stats = await self._get_student_attendance_stats(
            student_id,
            date.today().replace(day=1),
            date.today()
        )
        return stats["attendance_rate"]

    async def _get_student_attendance_stats(
        self,
        student_id: int,
        start_date: date,
        end_date: date
    ) -> dict[str, Any]:
        """Get attendance statistics for a student."""
        result = await self.db.execute(
            select(AttendanceRecord)
            .join(AttendanceSession)
            .where(
                and_(
                    AttendanceRecord.student_id == student_id,
                    AttendanceSession.date >= start_date,
                    AttendanceSession.date <= end_date
                )
            )
        )
        records = result.scalars().all()

        total = len(records)
        present = sum(1 for r in records if r.status == "present")
        absent = sum(1 for r in records if r.status == "absent")
        late = sum(1 for r in records if r.status == "late")
        excused = sum(1 for r in records if r.status == "excused")

        attendance_rate = ((present + late + excused) / total * 100) if total > 0 else 0
        punctuality_rate = (present / (present + late) * 100) if (present + late) > 0 else 0

        return {
            "total_days": total,
            "present_days": present,
            "absent_days": absent,
            "late_days": late,
            "excused_days": excused,
            "attendance_rate": round(attendance_rate, 2),
            "punctuality_rate": round(punctuality_rate, 2)
        }

    async def get_student_attendance(
        self,
        student_id: int,
        start_date: date | None = None,
        end_date: date | None = None
    ) -> list[dict[str, Any]]:
        """Get attendance records for a student."""
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        result = await self.db.execute(
            select(AttendanceRecord)
            .options(selectinload(AttendanceRecord.session).selectinload(AttendanceSession.class_))
            .where(
                and_(
                    AttendanceRecord.student_id == student_id,
                    AttendanceSession.date >= start_date,
                    AttendanceSession.date <= end_date
                )
            )
            .order_by(AttendanceRecord.created_at.desc())
        )
        records = result.scalars().all()

        return [
            {
                "id": record.id,
                "date": record.session.date,
                "status": record.status,
                "arrival_time": str(record.arrival_time) if record.arrival_time else None,
                "notes": record.notes,
                "class_name": record.session.class_.name if record.session.class_ else ""
            }
            for record in records
        ]

    async def get_student_attendance_stats(
        self,
        student_id: int,
        start_date: date | None = None,
        end_date: date | None = None
    ) -> dict[str, Any]:
        """Get attendance statistics for a student."""
        if not start_date:
            start_date = date.today().replace(day=1)
        if not end_date:
            end_date = date.today()

        return await self._get_student_attendance_stats(student_id, start_date, end_date)

    async def _get_attendance_stats_for_term(self, student_id: int, term_id: int) -> dict[str, Any]:
        """Get attendance stats for a term."""
        term_result = await self.db.execute(select(Term).where(Term.id == term_id))
        term = term_result.scalar_one_or_none()
        if not term:
            return {}

        # Convert datetime to date for query
        start_date = term.start_date.date() if hasattr(term.start_date, 'date') else term.start_date
        end_date = term.end_date.date() if hasattr(term.end_date, 'date') else term.end_date

        return await self._get_student_attendance_stats(student_id, start_date, end_date)

    # ──────────────── Timetable ────────────────

    async def get_student_timetable(self, student_id: int) -> dict[str, Any]:
        """Get timetable for a student."""
        # Get student's class
        student_result = await self.db.execute(
            select(Student).options(selectinload(Student.class_)).where(Student.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        if not student or not student.class_id:
            return {"days": [], "student_id": student_id}

        # Get timetable entries
        result = await self.db.execute(
            select(TimetableEntry)
            .options(
                selectinload(TimetableEntry.subject).selectinload(Subject.teacher),
                selectinload(TimetableEntry.time_slot)
            )
            .where(TimetableEntry.class_id == student.class_id)
            .order_by(TimetableEntry.day_of_week, TimeSlot.start_time)
        )
        entries = result.scalars().all()

        # Group by day
        days_dict = {}
        day_names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

        for entry in entries:
            day = entry.day_of_week
            if day not in days_dict:
                days_dict[day] = {
                    "day_of_week": day,
                    "day_name": day_names[day] if day < len(day_names) else f"Jour {day}",
                    "entries": []
                }

            days_dict[day]["entries"].append({
                "id": entry.id,
                "day_of_week": entry.day_of_week,
                "day_name": days_dict[day]["day_name"],
                "time_slot_id": entry.time_slot_id,
                "slot_name": entry.time_slot.name if entry.time_slot else "",
                "start_time": str(entry.time_slot.start_time) if entry.time_slot else "",
                "end_time": str(entry.time_slot.end_time) if entry.time_slot else "",
                "subject_name": entry.subject.name if entry.subject else "",
                "teacher_name": entry.subject.teacher.full_name if entry.subject and entry.subject.teacher else None,
                "room": entry.room
            })

        # Sort by day
        days = [days_dict[d] for d in sorted(days_dict.keys())]

        return {
            "student_id": student_id,
            "student_name": student.full_name,
            "class_name": student.class_.name if student.class_ else "",
            "days": days
        }

    # ──────────────── Fees ────────────────

    async def _calculate_fee_totals(self, student_id: int) -> tuple[float, float]:
        """Calculate pending and total fees for a student."""
        result = await self.db.execute(
            select(FeeInvoice).where(FeeInvoice.student_id == student_id)
        )
        invoices = result.scalars().all()

        total = sum(float(inv.amount) for inv in invoices)
        paid = sum(
            float(payment.amount)
            for inv in invoices
            for payment in inv.payments
        )
        pending = total - paid

        return pending, total

    async def get_student_fees(self, student_id: int) -> list[dict[str, Any]]:
        """Get fee invoices for a student."""
        result = await self.db.execute(
            select(FeeInvoice)
            .options(
                selectinload(FeeInvoice.student),
                selectinload(FeeInvoice.term),
                selectinload(FeeInvoice.payments)
            )
            .where(FeeInvoice.student_id == student_id)
            .order_by(FeeInvoice.created_at.desc())
        )
        invoices = result.scalars().all()

        return [
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "student_id": invoice.student_id,
                "student_name": invoice.student.full_name,
                "term_id": invoice.term_id,
                "term_name": invoice.term.name if invoice.term else None,
                "amount": float(invoice.amount),
                "description": invoice.description,
                "due_date": invoice.due_date,
                "status": invoice.status,
                "created_at": invoice.created_at,
                "amount_paid": sum(float(p.amount) for p in invoice.payments),
                "amount_remaining": float(invoice.amount) - sum(float(p.amount) for p in invoice.payments),
                "payments": [
                    {
                        "id": p.id,
                        "amount": float(p.amount),
                        "method": p.method,
                        "reference": p.reference,
                        "paid_at": p.paid_at
                    }
                    for p in invoice.payments
                ]
            }
            for invoice in invoices
        ]

    async def process_payment(
        self,
        fee_invoice_id: int,
        amount: float,
        method: str,
        reference: str | None = None,
        phone_number: str | None = None,
        provider: str | None = None
    ) -> FeePayment:
        """Process a payment for a fee invoice."""
        # Get invoice
        result = await self.db.execute(
            select(FeeInvoice).where(FeeInvoice.id == fee_invoice_id)
        )
        invoice = result.scalar_one_or_none()

        if not invoice:
            raise ValueError("Facture non trouvée")

        # Calculate remaining amount
        paid = sum(float(p.amount) for p in invoice.payments)
        remaining = float(invoice.amount) - paid

        if amount > remaining:
            raise ValueError(f"Le montant dépasse le reste à payer ({remaining})")

        # Create payment
        payment = FeePayment(
            fee_invoice_id=fee_invoice_id,
            amount=amount,
            method=method,
            reference=reference or f"PAY-{secrets.token_hex(6).upper()}"
        )
        self.db.add(payment)

        # Update invoice status
        new_paid = paid + amount
        if new_paid >= float(invoice.amount):
            invoice.status = "PAID"
        elif invoice.due_date and invoice.due_date < datetime.now(timezone.utc):
            invoice.status = "OVERDUE"

        await self.db.flush()
        await self.db.refresh(payment)

        return payment

    async def process_mobile_money_payment(
        self,
        fee_invoice_id: int,
        amount: float,
        provider: str,
        phone_number: str
    ) -> dict[str, Any]:
        """Process mobile money payment (placeholder for integration)."""
        # TODO: Integrate with actual mobile money providers
        # For now, create a pending payment

        reference = f"{provider.upper()}-{secrets.token_hex(6).upper()}"

        payment = await self.process_payment(
            fee_invoice_id=fee_invoice_id,
            amount=amount,
            method="MOBILE_MONEY",
            reference=reference,
            phone_number=phone_number,
            provider=provider
        )

        return {
            "payment_id": payment.id,
            "reference": reference,
            "status": "pending",
            "provider": provider,
            "phone_number": phone_number,
            "amount": amount
        }

    # ──────────────── Messages ────────────────

    async def get_messages(
        self,
        parent_id: int,
        unread_only: bool = False,
        page: int = 1,
        size: int = 20
    ) -> tuple[list[dict[str, Any]], int]:
        """Get messages for a parent."""
        query = select(ParentMessage).where(ParentMessage.parent_id == parent_id)

        if unread_only:
            query = query.where(ParentMessage.read == False)

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        # Get messages
        query = query.order_by(ParentMessage.created_at.desc())
        query = query.offset((page - 1) * size).limit(size)

        result = await self.db.execute(query)
        messages = result.scalars().all()

        return [
            {
                "id": msg.id,
                "subject": msg.subject,
                "content": msg.content,
                "sender_type": msg.sender_type,
                "sender_name": msg.sender_name,
                "thread_id": msg.thread_id,
                "reply_to_id": msg.reply_to_id,
                "student_id": msg.student_id,
                "priority": msg.priority,
                "category": msg.category,
                "read": msg.read,
                "read_at": msg.read_at,
                "created_at": msg.created_at
            }
            for msg in messages
        ], total

    async def send_message(
        self,
        parent_id: int,
        subject: str,
        content: str,
        student_id: int | None = None,
        category: str | None = None,
        priority: str = "normal"
    ) -> ParentMessage:
        """Send a message from parent to school."""
        # Get parent info for sender name
        parent_result = await self.db.execute(select(Parent).where(Parent.id == parent_id))
        parent = parent_result.scalar_one_or_none()

        message = ParentMessage(
            parent_id=parent_id,
            subject=subject,
            content=content,
            sender_type="parent",
            sender_id=parent_id,
            sender_name=parent.full_name if parent else None,
            student_id=student_id,
            category=category,
            priority=priority,
            thread_id=str(uuid.uuid4())  # New thread
        )
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)

        return message

    async def reply_to_message(
        self,
        parent_id: int,
        message_id: int,
        content: str
    ) -> ParentMessage:
        """Reply to a message."""
        # Get original message
        original_result = await self.db.execute(
            select(ParentMessage).where(ParentMessage.id == message_id)
        )
        original = original_result.scalar_one_or_none()

        if not original:
            raise ValueError("Message non trouvé")

        # Get parent info
        parent_result = await self.db.execute(select(Parent).where(Parent.id == parent_id))
        parent = parent_result.scalar_one_or_none()

        # Create reply
        reply = ParentMessage(
            parent_id=parent_id,
            subject=f"Re: {original.subject}",
            content=content,
            sender_type="parent",
            sender_id=parent_id,
            sender_name=parent.full_name if parent else None,
            student_id=original.student_id,
            reply_to_id=message_id,
            thread_id=original.thread_id,
            category=original.category
        )
        self.db.add(reply)
        await self.db.flush()
        await self.db.refresh(reply)

        return reply

    async def mark_message_read(self, parent_id: int, message_id: int) -> None:
        """Mark a message as read."""
        result = await self.db.execute(
            select(ParentMessage).where(
                and_(
                    ParentMessage.id == message_id,
                    ParentMessage.parent_id == parent_id
                )
            )
        )
        message = result.scalar_one_or_none()

        if message and not message.read:
            message.read = True
            message.read_at = datetime.now(timezone.utc)
            await self.db.flush()

    # ──────────────── Notifications ────────────────

    async def get_notifications(
        self,
        parent_id: int,
        unread_only: bool = False,
        page: int = 1,
        size: int = 20
    ) -> tuple[list[dict[str, Any]], int, int]:
        """Get notifications for a parent."""
        query = select(ParentNotification).where(ParentNotification.parent_id == parent_id)

        if unread_only:
            query = query.where(ParentNotification.read == False)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        # Count unread
        unread_query = select(func.count()).select_from(
            select(ParentNotification)
            .where(
                and_(
                    ParentNotification.parent_id == parent_id,
                    ParentNotification.read == False
                )
            ).subquery()
        )
        unread_count = (await self.db.execute(unread_query)).scalar() or 0

        # Get notifications
        query = query.order_by(ParentNotification.created_at.desc())
        query = query.offset((page - 1) * size).limit(size)

        result = await self.db.execute(
            query.options(selectinload(ParentNotification.student))
        )
        notifications = result.scalars().all()

        return [
            {
                "id": notif.id,
                "type": notif.type,
                "title": notif.title,
                "content": notif.content,
                "student_id": notif.student_id,
                "student_name": notif.student.full_name if notif.student else None,
                "reference_type": notif.reference_type,
                "reference_id": notif.reference_id,
                "read": notif.read,
                "read_at": notif.read_at,
                "created_at": notif.created_at
            }
            for notif in notifications
        ], total, unread_count

    async def mark_notification_read(self, parent_id: int, notification_id: int) -> None:
        """Mark a notification as read."""
        result = await self.db.execute(
            select(ParentNotification).where(
                and_(
                    ParentNotification.id == notification_id,
                    ParentNotification.parent_id == parent_id
                )
            )
        )
        notification = result.scalar_one_or_none()

        if notification and not notification.read:
            notification.read = True
            notification.read_at = datetime.now(timezone.utc)
            await self.db.flush()

    async def mark_all_notifications_read(self, parent_id: int) -> int:
        """Mark all notifications as read for a parent."""
        result = await self.db.execute(
            select(ParentNotification).where(
                and_(
                    ParentNotification.parent_id == parent_id,
                    ParentNotification.read == False
                )
            )
        )
        notifications = result.scalars().all()

        count = 0
        for notif in notifications:
            notif.read = True
            notif.read_at = datetime.now(timezone.utc)
            count += 1

        await self.db.flush()
        return count

    # ──────────────── Dashboard ────────────────

    async def get_dashboard(self, parent_id: int) -> dict[str, Any]:
        """Get dashboard data for parent."""
        # Get parent info
        account = await self.get_current_parent(parent_id)
        if not account:
            raise ValueError("Compte non trouvé")

        # Get children
        children = await self.get_children(parent_id)

        # Get unread counts
        messages_result = await self.db.execute(
            select(func.count()).select_from(
                select(ParentMessage).where(
                    and_(
                        ParentMessage.parent_id == parent_id,
                        ParentMessage.read == False
                    )
                ).subquery()
            )
        )
        unread_messages = messages_result.scalar() or 0

        notifs_result = await self.db.execute(
            select(func.count()).select_from(
                select(ParentNotification).where(
                    and_(
                        ParentNotification.parent_id == parent_id,
                        ParentNotification.read == False
                    )
                ).subquery()
            )
        )
        unread_notifications = notifs_result.scalar() or 0

        # Get pending fees total
        pending_total = 0.0
        upcoming_payments = []

        for child in children:
            pending, total = await self._calculate_fee_totals(child["id"])
            pending_total += pending

            # Get upcoming payments
            fees = await self.get_student_fees(child["id"])
            for fee in fees:
                if fee["status"] != "PAID" and fee["amount_remaining"] > 0:
                    upcoming_payments.append(fee)

        # Sort by due date
        upcoming_payments.sort(key=lambda x: x["due_date"] or datetime.max)

        # Get recent grades
        recent_grades = []
        for child in children[:3]:  # Limit to 3 children
            grades = await self.get_student_grades(child["id"])
            recent_grades.extend(grades[:5])  # 5 recent grades per child

        recent_grades.sort(key=lambda x: x["created_at"], reverse=True)
        recent_grades = recent_grades[:10]  # Top 10 recent grades

        # Get recent attendance
        recent_attendance = []
        for child in children[:3]:
            attendance = await self.get_student_attendance(child["id"])
            recent_attendance.extend(attendance[:5])

        recent_attendance.sort(key=lambda x: x["date"], reverse=True)
        recent_attendance = recent_attendance[:10]

        # Get recent notifications
        recent_notifications, _, _ = await self.get_notifications(parent_id, size=5)

        # Enrich children with details
        children_details = []
        for child in children:
            detail = await self.get_child_detail(parent_id, child["id"])
            if detail:
                children_details.append(detail)

        return {
            "parent": {
                "id": account.parent.id,
                "first_name": account.parent.first_name,
                "last_name": account.parent.last_name,
                "email": account.parent.email,
                "phone": account.parent.phone,
                "address": account.parent.address,
                "full_name": account.parent.full_name
            },
            "children_count": len(children),
            "unread_messages": unread_messages,
            "unread_notifications": unread_notifications,
            "pending_fees_total": pending_total,
            "upcoming_payments": upcoming_payments[:5],
            "recent_grades": recent_grades,
            "recent_attendance": recent_attendance,
            "recent_notifications": recent_notifications,
            "children": children_details
        }

    # ──────────────── Profile ────────────────

    async def update_profile(
        self,
        parent_id: int,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        address: str | None = None
    ) -> Parent:
        """Update parent profile."""
        result = await self.db.execute(select(Parent).where(Parent.id == parent_id))
        parent = result.scalar_one_or_none()

        if not parent:
            raise ValueError("Parent non trouvé")

        if first_name:
            parent.first_name = first_name
        if last_name:
            parent.last_name = last_name
        if phone is not None:
            parent.phone = phone
        if address is not None:
            parent.address = address

        await self.db.flush()
        await self.db.refresh(parent)
        return parent

    async def update_account_settings(
        self,
        parent_id: int,
        preferred_language: str | None = None,
        notification_channels: list[str] | None = None,
        receive_sms_notifications: bool | None = None,
        receive_email_notifications: bool | None = None
    ) -> ParentAccount:
        """Update parent account settings."""
        account = await self.get_current_parent(parent_id)
        if not account:
            raise ValueError("Compte non trouvé")

        if preferred_language:
            account.preferred_language = preferred_language
        if notification_channels is not None:
            account.notification_channels = notification_channels
        if receive_sms_notifications is not None:
            account.receive_sms_notifications = receive_sms_notifications
        if receive_email_notifications is not None:
            account.receive_email_notifications = receive_email_notifications

        await self.db.flush()
        await self.db.refresh(account)
        return account
