import { useEffect, useState, useMemo } from 'react'
import { Clock, ChevronDown, BookOpen } from 'lucide-react'
import { useParentPortalStore } from '../../store/parentPortal'

export default function TimetablePage() {
  const { children, timetable, fetchChildren, fetchTimetable } = useParentPortalStore()
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  // Auto-select first child when children are loaded
  const defaultChildId = useMemo(() => children[0]?.id ?? null, [children])
  const activeChildId = selectedChildId ?? defaultChildId

  useEffect(() => {
    if (activeChildId) {
      fetchTimetable(activeChildId)
    }
  }, [activeChildId, fetchTimetable])

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>Emploi du temps</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Consultez l'emploi du temps de vos enfants
          </p>
        </div>

        {/* Child selector */}
        <div style={{ position: 'relative' }}>
          <select
            value={activeChildId || ''}
            onChange={(e) => setSelectedChildId(parseInt(e.target.value))}
            style={{
              padding: '10px 36px 10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border-primary)',
              background: 'var(--color-background-primary)',
              fontSize: 14,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>{child.full_name}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-secondary)' }} />
        </div>
      </div>

      {/* Student info */}
      {timetable && (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <BookOpen size={20} style={{ color: '#059669' }} />
          <div>
            <span style={{ fontWeight: 500 }}>{timetable.student_name}</span>
            <span style={{ color: 'var(--color-text-secondary)', marginLeft: 8 }}>• {timetable.class_name}</span>
          </div>
        </div>
      )}

      {/* Timetable */}
      {!timetable || timetable.days.length === 0 ? (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <Clock size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucun emploi du temps disponible</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
          {timetable.days.map((day) => (
            <div
              key={day.day_of_week}
              style={{
                minWidth: 200,
                background: 'var(--color-background-primary)',
                borderRadius: 12,
                overflow: 'hidden'
              }}
            >
              {/* Day header */}
              <div style={{
                padding: 14,
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                fontWeight: 600,
                textAlign: 'center'
              }}>
                {day.day_name}
              </div>

              {/* Day entries */}
              <div style={{ padding: 8 }}>
                {day.entries.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    Pas de cours
                  </div>
                ) : (
                  day.entries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: 12,
                        background: 'var(--color-background-secondary)',
                        borderRadius: 8,
                        marginBottom: 8
                      }}
                    >
                      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{entry.subject_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        {entry.start_time} - {entry.end_time}
                      </div>
                      {entry.teacher_name && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {entry.teacher_name}
                        </div>
                      )}
                      {entry.room && (
                        <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
                          Salle {entry.room}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
