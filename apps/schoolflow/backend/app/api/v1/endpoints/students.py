"""Students CRUD."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Student, User
from app.schemas.schemas import Paginated, StudentCreate, StudentOut, StudentUpdate

router = APIRouter(prefix="/students", tags=["Students"])


def _gen_number(count: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"SF-{year}-{count + 1:05d}"


@router.get("", response_model=Paginated)
async def list_students(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    class_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Student).where(Student.is_active == True)
    if search:
        q = q.where(
            (Student.first_name.ilike(f"%{search}%")) |
            (Student.last_name.ilike(f"%{search}%")) |
            (Student.student_number.ilike(f"%{search}%"))
        )
    if class_id:
        q = q.where(Student.class_id == class_id)

    total = int((await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0)
    result = await db.execute(q.offset((page-1)*size).limit(size).order_by(Student.last_name))
    students = result.scalars().all()

    return Paginated(
        items=[StudentOut.model_validate(s) for s in students],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@router.post("", response_model=StudentOut, status_code=201)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    count_res = await db.execute(select(func.count()).select_from(Student))
    count = count_res.scalar() or 0
    student = Student(student_number=_gen_number(count), **data.model_dump())
    db.add(student)
    await db.flush()
    await db.refresh(student)
    return StudentOut.model_validate(student)


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(student_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Student).where(Student.id == student_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Student not found")
    return StudentOut.model_validate(s)


@router.put("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: int, data: StudentUpdate,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Student not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    await db.flush()
    await db.refresh(s)
    return StudentOut.model_validate(s)


@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: int, db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Insufficient permissions")
    result = await db.execute(select(Student).where(Student.id == student_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Student not found")
    s.is_active = False
