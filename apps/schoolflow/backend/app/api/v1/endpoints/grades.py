"""Grades CRUD + bulletin PDF generation."""
from __future__ import annotations

import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Class, Grade, Student, Subject, Term, User
from app.schemas.schemas import (
    BulletinRequest, GradeCreate, GradeOut, GradeUpdate, Paginated,
)
from app.services.pdf_service import generate_bulletin_pdf

router = APIRouter(prefix="/grades", tags=["Grades"])
UPLOAD_DIR = "/app/uploads/bulletins"


@router.get("", response_model=Paginated)
async def list_grades(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    student_id: int | None = None,
    term_id: int | None = None,
    subject_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Grade)
    if student_id:
        q = q.where(Grade.student_id == student_id)
    if term_id:
        q = q.where(Grade.term_id == term_id)
    if subject_id:
        q = q.where(Grade.subject_id == subject_id)

    total = int((await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0)
    result = await db.execute(q.offset((page-1)*size).limit(size))
    grades = result.scalars().all()

    return Paginated(
        items=[GradeOut.model_validate(g) for g in grades],
        total=total, page=page, size=size,
        pages=max(1, (total + size - 1) // size),
    )


@router.post("", response_model=GradeOut, status_code=201)
async def create_grade(
    data: GradeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Check for duplicate
    existing = await db.execute(
        select(Grade).where(
            Grade.student_id == data.student_id,
            Grade.subject_id == data.subject_id,
            Grade.term_id == data.term_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Grade already exists for this student/subject/term")

    grade = Grade(**data.model_dump())
    db.add(grade)
    await db.flush()
    await db.refresh(grade)
    return GradeOut.model_validate(grade)


@router.put("/{grade_id}", response_model=GradeOut)
async def update_grade(
    grade_id: int, data: GradeUpdate,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    result = await db.execute(select(Grade).where(Grade.id == grade_id))
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(404, "Grade not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(g, field, value)
    await db.flush()
    await db.refresh(g)
    return GradeOut.model_validate(g)


@router.delete("/{grade_id}", status_code=204)
async def delete_grade(
    grade_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    result = await db.execute(select(Grade).where(Grade.id == grade_id))
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(404, "Grade not found")
    await db.delete(g)


@router.post("/bulletin/pdf")
async def generate_bulletin(
    data: BulletinRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Generate and return bulletin PDF for a student/term."""
    # Load student
    s_res = await db.execute(select(Student).where(Student.id == data.student_id))
    student = s_res.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found")

    # Load term
    t_res = await db.execute(select(Term).where(Term.id == data.term_id))
    term = t_res.scalar_one_or_none()
    if not term:
        raise HTTPException(404, "Term not found")

    # Load grades with subjects
    g_res = await db.execute(
        select(Grade).where(Grade.student_id == data.student_id, Grade.term_id == data.term_id)
    )
    grades = g_res.scalars().all()

    grade_data = []
    for g in grades:
        subj = g.subject
        grade_data.append({
            "subject": subj.name,
            "teacher": subj.teacher.full_name if subj.teacher else "—",
            "coefficient": float(subj.coefficient),
            "score": float(g.score),
            "comment": g.comment,
        })

    bulletin_data = {
        "student_name": student.full_name,
        "student_number": student.student_number,
        "class_name": student.class_.name if student.class_ else "—",
        "term_name": term.name,
        "academic_year": term.academic_year,
        "grades": grade_data,
    }

    pdf_bytes = generate_bulletin_pdf(bulletin_data)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"bulletin_{student.student_number}_{term.id}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filename,
    )
