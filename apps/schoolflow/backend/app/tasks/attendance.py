"""Attendance tasks for SchoolFlow Africa."""
from __future__ import annotations

import logging
from datetime import date, datetime

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="app.tasks.attendance.notify_parents_absence")
def notify_parents_absence(record_id: int) -> dict:
    """
    Notify parents in case of absence.
    Sends SMS via Africa's Talking and WhatsApp message.
    """
    logger.info(f"Processing absence notification for record {record_id}")
    
    # Import here to avoid circular imports
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker
    from app.core.config import get_settings
    from app.models.attendance import AttendanceRecord, AttendanceSettings
    from app.models.all_models import Student, Parent, AttendanceSession
    
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    
    with Session() as db:
        try:
            # Get the attendance record with student and parent info
            record = db.execute(
                select(AttendanceRecord).where(AttendanceRecord.id == record_id)
            ).scalar_one_or_none()
            
            if not record:
                logger.error(f"Record {record_id} not found")
                return {"status": "error", "message": "Record not found"}
            
            if record.parent_notified:
                logger.info(f"Parents already notified for record {record_id}")
                return {"status": "skipped", "message": "Already notified"}
            
            if record.status not in ["absent", "late"]:
                logger.info(f"Record {record_id} status is {record.status}, no notification needed")
                return {"status": "skipped", "message": "Not absent or late"}
            
            # Get student with parent info
            student = db.execute(
                select(Student).where(Student.id == record.student_id)
            ).scalar_one_or_none()
            
            if not student:
                logger.error(f"Student {record.student_id} not found")
                return {"status": "error", "message": "Student not found"}
            
            # Get session for date
            session = db.execute(
                select(AttendanceSession).where(AttendanceSession.id == record.session_id)
            ).scalar_one_or_none()
            
            session_date = session.date if session else date.today()
            
            # Get parent info
            parent = None
            if student.parent_id:
                parent = db.execute(
                    select(Parent).where(Parent.id == student.parent_id)
                ).scalar_one_or_none()
            
            # Get settings
            settings_record = db.execute(
                select(AttendanceSettings)
            ).scalar_one_or_none()
            
            channels = settings_record.notification_channels if settings_record else ["sms", "whatsapp"]
            
            notifications_sent = []
            
            # Send SMS via Africa's Talking (if phone available)
            if "sms" in channels and parent and parent.phone:
                try:
                    # TODO: Integrate with Africa's Talking API
                    # from africastalking.Airtime import Airtime
                    # from africastalking.SMS import SMS
                    message = f"Cher parent, votre enfant {student.first_name} {student.last_name} est absent ce jour ({session_date}). Merci de contacter l'école."
                    logger.info(f"SMS would be sent to {parent.phone}: {message}")
                    notifications_sent.append("sms")
                except Exception as e:
                    logger.error(f"Failed to send SMS: {e}")
            
            # Send WhatsApp message
            if "whatsapp" in channels and parent and parent.phone:
                try:
                    # TODO: Integrate with WhatsApp Business API
                    message = f"📚 *SchoolFlow Africa*\n\nCher parent,\n\nVotre enfant *{student.first_name} {student.last_name}* est *_absent_* ce jour ({session_date}).\n\nMerci de contacter l'école pour plus d'informations."
                    logger.info(f"WhatsApp would be sent to {parent.phone}: {message}")
                    notifications_sent.append("whatsapp")
                except Exception as e:
                    logger.error(f"Failed to send WhatsApp: {e}")
            
            # Update notification status
            record.parent_notified = True
            record.notification_sent_at = datetime.utcnow()
            db.commit()
            
            return {
                "status": "success",
                "record_id": record_id,
                "student_name": f"{student.first_name} {student.last_name}",
                "notifications_sent": notifications_sent
            }
            
        except Exception as e:
            logger.error(f"Error processing notification: {e}")
            db.rollback()
            return {"status": "error", "message": str(e)}


