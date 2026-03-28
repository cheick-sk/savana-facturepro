import { useEffect, useState } from 'react'
import { User, Calendar } from 'lucide-react'
import api from '../../lib/api'
import TimetableGrid from '../../components/timetable/TimetableGrid'
import { useTimetableStore, TimetableEntry } from '../../store/timetable'

export default function TeacherTimetablePage() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null)

  const { fetchTeacherTimetable, teacherTimetable } = useTimetableStore()

  useEffect(() => {
    api.get('/school/teachers').then((r) => {
      setTeachers(r.data)
      if (r.data.length > 0) {
        setSelectedTeacherId(r.data[0].id)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedTeacherId) {
      fetchTeacherTimetable(selectedTeacherId)
    }
  }, [selectedTeacherId, fetchTeacherTimetable])

  const handleEntryClick = (entry: TimetableEntry) => {
    setSelectedEntry(entry)
  }

  const getTeacherInfo = () => {
    if (!selectedTeacherId) return null
    return teachers.find((t) => t.id === selectedTeacherId)
  }

  const teacher = getTeacherInfo()

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <User size={22} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Emploi du temps des professeurs</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Consultez l'emploi du temps d'un professeur
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
          Sélectionner un professeur
        </label>
        <select
          value={selectedTeacherId || ''}
          onChange={(e) => setSelectedTeacherId(parseInt(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 6, minWidth: 250 }}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.first_name} {t.last_name} {t.speciality ? `(${t.speciality})` : ''}
            </option>
          ))}
        </select>
      </div>

      {teacher && (
        <div style={{
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <User size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 16 }}>
              {teacher.first_name} {teacher.last_name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {teacher.speciality || 'Professeur'}
              {teacher.email && ` · ${teacher.email}`}
              {teacher.phone && ` · ${teacher.phone}`}
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 16,
        overflow: 'auto',
      }}>
        <TimetableGrid
          teacherId={selectedTeacherId || undefined}
          onEntryClick={handleEntryClick}
        />
      </div>

      {selectedEntry && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setSelectedEntry(null)}>
          <div style={{
            background: 'var(--color-background-primary)',
            borderRadius: 12,
            padding: 24,
            maxWidth: 400,
            width: '90%',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Détails du cours</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Matière</span>
                <div style={{ fontWeight: 500 }}>{selectedEntry.subject_name}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Classe</span>
                <div style={{ fontWeight: 500 }}>{selectedEntry.class_name}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Salle</span>
                <div style={{ fontWeight: 500 }}>{selectedEntry.room || 'Non définie'}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Notes</span>
                <div>{selectedEntry.notes || 'Aucune note'}</div>
              </div>
            </div>
            <button onClick={() => setSelectedEntry(null)} style={{ marginTop: 16, width: '100%' }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
