"""Timetable service with conflict detection and PDF export."""
from __future__ import annotations

import io
from datetime import datetime, time
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.timetable import TimeSlot, TimetableConflict, TimetableEntry
from app.schemas.timetable import (
    TimeSlotCreate, TimeSlotUpdate,
    TimetableEntryCreate, TimetableEntryUpdate,
    TimetableConflictResolve,
)


# Day names in French
DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


class TimetableService:
    """Service for timetable management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────── TimeSlot CRUD ────────────────
    async def create_time_slot(self, data: TimeSlotCreate) -> TimeSlot:
        """Create a new time slot."""
        # Validate time order
        if data.start_time >= data.end_time:
            raise ValueError("L'heure de début doit être avant l'heure de fin")

        slot = TimeSlot(**data.model_dump())
        self.db.add(slot)
        await self.db.flush()
        await self.db.refresh(slot)
        return slot

    async def list_time_slots(self, active_only: bool = True) -> list[TimeSlot]:
        """List all time slots."""
        q = select(TimeSlot)
        if active_only:
            q = q.where(TimeSlot.is_active == True)
        q = q.order_by(TimeSlot.order, TimeSlot.start_time)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_time_slot(self, slot_id: int) -> TimeSlot | None:
        """Get a time slot by ID."""
        result = await self.db.execute(
            select(TimeSlot).where(TimeSlot.id == slot_id)
        )
        return result.scalar_one_or_none()

    async def update_time_slot(self, slot_id: int, data: TimeSlotUpdate) -> TimeSlot:
        """Update a time slot."""
        slot = await self.get_time_slot(slot_id)
        if not slot:
            raise ValueError("Créneau non trouvé")

        update_data = data.model_dump(exclude_none=True)
        for field, value in update_data.items():
            setattr(slot, field, value)

        # Validate time order if both are provided
        start = update_data.get("start_time", slot.start_time)
        end = update_data.get("end_time", slot.end_time)
        if start >= end:
            raise ValueError("L'heure de début doit être avant l'heure de fin")

        await self.db.flush()
        await self.db.refresh(slot)
        return slot

    async def delete_time_slot(self, slot_id: int) -> bool:
        """Delete a time slot."""
        slot = await self.get_time_slot(slot_id)
        if not slot:
            return False

        # Check if slot is used in entries
        entries_count = await self.db.scalar(
            select(func.count()).where(TimetableEntry.time_slot_id == slot_id)
        )
        if entries_count > 0:
            raise ValueError("Ce créneau est utilisé dans l'emploi du temps. Supprimez d'abord les entrées.")

        await self.db.delete(slot)
        await self.db.flush()
        return True

    # ──────────────── TimetableEntry CRUD ────────────────
    async def create_entry(self, data: TimetableEntryCreate) -> TimetableEntry:
        """Create a new timetable entry."""
        # Check for conflicts with existing entry in same class/slot/day
        existing = await self.db.execute(
            select(TimetableEntry).where(
                and_(
                    TimetableEntry.class_id == data.class_id,
                    TimetableEntry.time_slot_id == data.time_slot_id,
                    TimetableEntry.day_of_week == data.day_of_week,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Un cours existe déjà pour cette classe à ce créneau")

        entry = TimetableEntry(**data.model_dump())
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)

        # Detect conflicts after creation
        await self._detect_conflicts_for_entry(entry)

        return entry

    async def list_entries(
        self,
        class_id: int | None = None,
        teacher_id: int | None = None,
        day: int | None = None,
    ) -> list[TimetableEntry]:
        """List timetable entries with optional filters."""
        q = select(TimetableEntry).options(
            selectinload(TimetableEntry.class_),
            selectinload(TimetableEntry.subject),
            selectinload(TimetableEntry.teacher),
            selectinload(TimetableEntry.time_slot),
        )

        if class_id is not None:
            q = q.where(TimetableEntry.class_id == class_id)
        if teacher_id is not None:
            q = q.where(TimetableEntry.teacher_id == teacher_id)
        if day is not None:
            q = q.where(TimetableEntry.day_of_week == day)

        q = q.order_by(TimetableEntry.day_of_week, TimetableEntry.time_slot_id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_entry(self, entry_id: int) -> TimetableEntry | None:
        """Get a timetable entry by ID."""
        result = await self.db.execute(
            select(TimetableEntry).options(
                selectinload(TimetableEntry.class_),
                selectinload(TimetableEntry.subject),
                selectinload(TimetableEntry.teacher),
                selectinload(TimetableEntry.time_slot),
            ).where(TimetableEntry.id == entry_id)
        )
        return result.scalar_one_or_none()

    async def update_entry(self, entry_id: int, data: TimetableEntryUpdate) -> TimetableEntry:
        """Update a timetable entry."""
        entry = await self.get_entry(entry_id)
        if not entry:
            raise ValueError("Entrée non trouvée")

        update_data = data.model_dump(exclude_none=True)

        # Check for conflicts if changing slot/day/class
        new_class_id = update_data.get("class_id", entry.class_id)
        new_slot_id = update_data.get("time_slot_id", entry.time_slot_id)
        new_day = update_data.get("day_of_week", entry.day_of_week)

        if new_slot_id != entry.time_slot_id or new_day != entry.day_of_week or new_class_id != entry.class_id:
            existing = await self.db.execute(
                select(TimetableEntry).where(
                    and_(
                        TimetableEntry.id != entry_id,
                        TimetableEntry.class_id == new_class_id,
                        TimetableEntry.time_slot_id == new_slot_id,
                        TimetableEntry.day_of_week == new_day,
                    )
                )
            )
            if existing.scalar_one_or_none():
                raise ValueError("Un cours existe déjà pour cette classe à ce créneau")

        for field, value in update_data.items():
            setattr(entry, field, value)

        await self.db.flush()
        await self.db.refresh(entry)

        # Re-detect conflicts
        await self._detect_conflicts_for_entry(entry)

        return entry

    async def delete_entry(self, entry_id: int) -> bool:
        """Delete a timetable entry."""
        entry = await self.get_entry(entry_id)
        if not entry:
            return False

        # Delete related conflicts
        await self.db.execute(
            delete(TimetableConflict).where(
                or_(
                    TimetableConflict.entry1_id == entry_id,
                    TimetableConflict.entry2_id == entry_id,
                )
            )
        )

        await self.db.delete(entry)
        await self.db.flush()
        return True

    # ──────────────── Timetable Views ────────────────
    async def get_class_timetable(self, class_id: int) -> dict[str, Any]:
        """Get complete timetable for a class."""
        entries = await self.list_entries(class_id=class_id)

        # Get class info
        from app.models.all_models import Class
        class_result = await self.db.execute(
            select(Class).where(Class.id == class_id)
        )
        class_obj = class_result.scalar_one_or_none()

        # Organize by day
        days_data = []
        for day_idx in range(7):  # 0-6 for Monday-Sunday
            day_entries = [e for e in entries if e.day_of_week == day_idx]
            entries_with_details = [
                self._entry_to_detail_dict(e) for e in day_entries
            ]
            days_data.append({
                "day_of_week": day_idx,
                "day_name": DAY_NAMES[day_idx],
                "entries": entries_with_details,
            })

        return {
            "class_id": class_id,
            "class_name": class_obj.name if class_obj else "",
            "level": class_obj.level if class_obj else "",
            "academic_year": class_obj.academic_year if class_obj else "",
            "days": days_data,
        }

    async def get_teacher_timetable(self, teacher_id: int) -> dict[str, Any]:
        """Get complete timetable for a teacher."""
        entries = await self.list_entries(teacher_id=teacher_id)

        # Get teacher info
        from app.models.all_models import Teacher
        teacher_result = await self.db.execute(
            select(Teacher).where(Teacher.id == teacher_id)
        )
        teacher = teacher_result.scalar_one_or_none()

        # Organize by day
        days_data = []
        for day_idx in range(7):
            day_entries = [e for e in entries if e.day_of_week == day_idx]
            entries_with_details = [
                self._entry_to_detail_dict(e) for e in day_entries
            ]
            days_data.append({
                "day_of_week": day_idx,
                "day_name": DAY_NAMES[day_idx],
                "entries": entries_with_details,
            })

        return {
            "teacher_id": teacher_id,
            "teacher_name": teacher.full_name if teacher else "",
            "days": days_data,
        }

    def _entry_to_detail_dict(self, entry: TimetableEntry) -> dict[str, Any]:
        """Convert entry to detail dictionary."""
        return {
            "id": entry.id,
            "class_id": entry.class_id,
            "subject_id": entry.subject_id,
            "teacher_id": entry.teacher_id,
            "time_slot_id": entry.time_slot_id,
            "day_of_week": entry.day_of_week,
            "room": entry.room,
            "notes": entry.notes,
            "created_at": entry.created_at,
            "updated_at": entry.updated_at,
            "class_name": entry.class_.name if entry.class_ else None,
            "subject_name": entry.subject.name if entry.subject else None,
            "teacher_name": entry.teacher.full_name if entry.teacher else None,
            "time_slot_name": entry.time_slot.name if entry.time_slot else None,
            "start_time": entry.time_slot.start_time if entry.time_slot else None,
            "end_time": entry.time_slot.end_time if entry.time_slot else None,
        }

    # ──────────────── Conflict Detection ────────────────
    async def _detect_conflicts_for_entry(self, entry: TimetableEntry) -> list[TimetableConflict]:
        """Detect conflicts for a specific entry."""
        conflicts = []

        # Teacher double booking
        if entry.teacher_id:
            teacher_conflicts = await self.db.execute(
                select(TimetableEntry).where(
                    and_(
                        TimetableEntry.id != entry.id,
                        TimetableEntry.teacher_id == entry.teacher_id,
                        TimetableEntry.time_slot_id == entry.time_slot_id,
                        TimetableEntry.day_of_week == entry.day_of_week,
                    )
                )
            )
            for conflict_entry in teacher_conflicts.scalars().all():
                conflict = await self._create_or_update_conflict(
                    entry.id,
                    conflict_entry.id,
                    "teacher_double_booking",
                    "error",
                    f"Le professeur a deux cours au même créneau ({DAY_NAMES[entry.day_of_week]})",
                )
                conflicts.append(conflict)

        # Room conflict
        if entry.room:
            room_conflicts = await self.db.execute(
                select(TimetableEntry).where(
                    and_(
                        TimetableEntry.id != entry.id,
                        TimetableEntry.room == entry.room,
                        TimetableEntry.time_slot_id == entry.time_slot_id,
                        TimetableEntry.day_of_week == entry.day_of_week,
                    )
                )
            )
            for conflict_entry in room_conflicts.scalars().all():
                conflict = await self._create_or_update_conflict(
                    entry.id,
                    conflict_entry.id,
                    "room_conflict",
                    "warning",
                    f"Salle {entry.room} occupée par deux cours au même créneau",
                )
                conflicts.append(conflict)

        return conflicts

    async def _create_or_update_conflict(
        self,
        entry1_id: int,
        entry2_id: int,
        conflict_type: str,
        severity: str,
        description: str,
    ) -> TimetableConflict:
        """Create or update a conflict record."""
        # Check if conflict already exists
        existing = await self.db.execute(
            select(TimetableConflict).where(
                or_(
                    and_(
                        TimetableConflict.entry1_id == entry1_id,
                        TimetableConflict.entry2_id == entry2_id,
                    ),
                    and_(
                        TimetableConflict.entry1_id == entry2_id,
                        TimetableConflict.entry2_id == entry1_id,
                    ),
                )
            )
        )
        conflict = existing.scalar_one_or_none()

        if conflict:
            conflict.resolved = False
            conflict.resolved_at = None
            conflict.severity = severity
            conflict.description = description
        else:
            conflict = TimetableConflict(
                entry1_id=entry1_id,
                entry2_id=entry2_id,
                conflict_type=conflict_type,
                severity=severity,
                description=description,
            )
            self.db.add(conflict)

        await self.db.flush()
        await self.db.refresh(conflict)
        return conflict

    async def detect_all_conflicts(self) -> list[TimetableConflict]:
        """Detect all conflicts in the timetable."""
        # Clear existing unresolved conflicts
        await self.db.execute(
            delete(TimetableConflict).where(TimetableConflict.resolved == False)
        )

        conflicts = []
        entries = await self.list_entries()

        # Check each pair of entries
        for i, entry1 in enumerate(entries):
            for entry2 in entries[i+1:]:
                # Only check entries on the same day and time slot
                if entry1.day_of_week != entry2.day_of_week:
                    continue
                if entry1.time_slot_id != entry2.time_slot_id:
                    continue

                # Teacher double booking
                if entry1.teacher_id and entry1.teacher_id == entry2.teacher_id:
                    conflict = await self._create_or_update_conflict(
                        entry1.id, entry2.id,
                        "teacher_double_booking", "error",
                        f"Le professeur a deux cours au même créneau ({DAY_NAMES[entry1.day_of_week]})",
                    )
                    conflicts.append(conflict)

                # Room conflict
                if entry1.room and entry1.room == entry2.room:
                    conflict = await self._create_or_update_conflict(
                        entry1.id, entry2.id,
                        "room_conflict", "warning",
                        f"Salle {entry1.room} occupée par deux cours au même créneau",
                    )
                    conflicts.append(conflict)

        return conflicts

    async def list_conflicts(self, resolved: bool | None = False) -> list[TimetableConflict]:
        """List all conflicts."""
        q = select(TimetableConflict).options(
            selectinload(TimetableConflict.entry1).selectinload(TimetableEntry.class_),
            selectinload(TimetableConflict.entry1).selectinload(TimetableEntry.subject),
            selectinload(TimetableConflict.entry2).selectinload(TimetableEntry.class_),
            selectinload(TimetableConflict.entry2).selectinload(TimetableEntry.subject),
        )

        if resolved is not None:
            q = q.where(TimetableConflict.resolved == resolved)

        q = q.order_by(TimetableConflict.created_at.desc())
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def resolve_conflict(self, data: TimetableConflictResolve) -> TimetableConflict:
        """Resolve a conflict."""
        conflict = await self.db.execute(
            select(TimetableConflict).where(TimetableConflict.id == data.conflict_id)
        )
        conflict = conflict.scalar_one_or_none()
        if not conflict:
            raise ValueError("Conflit non trouvé")

        if data.action == "delete_entry1":
            await self.delete_entry(conflict.entry1_id)
        elif data.action == "delete_entry2":
            await self.delete_entry(conflict.entry2_id)
        elif data.action == "swap":
            # Swap time slots between entries
            entry1 = await self.get_entry(conflict.entry1_id)
            entry2 = await self.get_entry(conflict.entry2_id)
            if entry1 and entry2:
                entry1.day_of_week, entry2.day_of_week = entry2.day_of_week, entry1.day_of_week
                entry1.time_slot_id, entry2.time_slot_id = entry2.time_slot_id, entry1.time_slot_id
        # "ignore" just marks as resolved

        conflict.resolved = True
        conflict.resolved_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(conflict)
        return conflict

    # ──────────────── PDF Export ────────────────
    async def generate_timetable_pdf(self, class_id: int) -> bytes:
        """Generate PDF for class timetable."""
        timetable = await self.get_class_timetable(class_id)
        time_slots = await self.list_time_slots()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1.5*cm,
            bottomMargin=1.5*cm,
        )
        styles = getSampleStyleSheet()
        story = []

        # Header
        title_style = ParagraphStyle(
            "Title", parent=styles["Heading1"],
            fontSize=18, textColor=colors.HexColor("#15803d"),
            alignment=1, spaceAfter=4,
        )
        sub_style = ParagraphStyle(
            "Sub", parent=styles["Normal"],
            fontSize=12, alignment=1,
            textColor=colors.HexColor("#374151"),
        )

        story.append(Paragraph("SchoolFlow Africa", title_style))
        story.append(Paragraph("EMPLOI DU TEMPS", sub_style))
        story.append(Spacer(1, 0.3*cm))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#15803d")))
        story.append(Spacer(1, 0.5*cm))

        # Class info
        info_text = f"<b>Classe:</b> {timetable['class_name']} ({timetable['level']}) | <b>Année:</b> {timetable['academic_year']}"
        story.append(Paragraph(info_text, styles["Normal"]))
        story.append(Paragraph(f"<b>Généré le:</b> {datetime.now().strftime('%d/%m/%Y à %H:%M')}", styles["Normal"]))
        story.append(Spacer(1, 0.5*cm))

        # Build timetable grid
        # Header row: Days
        header_row = ["Créneau"] + [DAY_NAMES[d] for d in range(6)]  # Exclude Sunday

        rows = [header_row]

        # One row per time slot
        for slot in time_slots:
            if not slot.is_active:
                continue
            row = [f"{slot.name}\n{slot.start_time.strftime('%H:%M')}-{slot.end_time.strftime('%H:%M')}"]
            for day_idx in range(6):  # Monday to Saturday
                day_data = timetable["days"][day_idx]
                entry = next(
                    (e for e in day_data["entries"] if e["time_slot_id"] == slot.id),
                    None
                )
                if entry:
                    cell_text = f"{entry['subject_name'] or ''}"
                    if entry['teacher_name']:
                        cell_text += f"\n({entry['teacher_name']})"
                    if entry['room']:
                        cell_text += f"\nSalle: {entry['room']}"
                    row.append(cell_text)
                else:
                    row.append("—")
            rows.append(row)

        # Calculate column widths
        available_width = landscape(A4)[0] - 3*cm
        col_widths = [2.5*cm] + [((available_width - 2.5*cm) / 6)] * 6

        table = Table(rows, colWidths=col_widths)
        table.setStyle(TableStyle([
            # Header styling
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15803d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),

            # Time slot column
            ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#f0fdf4")),
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),

            # Alternating rows
            ("ROWBACKGROUNDS", (1, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),

            # Grid
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 1), (-1, -1), "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(table)

        # Footer
        story.append(Spacer(1, 1*cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Paragraph(
            "SchoolFlow Africa — Système de gestion scolaire",
            ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8,
                           textColor=colors.HexColor("#9ca3af"), alignment=1),
        ))

        doc.build(story)
        return buffer.getvalue()
