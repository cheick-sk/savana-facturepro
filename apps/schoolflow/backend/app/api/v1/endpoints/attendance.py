"""Attendance API endpoints for SchoolFlow Africa."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User
from app.schemas.attendance import (
    AttendanceSessionCreate,
    AttendanceSessionOut,
    AttendanceSessionDetail,
    AttendanceRecordCreate,
    AttendanceRecordUpdate,
    AttendanceRecordOut,
    AttendanceRecordWithStudent,
    BulkAttendanceCreate,
    AttendanceSettingsCreate,
    AttendanceSettingsUpdate,
    AttendanceSettingsOut,
    AttendanceStats,
    ClassAttendanceStats,
    StudentAttendanceStats,
    DailyAttendanceStats,
    AttendanceCalendarDay,
    AttendanceCalendarMonth,
    AttendanceReportRequest,
    StudentAttendanceHistory,
    Paginated,
)
from app.services.attendance_service import AttendanceService
from app.tasks.attendance import notify_parents_absence

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ──────────────── Sessions ────────────────
@router.post("/sessions", response_model=AttendanceSessionOut, status_code=201)
async def start_session(
    data: AttendanceSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new attendance session for a class."""
    service = AttendanceService(db)
    try:
        session = await service.start_session(
            class_id=data.class_id,
            user_id=current_user.id,
            session_date=data.date
        )
        return AttendanceSessionOut.model_validate(session)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/sessions", response_model=Paginated)
