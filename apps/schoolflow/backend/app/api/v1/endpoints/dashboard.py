"""SchoolFlow dashboard stats."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Class, FeeInvoice, Grade, Student, Teacher, User
from app.schemas.schemas import SchoolDashboard

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=SchoolDashboard)
async def get_stats(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total_students = int((await db.execute(
        select(func.count()).select_from(Student).where(Student.is_active == True))).scalar() or 0)
    active_classes = int((await db.execute(
        select(func.count()).select_from(Class).where(Class.is_active == True))).scalar() or 0)
    total_teachers = int((await db.execute(
        select(func.count()).select_from(Teacher).where(Teacher.is_active == True))).scalar() or 0)
    fees_collected = float((await db.execute(
        select(func.coalesce(func.sum(FeeInvoice.amount), 0)).where(FeeInvoice.status == "PAID"))).scalar() or 0)
    fees_pending = float((await db.execute(
        select(func.coalesce(func.sum(FeeInvoice.amount), 0)).where(FeeInvoice.status == "PENDING"))).scalar() or 0)

    return SchoolDashboard(
        total_students=total_students,
        active_classes=active_classes,
        total_teachers=total_teachers,
        fees_collected=fees_collected,
        fees_pending=fees_pending,
        top_students=[],
    )