@shared_task(name="app.tasks.attendance.generate_attendance_report")
def generate_attendance_report(class_id: int, month: int, year: int) -> dict:
    """
    Generate monthly attendance report.
    Creates a PDF report and sends it to school admin.
    """
    logger.info(f"Generating attendance report for class {class_id}, {month}/{year}")
    
    from sqlalchemy import create_engine, select, func
    from sqlalchemy.orm import sessionmaker
    from app.core.config import get_settings
    from app.models.attendance import AttendanceSession, AttendanceRecord
    from app.models.all_models import Class, Student
    from datetime import date, timedelta
    import io
    
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    
    with Session() as db:
        try:
            # Get class info
            class_obj = db.execute(
                select(Class).where(Class.id == class_id)
            ).scalar_one_or_none()
            
            if not class_obj:
                return {"status": "error", "message": "Class not found"}
            
            # Calculate date range
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)
            
            # Get all sessions in month
            sessions = db.execute(
                select(AttendanceSession).where(
                    AttendanceSession.class_id == class_id,
                    AttendanceSession.date >= start_date,
                    AttendanceSession.date <= end_date
                )
            ).scalars().all()
            
            # Calculate stats
            total_days = len(sessions)
            total_present = sum(s.present_count for s in sessions)
            total_absent = sum(s.absent_count for s in sessions)
            total_late = sum(s.late_count for s in sessions)
            total_excused = sum(s.excused_count for s in sessions)
            total_records = total_present + total_absent + total_late + total_excused
            
            attendance_rate = (total_present + total_late + total_excused) / total_records * 100 if total_records > 0 else 0
            
            # Get students with their attendance
            students = db.execute(
                select(Student).where(Student.class_id == class_id, Student.is_active == True)
            ).scalars().all()
            
            student_stats = []
            for student in students:
                records = db.execute(
                    select(AttendanceRecord)
                    .join(AttendanceSession)
                    .where(
                        AttendanceRecord.student_id == student.id,
                        AttendanceSession.date >= start_date,
                        AttendanceSession.date <= end_date
                    )
                ).scalars().all()
                
                s_present = sum(1 for r in records if r.status == "present")
                s_absent = sum(1 for r in records if r.status == "absent")
                s_late = sum(1 for r in records if r.status == "late")
                s_excused = sum(1 for r in records if r.status == "excused")
                s_total = len(records)
                
                s_rate = (s_present + s_late + s_excused) / s_total * 100 if s_total > 0 else 0
                
                student_stats.append({
                    "student_id": student.id,
                    "student_number": student.student_number,
                    "student_name": f"{student.first_name} {student.last_name}",
                    "present": s_present,
                    "absent": s_absent,
                    "late": s_late,
                    "excused": s_excused,
                    "total": s_total,
                    "rate": round(s_rate, 2)
                })
            
            # Sort by attendance rate
            student_stats.sort(key=lambda x: x["rate"], reverse=True)
            
            # Generate PDF (using reportlab or similar)
            report_id = f"ATT-{class_id}-{year}{month:02d}"
            
            # TODO: Generate actual PDF file
            # from reportlab.lib.pagesizes import A4
            # from reportlab.pdfgen import canvas
            # ...
            
            logger.info(f"Report generated: {report_id}")
            
            return {
                "status": "success",
                "report_id": report_id,
                "class_id": class_id,
                "class_name": class_obj.name,
                "month": month,
                "year": year,
                "total_days": total_days,
                "attendance_rate": round(attendance_rate, 2),
                "student_count": len(student_stats),
                "students": student_stats[:10]  # Top 10 students
            }
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return {"status": "error", "message": str(e)}


