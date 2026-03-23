"""Classes, subjects, teachers, terms CRUD."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Class, Subject, Teacher, Term, User
from app.schemas.schemas import (
    ClassCreate, ClassOut, Paginated,
    SubjectCreate, SubjectOut,
    TeacherCreate, TeacherOut,
    TermCreate, TermOut,
)

router = APIRouter(tags=["School Setup"])


# ──────────────── Terms ────────────────
@router.get("/terms", response_model=list[TermOut])
async def list_terms(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Term).order_by(Term.start_date.desc()))
    return [TermOut.model_validate(t) for t in result.scalars().all()]


@router.post("/terms", response_model=TermOut, status_code=201)
async def create_term(data: TermCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    term = Term(**data.model_dump())
    db.add(term)
    await db.flush()
    await db.refresh(term)
    return TermOut.model_validate(term)


# ──────────────── Classes ────────────────
@router.get("/classes", response_model=Paginated)
async def list_classes(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Class).where(Class.is_active == True)
    total = int((await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0)
    result = await db.execute(q.offset((page-1)*size).limit(size))
    return Paginated(items=[ClassOut.model_validate(c) for c in result.scalars().all()],
                     total=total, page=page, size=size, pages=max(1, (total+size-1)//size))


@router.post("/classes", response_model=ClassOut, status_code=201)
async def create_class(data: ClassCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    cls = Class(**data.model_dump())
    db.add(cls)
    await db.flush()
    await db.refresh(cls)
    return ClassOut.model_validate(cls)


@router.get("/classes/{class_id}", response_model=ClassOut)
async def get_class(class_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Class).where(Class.id == class_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Class not found")
    return ClassOut.model_validate(c)


# ──────────────── Teachers ────────────────
@router.get("/teachers", response_model=Paginated)
async def list_teachers(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Teacher).where(Teacher.is_active == True)
    total = int((await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0)
    result = await db.execute(q.offset((page-1)*size).limit(size))
    return Paginated(items=[TeacherOut.model_validate(t) for t in result.scalars().all()],
                     total=total, page=page, size=size, pages=max(1, (total+size-1)//size))


@router.post("/teachers", response_model=TeacherOut, status_code=201)
async def create_teacher(data: TeacherCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    teacher = Teacher(**data.model_dump())
    db.add(teacher)
    await db.flush()
    await db.refresh(teacher)
    return TeacherOut.model_validate(teacher)


# ──────────────── Subjects ────────────────
@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(
    class_id: int | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Subject).where(Subject.is_active == True)
    if class_id:
        q = q.where(Subject.class_id == class_id)
    result = await db.execute(q)
    return [SubjectOut.model_validate(s) for s in result.scalars().all()]


@router.post("/subjects", response_model=SubjectOut, status_code=201)
async def create_subject(data: SubjectCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    subj = Subject(**data.model_dump())
    db.add(subj)
    await db.flush()
    await db.refresh(subj)
    return SubjectOut.model_validate(subj)