async def list_sessions(
    class_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List attendance sessions with filters."""
    service = AttendanceService(db)
    sessions, total = await service.list_sessions(
        class_id=class_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
        page=page,
        size=size
    )
    
    # Build output with class name
    items = []
    for session in sessions:
        item = AttendanceSessionOut.model_validate(session)
        items.append(item)
    
    return Paginated(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=max(1, (total + size - 1) // size)
    )


@router.get("/sessions/{session_id}", response_model=AttendanceSessionDetail)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get an attendance session with details."""
    service = AttendanceService(db)
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    # Build output
    result = AttendanceSessionDetail.model_validate(session)
    result.class_name = session.class_.name if session.class_ else None
    result.created_by_name = session.created_by_user.full_name if session.created_by_user else None
    
    # Add student info to records
    records_with_student = []
    for record in session.records:
        rec = AttendanceRecordWithStudent.model_validate(record)
        if record.student:
            rec.student_first_name = record.student.first_name
            rec.student_last_name = record.student.last_name
            rec.student_number = record.student.student_number
        records_with_student.append(rec)
    result.records = records_with_student
    
    return result


@router.put("/sessions/{session_id}/complete", response_model=AttendanceSessionOut)
async def complete_session(
    session_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark an attendance session as completed."""
    service = AttendanceService(db)
    try:
        session = await service.complete_session(session_id)
        
        # Trigger notifications for absent students
        if session:
            for record in session.records:
                if record.status == "absent":
                    notify_parents_absence.delay(record.id)
        
        return AttendanceSessionOut.model_validate(session)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ──────────────── Records ────────────────
@router.post("/records", response_model=AttendanceRecordOut, status_code=201)
async def record_attendance(
    data: AttendanceRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record attendance for a single student."""
    service = AttendanceService(db)
    try:
        record = await service.record_attendance(
            session_id=data.session_id,
            student_id=data.student_id,
            status=data.status,
            arrival_time=data.arrival_time,
            notes=data.notes
        )
        return AttendanceRecordOut.model_validate(record)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/records/{record_id}", response_model=AttendanceRecordOut)
async def update_record(
    record_id: int,
    data: AttendanceRecordUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Update an attendance record."""
    from sqlalchemy import select
    from app.models.attendance import AttendanceRecord
    
    # Get record
    result = await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Record not found")
    
    service = AttendanceService(db)
    updated = await service.record_attendance(
        session_id=record.session_id,
        student_id=record.student_id,
        status=data.status or record.status,
        arrival_time=data.arrival_time,
        notes=data.notes
    )
    return AttendanceRecordOut.model_validate(updated)


@router.post("/bulk", response_model=AttendanceSessionDetail, status_code=201)
async def bulk_record_attendance(
    data: BulkAttendanceCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk record attendance for a class."""
    service = AttendanceService(db)
    
    records_data = [r.model_dump() for r in data.records]
    
    try:
        session = await service.bulk_record_attendance(
            class_id=data.class_id,
            records=records_data,
            user_id=current_user.id,
            session_date=data.date
        )
        
        # Get detailed session
        detail_session = await service.get_session(session.id)
        
        result = AttendanceSessionDetail.model_validate(detail_session)
        result.class_name = detail_session.class_.name if detail_session.class_ else None
        result.created_by_name = detail_session.created_by_user.full_name if detail_session.created_by_user else None
        
        # Add student info to records
        records_with_student = []
        for record in detail_session.records:
            rec = AttendanceRecordWithStudent.model_validate(record)
            if record.student:
                rec.student_first_name = record.student.first_name
                rec.student_last_name = record.student.last_name
                rec.student_number = record.student.student_number
            records_with_student.append(rec)
        result.records = records_with_student
        
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


# ──────────────── Class Attendance ────────────────
@router.get("/class/{class_id}/today", response_model=AttendanceSessionDetail | None)
async def get_class_today_attendance(
    class_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get today's attendance session for a class."""
    service = AttendanceService(db)
    session = await service.get_class_today_attendance(class_id)
    
    if not session:
        return None
    
    result = AttendanceSessionDetail.model_validate(session)
    result.class_name = session.class_.name if session.class_ else None
    result.created_by_name = session.created_by_user.full_name if session.created_by_user else None
    
    # Add student info to records
    records_with_student = []
    for record in session.records:
        rec = AttendanceRecordWithStudent.model_validate(record)
        if record.student:
            rec.student_first_name = record.student.first_name
            rec.student_last_name = record.student.last_name
            rec.student_number = record.student.student_number
        records_with_student.append(rec)
    result.records = records_with_student
    
    return result


@router.get("/class/{class_id}/stats", response_model=dict[str, Any])
async def get_class_stats(
    class_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get attendance statistics for a class."""
    service = AttendanceService(db)
    stats = await service.calculate_class_stats(class_id, start_date, end_date)
    return stats


@router.get("/class/{class_id}/calendar", response_model=list[dict[str, Any]])
async def get_class_calendar(
    class_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get attendance calendar for a class."""
    service = AttendanceService(db)
    calendar = await service.get_calendar_month(class_id, month, year)
    return calendar


@router.get("/class/{class_id}/daily-stats", response_model=list[DailyAttendanceStats])
async def get_class_daily_stats(
    class_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get daily attendance statistics for a class."""
    service = AttendanceService(db)
    stats = await service.get_monthly_daily_stats(class_id, month, year)
    return [DailyAttendanceStats(**s) for s in stats]


# ──────────────── Student History ────────────────
@router.get("/student/{student_id}/history")
async def get_student_history(
    student_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get attendance history for a student."""
    service = AttendanceService(db)
    records, total = await service.get_student_history(
        student_id=student_id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        size=size
    )
    stats = await service.calculate_student_stats(student_id, start_date, end_date)
    
    # Build output
    records_out = []
    for record in records:
        rec = AttendanceRecordWithStudent.model_validate(record)
        if record.student:
            rec.student_first_name = record.student.first_name
            rec.student_last_name = record.student.last_name
            rec.student_number = record.student.student_number
        if record.session:
            rec.session_id = record.session.id
        records_out.append(rec)
    
    return {
        "student_id": student_id,
        "records": records_out,
        "stats": stats,
        "total": total,
        "page": page,
        "size": size
    }


@router.get("/student/{student_id}/stats", response_model=dict[str, Any])
async def get_student_stats(
    student_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get attendance statistics for a student."""
    service = AttendanceService(db)
    stats = await service.calculate_student_stats(student_id, start_date, end_date)
    return stats


# ──────────────── Reports ────────────────
@router.post("/reports/monthly/{class_id}")
async def generate_monthly_report(
    class_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Generate monthly attendance report for a class."""
    from app.tasks.attendance import generate_attendance_report
    
    # Trigger async report generation
    task = generate_attendance_report.delay(class_id, month, year)
    
    return {
        "status": "processing",
        "task_id": task.id,
        "class_id": class_id,
        "month": month,
        "year": year
    }


# ──────────────── Settings ────────────────
@router.get("/settings", response_model=AttendanceSettingsOut)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get attendance settings."""
    service = AttendanceService(db)
    settings = await service.get_settings()
    return AttendanceSettingsOut.model_validate(settings)


@router.put("/settings", response_model=AttendanceSettingsOut)
async def update_settings(
    data: AttendanceSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update attendance settings."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Insufficient permissions")
    
    service = AttendanceService(db)
    settings = await service.update_settings(
        organisation_id=None,  # TODO: Get from user
        **data.model_dump(exclude_none=True)
    )
    return AttendanceSettingsOut.model_validate(settings)


# ──────────────── Alerts ────────────────
@router.get("/alerts/consecutive-absences")
async def get_consecutive_absences_alerts(
    threshold: int = Query(3, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get students with consecutive absences."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Insufficient permissions")
    
    service = AttendanceService(db)
    alerts = await service.get_students_with_consecutive_absences(threshold)
    return {"alerts": alerts, "threshold": threshold}