@shared_task(name="app.tasks.attendance.check_consecutive_absences")
def check_consecutive_absences() -> dict:
    """
    Check for consecutive absences and alert administration.
    Runs daily to identify students with attendance issues.
    """
    logger.info("Checking consecutive absences...")
    
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker
    from app.core.config import get_settings
    from app.models.attendance import AttendanceSession, AttendanceRecord, AttendanceSettings
    from app.models.all_models import Student, Parent, Class
    
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    
    with Session() as db:
        try:
            # Get settings
            settings_record = db.execute(
                select(AttendanceSettings)
            ).scalar_one_or_none()
            
            threshold = settings_record.absence_alert_after if settings_record else 3
            
            # Get all active students
            students = db.execute(
                select(Student).where(Student.is_active == True)
            ).scalars().all()
            
            alerts = []
            
            for student in students:
                # Get recent attendance records
                records = db.execute(
                    select(AttendanceRecord)
                    .join(AttendanceSession)
                    .where(AttendanceRecord.student_id == student.id)
                    .order_by(AttendanceSession.date.desc())
                    .limit(threshold + 2)
                ).scalars().all()
                
                # Count consecutive absences
                consecutive = 0
                for record in records:
                    if record.status == "absent":
                        consecutive += 1
                    else:
                        break
                
                if consecutive >= threshold:
                    # Get class info
                    class_obj = db.execute(
                        select(Class).where(Class.id == student.class_id)
                    ).scalar_one_or_none()
                    
                    # Get parent info
                    parent = None
                    if student.parent_id:
                        parent = db.execute(
                            select(Parent).where(Parent.id == student.parent_id)
                        ).scalar_one_or_none()
                    
                    alert = {
                        "student_id": student.id,
                        "student_name": f"{student.first_name} {student.last_name}",
                        "student_number": student.student_number,
                        "class_name": class_obj.name if class_obj else "N/A",
                        "consecutive_absences": consecutive,
                        "parent_phone": parent.phone if parent else None,
                        "parent_email": parent.email if parent else None
                    }
                    alerts.append(alert)
                    
                    logger.warning(
                        f"ALERT: {student.first_name} {student.last_name} "
                        f"({student.student_number}) has {consecutive} consecutive absences"
                    )
            
            # TODO: Send alert to administration
            # - Email to school admin
            # - Push notification
            # - Dashboard alert
            
            return {
                "status": "success",
                "threshold": threshold,
                "total_students_checked": len(students),
                "alerts_count": len(alerts),
                "alerts": alerts
            }
            
        except Exception as e:
            logger.error(f"Error checking absences: {e}")
            return {"status": "error", "message": str(e)}


@shared_task(name="app.tasks.attendance.send_daily_attendance_summary")
def send_daily_attendance_summary() -> dict:
    """
    Send daily attendance summary to school administration.
    Runs at the end of each school day.
    """
    logger.info("Sending daily attendance summary...")
    
    from sqlalchemy import create_engine, select, func
    from sqlalchemy.orm import sessionmaker
    from app.core.config import get_settings
    from app.models.attendance import AttendanceSession
    from app.models.all_models import Class
    from datetime import date
    
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    
    with Session() as db:
        try:
            today = date.today()
            
            # Get all sessions for today
            sessions = db.execute(
                select(AttendanceSession).where(AttendanceSession.date == today)
            ).scalars().all()
            
            summary = []
            total_students = 0
            total_present = 0
            total_absent = 0
            total_late = 0
            total_excused = 0
            
            for session in sessions:
                class_obj = db.execute(
                    select(Class).where(Class.id == session.class_id)
                ).scalar_one_or_none()
                
                summary.append({
                    "class_id": session.class_id,
                    "class_name": class_obj.name if class_obj else "N/A",
                    "total_students": session.total_students,
                    "present": session.present_count,
                    "absent": session.absent_count,
                    "late": session.late_count,
                    "excused": session.excused_count,
                    "status": session.status
                })
                
                total_students += session.total_students
                total_present += session.present_count
                total_absent += session.absent_count
                total_late += session.late_count
                total_excused += session.excused_count
            
            overall_rate = (total_present + total_late + total_excused) / total_students * 100 if total_students > 0 else 0
            
            logger.info(f"Daily summary: {total_present} present, {total_absent} absent, {total_late} late")
            
            # TODO: Send email/notification to admin
            
            return {
                "status": "success",
                "date": str(today),
                "total_classes": len(sessions),
                "total_students": total_students,
                "present": total_present,
                "absent": total_absent,
                "late": total_late,
                "excused": total_excused,
                "attendance_rate": round(overall_rate, 2),
                "class_summary": summary
            }
            
        except Exception as e:
            logger.error(f"Error sending summary: {e}")
            return {"status": "error", "message": str(e)}
