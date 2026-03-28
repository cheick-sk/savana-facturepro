"""Timetable API endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User
from app.schemas.timetable import (
    TimeSlotCreate, TimeSlotOut, TimeSlotUpdate,
    TimetableEntryCreate, TimetableEntryOut, TimetableEntryUpdate,
    TimetableConflictOut, TimetableConflictResolve,
    ClassTimetableOut, TeacherTimetableOut,
    DaySchedule,
)
from app.services.timetable_service import TimetableService

router = APIRouter(prefix="/timetable", tags=["Timetable"])


def get_service(db: AsyncSession = Depends(get_db)) -> TimetableService:
    return TimetableService(db)


# ──────────────── TimeSlot Endpoints ────────────────
@router.post("/slots", response_model=TimeSlotOut, status_code=201)
async def create_time_slot(
    data: TimeSlotCreate,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Créer un nouveau créneau horaire."""
    try:
        slot = await service.create_time_slot(data)
        return TimeSlotOut.model_validate(slot)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/slots", response_model=list[TimeSlotOut])
async def list_time_slots(
    active_only: bool = Query(True),
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Lister tous les créneaux horaires."""
    slots = await service.list_time_slots(active_only)
    return [TimeSlotOut.model_validate(s) for s in slots]


@router.get("/slots/{slot_id}", response_model=TimeSlotOut)
async def get_time_slot(
    slot_id: int,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Récupérer un créneau par ID."""
    slot = await service.get_time_slot(slot_id)
    if not slot:
        raise HTTPException(404, "Créneau non trouvé")
    return TimeSlotOut.model_validate(slot)


@router.put("/slots/{slot_id}", response_model=TimeSlotOut)
async def update_time_slot(
    slot_id: int,
    data: TimeSlotUpdate,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Modifier un créneau horaire."""
    try:
        slot = await service.update_time_slot(slot_id, data)
        return TimeSlotOut.model_validate(slot)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/slots/{slot_id}", status_code=204)
async def delete_time_slot(
    slot_id: int,
    service: TimetableService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Supprimer un créneau horaire."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Permissions insuffisantes")
    try:
        await service.delete_time_slot(slot_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ──────────────── TimetableEntry Endpoints ────────────────
@router.post("/entries", response_model=TimetableEntryOut, status_code=201)
async def create_entry(
    data: TimetableEntryCreate,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Créer une nouvelle entrée d'emploi du temps."""
    try:
        entry = await service.create_entry(data)
        return TimetableEntryOut.model_validate(entry)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/entries", response_model=list[TimetableEntryOut])
async def list_entries(
    class_id: int | None = Query(None),
    teacher_id: int | None = Query(None),
    day: int | None = Query(None, ge=0, le=6),
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Lister les entrées d'emploi du temps avec filtres optionnels."""
    entries = await service.list_entries(class_id, teacher_id, day)
    return [TimetableEntryOut.model_validate(e) for e in entries]


@router.get("/entries/{entry_id}", response_model=TimetableEntryOut)
async def get_entry(
    entry_id: int,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Récupérer une entrée par ID."""
    entry = await service.get_entry(entry_id)
    if not entry:
        raise HTTPException(404, "Entrée non trouvée")
    return TimetableEntryOut.model_validate(entry)


@router.put("/entries/{entry_id}", response_model=TimetableEntryOut)
async def update_entry(
    entry_id: int,
    data: TimetableEntryUpdate,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Modifier une entrée d'emploi du temps."""
    try:
        entry = await service.update_entry(entry_id, data)
        return TimetableEntryOut.model_validate(entry)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/entries/{entry_id}", status_code=204)
async def delete_entry(
    entry_id: int,
    service: TimetableService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Supprimer une entrée d'emploi du temps."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Permissions insuffisantes")
    await service.delete_entry(entry_id)


# ──────────────── Timetable Views ────────────────
@router.get("/class/{class_id}", response_model=ClassTimetableOut)
async def get_class_timetable(
    class_id: int,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Emploi du temps complet d'une classe (format calendrier)."""
    timetable = await service.get_class_timetable(class_id)
    return ClassTimetableOut(**timetable)


@router.get("/teacher/{teacher_id}", response_model=TeacherTimetableOut)
async def get_teacher_timetable(
    teacher_id: int,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Emploi du temps complet d'un professeur."""
    timetable = await service.get_teacher_timetable(teacher_id)
    return TeacherTimetableOut(**timetable)


# ──────────────── Conflict Management ────────────────
@router.get("/conflicts", response_model=list[TimetableConflictOut])
async def list_conflicts(
    resolved: bool | None = Query(False),
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Lister les conflits détectés."""
    conflicts = await service.list_conflicts(resolved)
    return [TimetableConflictOut.model_validate(c) for c in conflicts]


@router.post("/conflicts/resolve", response_model=TimetableConflictOut)
async def resolve_conflict(
    data: TimetableConflictResolve,
    service: TimetableService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Résoudre un conflit."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Permissions insuffisantes")
    try:
        conflict = await service.resolve_conflict(data)
        return TimetableConflictOut.model_validate(conflict)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/detect-conflicts", response_model=list[TimetableConflictOut])
async def detect_conflicts(
    service: TimetableService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Lancer la détection des conflits."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Permissions insuffisantes")
    conflicts = await service.detect_all_conflicts()
    return [TimetableConflictOut.model_validate(c) for c in conflicts]


# ──────────────── PDF Export ────────────────
@router.get("/pdf/{class_id}")
async def export_timetable_pdf(
    class_id: int,
    service: TimetableService = Depends(get_service),
    _: User = Depends(get_current_user),
):
    """Exporter l'emploi du temps en PDF."""
    try:
        pdf_bytes = await service.generate_timetable_pdf(class_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="emploi-du-temps-{class_id}.pdf"'
            }
        )
    except Exception as e:
        raise HTTPException(500, f"Erreur lors de la génération du PDF: {str(e)}")


# ──────────────── Timetable Generation (Placeholder for AI) ────────────────
@router.post("/generate")
async def generate_timetable(
    class_id: int = Query(...),
    service: TimetableService = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Génération automatique de l'emploi du temps (IA)."""
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(403, "Permissions insuffisantes")

    # TODO: Implement AI-based timetable generation
    # This would use the z-ai-web-dev-sdk for AI optimization
    raise HTTPException(501, "La génération automatique n'est pas encore implémentée")
