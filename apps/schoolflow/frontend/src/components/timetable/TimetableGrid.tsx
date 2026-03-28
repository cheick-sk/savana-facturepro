import { useEffect, useState } from 'react'
import { useTimetableStore, TimeSlot, TimetableEntry } from '../../store/timetable'
import TimetableEntryCard from './TimetableEntryCard'

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

interface TimetableGridProps {
  classId?: number
  teacherId?: number
  onEntryClick?: (entry: TimetableEntry) => void
  onAddClick?: (dayOfWeek: number, timeSlotId: number) => void
  editable?: boolean
}

export default function TimetableGrid({
  classId,
  teacherId,
  onEntryClick,
  onAddClick,
  editable = false,
}: TimetableGridProps) {
  const {
    timeSlots,
    classTimetable,
    teacherTimetable,
    classTimetableLoading,
    teacherTimetableLoading,
    fetchTimeSlots,
    fetchClassTimetable,
    fetchTeacherTimetable,
  } = useTimetableStore()

  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  useEffect(() => {
    fetchTimeSlots(true)
  }, [fetchTimeSlots])

  useEffect(() => {
    if (classId) {
      fetchClassTimetable(classId)
    } else if (teacherId) {
      fetchTeacherTimetable(teacherId)
    }
  }, [classId, teacherId, fetchClassTimetable, fetchTeacherTimetable])

  const timetable = classId ? classTimetable : teacherTimetable
  const loading = classId ? classTimetableLoading : teacherTimetableLoading

  const getEntryForSlot = (dayOfWeek: number, timeSlotId: number): TimetableEntry | undefined => {
    if (!timetable) return undefined
    const day = timetable.days.find((d) => d.day_of_week === dayOfWeek)
    if (!day) return undefined
    return day.entries.find((e) => e.time_slot_id === timeSlotId)
  }

  const handleCellClick = (dayOfWeek: number, timeSlotId: number) => {
    const entry = getEntryForSlot(dayOfWeek, timeSlotId)
    if (entry && onEntryClick) {
      onEntryClick(entry)
    } else if (!entry && editable && onAddClick) {
      onAddClick(dayOfWeek, timeSlotId)
    }
    setSelectedDay(dayOfWeek)
    setSelectedSlot(timeSlotId)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
        Chargement de l'emploi du temps...
      </div>
    )
  }

  if (!timetable) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
        Sélectionnez une classe ou un professeur pour voir l'emploi du temps
      </div>
    )
  }

  // Only show Monday to Saturday (index 0-5)
  const displayDays = DAY_NAMES.slice(0, 6)
  const activeTimeSlots = timeSlots.filter((s) => s.is_active)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th
              style={{
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-background-secondary)',
                borderBottom: '0.5px solid var(--color-border-tertiary)',
                width: 100,
                minWidth: 100,
              }}
            >
              Créneau
            </th>
            {displayDays.map((day, idx) => (
              <th
                key={day}
                style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-background-secondary)',
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                  minWidth: 120,
                }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeTimeSlots.map((slot) => (
            <tr key={slot.id}>
              <td
                style={{
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 500,
                  background: 'var(--color-background-primary)',
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                  borderRight: '0.5px solid var(--color-border-tertiary)',
                }}
              >
                <div style={{ fontWeight: 500 }}>{slot.name}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                  {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                </div>
              </td>
              {displayDays.map((_, dayIdx) => {
                const entry = getEntryForSlot(dayIdx, slot.id)
                const isSelected = selectedDay === dayIdx && selectedSlot === slot.id
                return (
                  <td
                    key={dayIdx}
                    onClick={() => handleCellClick(dayIdx, slot.id)}
                    style={{
                      padding: 4,
                      borderBottom: '0.5px solid var(--color-border-tertiary)',
                      background: isSelected ? 'var(--color-background-secondary)' : 'transparent',
                      cursor: entry || editable ? 'pointer' : 'default',
                      height: 80,
                      verticalAlign: 'top',
                    }}
                  >
                    {entry ? (
                      <TimetableEntryCard
                        entry={entry}
                        onClick={() => onEntryClick?.(entry)}
                        compact
                      />
                    ) : editable ? (
                      <div
                        style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-text-secondary)',
                          fontSize: 11,
                        }}
                      >
                        + Ajouter
                      </div>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
