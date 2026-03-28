import { BookOpen, User, MapPin } from 'lucide-react'
import { TimetableEntry } from '../../store/timetable'

interface TimetableEntryCardProps {
  entry: TimetableEntry
  onClick?: () => void
  compact?: boolean
}

export default function TimetableEntryCard({ entry, onClick, compact = false }: TimetableEntryCardProps) {
  const cardStyle: React.CSSProperties = {
    background: 'var(--color-primary-light)',
    border: '0.5px solid var(--color-primary)',
    borderRadius: 6,
    padding: compact ? '6px 8px' : '10px 12px',
    cursor: onClick ? 'pointer' : 'default',
    height: '100%',
    boxSizing: 'border-box',
    transition: 'transform 0.1s, box-shadow 0.1s',
  }

  const handleClick = () => {
    onClick?.()
  }

  if (compact) {
    return (
      <div style={cardStyle} onClick={handleClick}>
        <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 2, color: 'var(--color-primary-dark)' }}>
          {entry.subject_name || 'Matière'}
        </div>
        {entry.teacher_name && (
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
            {entry.teacher_name}
          </div>
        )}
        {entry.room && (
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
            📍 {entry.room}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={cardStyle} onClick={handleClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <BookOpen size={14} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontWeight: 500, color: 'var(--color-primary-dark)' }}>
          {entry.subject_name || 'Matière'}
        </span>
      </div>

      {entry.teacher_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <User size={12} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {entry.teacher_name}
          </span>
        </div>
      )}

      {entry.room && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <MapPin size={12} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {entry.room}
          </span>
        </div>
      )}

      {entry.notes && (
        <div style={{ marginTop: 6, fontSize: 11, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
          {entry.notes}
        </div>
      )}
    </div>
  )
}
