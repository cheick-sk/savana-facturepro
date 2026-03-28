import { useState } from 'react'
import { Check, X, Clock, AlertCircle, MoreVertical } from 'lucide-react'
import type { AttendanceRecord } from '../../store/attendance'

interface Props {
  record: AttendanceRecord
  onStatusChange: (status: 'present' | 'absent' | 'late' | 'excused', arrivalTime?: string, notes?: string) => void
  disabled?: boolean
}

const STATUS_CONFIG = {
  present: { label: 'Présent', color: 'var(--color-text-success)', bg: 'var(--color-background-success)', icon: Check },
  absent: { label: 'Absent', color: 'var(--color-text-danger)', bg: 'var(--color-background-danger)', icon: X },
  late: { label: 'Retard', color: 'var(--color-text-warning)', bg: 'var(--color-background-warning)', icon: Clock },
  excused: { label: 'Excusé', color: 'var(--color-text-info)', bg: 'var(--color-background-info)', icon: AlertCircle },
}

export default function StudentAttendanceRow({ record, onStatusChange, disabled }: Props) {
  const [showDetails, setShowDetails] = useState(false)
  const [notes, setNotes] = useState(record.notes || '')
  const [arrivalTime, setArrivalTime] = useState(record.arrival_time || '')

  const statusConfig = STATUS_CONFIG[record.status]
  const StatusIcon = statusConfig.icon

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      background: record.status === 'absent' ? 'var(--color-background-danger)' : 'transparent',
      transition: 'background 0.2s'
    }}>
      {/* Student Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>{record.student_first_name} {record.student_last_name}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
            {record.student_number}
          </span>
        </div>
        {record.parent_notified && (
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Parents notifiés
          </div>
        )}
      </div>

      {/* Status Buttons */}
      <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
        {(['present', 'absent', 'late', 'excused'] as const).map((status) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const isActive = record.status === status
          return (
            <button
              key={status}
              onClick={() => !disabled && onStatusChange(status)}
              disabled={disabled}
              title={config.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                border: isActive ? '2px solid ' + config.color : '0.5px solid var(--color-border-tertiary)',
                background: isActive ? config.bg : 'var(--color-background-primary)',
                color: isActive ? config.color : 'var(--color-text-secondary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: disabled ? 0.5 : 1
              }}
            >
              <Icon size={16} />
            </button>
          )
        })}

        {/* More Options */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '0.5px solid var(--color-border-tertiary)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)'
          }}
        >
          <MoreVertical size={16} />
        </button>

        {/* Details Panel */}
        {showDetails && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            zIndex: 10,
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-md)',
            padding: 12,
            minWidth: 250,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                Heure d'arrivée
              </label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                onBlur={() => onStatusChange(record.status, arrivalTime, notes)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 4, color: 'var(--color-text-secondary)' }}>
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => onStatusChange(record.status, arrivalTime, notes)}
                placeholder="Ajouter une note..."
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
