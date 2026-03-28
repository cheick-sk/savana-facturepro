"""Attendance service layer for SchoolFlow Africa."""
from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import and_, func, select, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceSettings
from app.models.all_models import Class, Student, User, Parent

logger = logging.getLogger(__name__)


class AttendanceService:
    """Service for attendance operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def start_session(
        self, class_id: int, user_id: int, session_date: date | None = None
    ) -> AttendanceSession:
        """Start a new attendance session for a class."""
        session_date = session_date or date.today()
        
        # Check if session already exists
        existing = await self.db.execute(
            select(AttendanceSession).where(
                and_(
                    AttendanceSession.class_id == class_id,
                    AttendanceSession.date == session_date
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Attendance session already exists for class {class_id} on {session_date}")
        
        # Get all active students in the class
        students_result = await self.db.execute(
            select(Student).where(
                and_(Student.class_id == class_id, Student.is_active == True)
            )
        )
        students = students_result.scalars().all()
        
        # Create session
        session = AttendanceSession(
            class_id=class_id,
            date=session_date,
            created_by=user_id,
            total_students=len(students),
            status="in_progress"
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        
        # Create records for all students (default to absent)
        for student in students:
            record = AttendanceRecord(
                session_id=session.id,
                student_id=student.id,
                status="absent"
            )
            self.db.add(record)
        
        await self.db.flush()
        return session

    async def get_session(self, session_id: int) -> AttendanceSession | None:
        """Get an attendance session by ID."""
        result = await self.db.execute(
            select(AttendanceSession)
            .options(selectinload(AttendanceSession.records).selectinload(AttendanceRecord.student))
            .where(AttendanceSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_session_by_class_and_date(
        self, class_id: int, session_date: date
    ) -> AttendanceSession | None:
        """Get attendance session by class and date."""
        result = await self.db.execute(
            select(AttendanceSession)
            .options(selectinload(AttendanceSession.records).selectinload(AttendanceRecord.student))
            .where(
                and_(
                    AttendanceSession.class_id == class_id,
                    AttendanceSession.date == session_date
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_sessions(
        self,
        class_id: int | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status: str | None = None,
        page: int = 1,
        size: int = 20
    ) -> tuple[list[AttendanceSession], int]:
        """List attendance sessions with filters."""
        query = select(AttendanceSession).options(
            selectinload(AttendanceSession.class_)
        )
        
        if class_id:
            query = query.where(AttendanceSession.class_id == class_id)
        if start_date:
            query = query.where(AttendanceSession.date >= start_date)
        if end_date:
            query = query.where(AttendanceSession.date <= end_date)
        if status:
            query = query.where(AttendanceSession.status == status)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0
        
        # Paginate
        query = query.order_by(AttendanceSession.date.desc())
        query = query.offset((page - 1) * size).limit(size)
        
        result = await self.db.execute(query)
        sessions = list(result.scalars().all())
        
        return sessions, total

    async def record_attendance(
        self,
        session_id: int,
        student_id: int,
        status: str,
        arrival_time: time | None = None,
        notes: str | None = None
    ) -> AttendanceRecord:
        """Record attendance for a single student."""
        # Get record
        result = await self.db.execute(
            select(AttendanceRecord).where(
                and_(
                    AttendanceRecord.session_id == session_id,
                    AttendanceRecord.student_id == student_id
                )
            )
        )
        record = result.scalar_one_or_none()
        if not record:
            raise ValueError(f"Attendance record not found for student {student_id} in session {session_id}")
        
        # Update record
        record.status = status
        record.arrival_time = arrival_time
        record.notes = notes
        
        await self.db.flush()
        await self._update_session_counts(session_id)
        await self.db.refresh(record)
        
        return record

    async def bulk_record_attendance(
        self,
        class_id: int,
        records: list[dict[str, Any]],
        user_id: int,
        session_date: date | None = None
    ) -> AttendanceSession:
        """Bulk record attendance for a class."""
        session_date = session_date or date.today()
        
        # Get or create session
        session = await self.get_session_by_class_and_date(class_id, session_date)
        if not session:
            session = await self.start_session(class_id, user_id, session_date)
        
        # Update all records
        for record_data in records:
            student_id = record_data["student_id"]
            status = record_data["status"]
            arrival_time = record_data.get("arrival_time")
            notes = record_data.get("notes")
            
            # Get existing record
            result = await self.db.execute(
                select(AttendanceRecord).where(
                    and_(
                        AttendanceRecord.session_id == session.id,
                        AttendanceRecord.student_id == student_id
                    )
                )
            )
            record = result.scalar_one_or_none()
            if record:
                record.status = status
                record.arrival_time = arrival_time
                record.notes = notes
        
        await self.db.flush()
        await self._update_session_counts(session.id)
        await self.db.refresh(session)
        
        return session

    async def complete_session(self, session_id: int) -> AttendanceSession:
        """Mark an attendance session as completed."""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.status = "completed"
        await self.db.flush()
        await self.db.refresh(session)
        
        return session

    async def _update_session_counts(self, session_id: int) -> None:
        """Update the counts in a session based on records."""
        # Count by status
        result = await self.db.execute(
            select(
                AttendanceRecord.status,
                func.count(AttendanceRecord.id)
            )
            .where(AttendanceRecord.session_id == session_id)
            .group_by(AttendanceRecord.status)
        )
        counts = {row[0]: row[1] for row in result.all()}
        
        # Get session
        session_result = await self.db.execute(
            select(AttendanceSession).where(AttendanceSession.id == session_id)
        )
        session = session_result.scalar_one_or_none()
        if session:
            session.present_count = counts.get("present", 0)
            session.absent_count = counts.get("absent", 0)
            session.late_count = counts.get("late", 0)
            session.excused_count = counts.get("excused", 0)

    async def get_class_today_attendance(self, class_id: int) -> AttendanceSession | None:
        """Get today's attendance session for a class."""
        return await self.get_session_by_class_and_date(class_id, date.today())

    async def get_student_history(
        self,
        student_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        size: int = 30
    ) -> tuple[list[AttendanceRecord], int]:
        """Get attendance history for a student."""
        query = select(AttendanceRecord).options(
            selectinload(AttendanceRecord.session)
        ).where(AttendanceRecord.student_id == student_id)
        
        if start_date:
            query = query.join(AttendanceSession).where(AttendanceSession.date >= start_date)
        if end_date:
            query = query.join(AttendanceSession).where(AttendanceSession.date <= end_date)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0
        
        # Paginate
        query = query.order_by(AttendanceRecord.created_at.desc())
        query = query.offset((page - 1) * size).limit(size)
        
        result = await self.db.execute(query)
        records = list(result.scalars().all())
        
        return records, total

    async def calculate_class_stats(
        self,
        class_id: int,
        start_date: date | None = None,
        end_date: date | None = None
    ) -> dict[str, Any]:
        """Calculate attendance statistics for a class."""
        # Default to current month
        if not start_date:
            start_date = date.today().replace(day=1)
        if not end_date:
            end_date = date.today()
        
        # Get all sessions in period
        sessions_result = await self.db.execute(
            select(AttendanceSession).where(
                and_(
                    AttendanceSession.class_id == class_id,
                    AttendanceSession.date >= start_date,
                    AttendanceSession.date <= end_date
                )
            )
        )
        sessions = sessions_result.scalars().all()
        
        total_days = len(sessions)
        total_present = sum(s.present_count for s in sessions)
        total_absent = sum(s.absent_count for s in sessions)
        total_late = sum(s.late_count for s in sessions)
        total_excused = sum(s.excused_count for s in sessions)
        total_records = total_present + total_absent + total_late + total_excused
        
        attendance_rate = (total_present + total_late + total_excused) / total_records * 100 if total_records > 0 else 0
        punctuality_rate = total_present / (total_present + total_late) * 100 if (total_present + total_late) > 0 else 0
        
        return {
            "class_id": class_id,
            "period_start": start_date,
            "period_end": end_date,
            "total_days": total_days,
            "present_days": total_present,
            "absent_days": total_absent,
            "late_days": total_late,
            "excused_days": total_excused,
            "attendance_rate": round(attendance_rate, 2),
            "punctuality_rate": round(punctuality_rate, 2)
        }

    async def calculate_student_stats(
        self,
        student_id: int,
        start_date: date | None = None,
        end_date: date | None = None
    ) -> dict[str, Any]:
        """Calculate attendance statistics for a student."""
        if not start_date:
            start_date = date.today().replace(day=1)
        if not end_date:
            end_date = date.today()
        
        # Get all records in period
        records_result = await self.db.execute(
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
        records = records_result.scalars().all()
        
        total_days = len(records)
        present_days = sum(1 for r in records if r.status == "present")
        absent_days = sum(1 for r in records if r.status == "absent")
        late_days = sum(1 for r in records if r.status == "late")
        excused_days = sum(1 for r in records if r.status == "excused")
        
        attendance_rate = (present_days + late_days + excused_days) / total_days * 100 if total_days > 0 else 0
        punctuality_rate = present_days / (present_days + late_days) * 100 if (present_days + late_days) > 0 else 0
        
        # Calculate consecutive absences
        consecutive_absences = await self._get_consecutive_absences(student_id)
        
        return {
            "student_id": student_id,
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": absent_days,
            "late_days": late_days,
            "excused_days": excused_days,
            "attendance_rate": round(attendance_rate, 2),
            "punctuality_rate": round(punctuality_rate, 2),
            "consecutive_absences": consecutive_absences
        }

    async def _get_consecutive_absences(self, student_id: int) -> int:
        """Get the number of consecutive absences for a student."""
        # Get recent records ordered by date descending
        records_result = await self.db.execute(
            select(AttendanceRecord)
            .join(AttendanceSession)
            .where(AttendanceRecord.student_id == student_id)
            .order_by(AttendanceSession.date.desc())
            .limit(30)  # Check last 30 days
        )
        records = records_result.scalars().all()
        
        consecutive = 0
        for record in records:
            if record.status == "absent":
                consecutive += 1
            else:
                break
        
        return consecutive

    async def get_students_with_consecutive_absences(
        self, threshold: int = 3
    ) -> list[dict[str, Any]]:
        """Find all students with consecutive absences above threshold."""
        # Get all active students
        students_result = await self.db.execute(
            select(Student).where(Student.is_active == True)
        )
        students = students_result.scalars().all()
        
        result = []
        for student in students:
            consecutive = await self._get_consecutive_absences(student.id)
            if consecutive >= threshold:
                result.append({
                    "student_id": student.id,
                    "student_name": student.full_name,
                    "student_number": student.student_number,
                    "consecutive_absences": consecutive
                })
        
        return result

    async def get_settings(self, organisation_id: int | None = None) -> AttendanceSettings:
        """Get attendance settings for an organisation."""
        if organisation_id:
            result = await self.db.execute(
                select(AttendanceSettings).where(
                    AttendanceSettings.organisation_id == organisation_id
                )
            )
            settings = result.scalar_one_or_none()
            if settings:
                return settings
        
        # Return default settings
        return AttendanceSettings(
            organisation_id=organisation_id,
            auto_notify_absence=True,
            notification_channels=["sms", "whatsapp"],
            late_threshold_minutes=15,
            absence_alert_after=3
        )

    async def update_settings(
        self,
        organisation_id: int | None,
        **kwargs: Any
    ) -> AttendanceSettings:
        """Update attendance settings."""
        settings = await self.get_settings(organisation_id)
        
        if settings.id:  # Existing settings
            for key, value in kwargs.items():
                if hasattr(settings, key) and value is not None:
                    setattr(settings, key, value)
        else:  # Create new settings
            settings = AttendanceSettings(
                organisation_id=organisation_id,
                **{k: v for k, v in kwargs.items() if v is not None}
            )
            self.db.add(settings)
        
        await self.db.flush()
        await self.db.refresh(settings)
        return settings

    async def get_calendar_month(
        self, class_id: int, month: int, year: int
    ) -> list[dict[str, Any]]:
        """Get attendance calendar for a month."""
        # Calculate date range
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        # Get all sessions in month
        sessions_result = await self.db.execute(
            select(AttendanceSession).where(
                and_(
                    AttendanceSession.class_id == class_id,
                    AttendanceSession.date >= start_date,
                    AttendanceSession.date <= end_date
                )
            )
        )
        sessions = {s.date: s for s in sessions_result.scalars().all()}
        
        # Build calendar
        calendar = []
        current = start_date
        while current <= end_date:
            if current.weekday() < 6:  # Monday to Saturday
                session = sessions.get(current)
                if session:
                    calendar.append({
                        "date": current,
                        "status": session.status,
                        "present_count": session.present_count,
                        "absent_count": session.absent_count,
                        "late_count": session.late_count,
                        "total_students": session.total_students
                    })
                else:
                    calendar.append({
                        "date": current,
                        "status": "not_started",
                        "present_count": 0,
                        "absent_count": 0,
                        "late_count": 0,
                        "total_students": 0
                    })
            current += timedelta(days=1)
        
        return calendar

    async def get_monthly_daily_stats(
        self, class_id: int, month: int, year: int
    ) -> list[dict[str, Any]]:
        """Get daily attendance statistics for a month."""
        calendar = await self.get_calendar_month(class_id, month, year)
        
        stats = []
        for day in calendar:
            if day["total_students"] > 0:
                total = day["total_students"]
                present = day["present_count"]
                late = day["late_count"]
                absent = day["absent_count"]
                excused = total - present - late - absent
                
                attendance_rate = (present + late + excused) / total * 100 if total > 0 else 0
                
                stats.append({
                    "date": day["date"],
                    "present": present,
                    "absent": absent,
                    "late": late,
                    "excused": excused,
                    "total": total,
                    "attendance_rate": round(attendance_rate, 2)
                })
        
        return stats
