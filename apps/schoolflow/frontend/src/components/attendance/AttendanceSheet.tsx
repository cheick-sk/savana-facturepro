import { useState, useEffect } from 'react'
import { Check, X, Clock, AlertCircle, Save, CheckCircle, Users } from 'lucide-react'
import StudentAttendanceRow from './StudentAttendanceRow'
import type { AttendanceSessionDetail, AttendanceRecord } from '../../store/attendance'
import { useAttendanceStore } from '../../store/attendance'

interface Props {
  session: AttendanceSessionDetail
  onComplete: () => void
}

const STATUS_ICONS = {
  present: Check,
  absent: X,
  late: Clock,
  excused: AlertCircle,
}

export default function AttendanceSheet({ session, onComplete }: Props) {
  const { recordAttendance, completeSession, bulkRecordAttendance } = useAttendanceStore()
  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>(session.records || [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalRecords(session.records || [])
  }, [session.records])

  const handleStatusChange = async (studentId: number, status: 'present' | 'absent' | 'late' | 'excused', arrivalTime?: string, notes?: string) => {
    // Optimistic update
    setLocalRecords(prev => prev.map(r =>
      r.student_id === studentId ? { ...r, status, arrival_time: arrivalTime || null, notes: notes || null } : r
    ))
    
    // Save to backend
    await recordAttendance(session.id, studentId, status, arrivalTime, notes)
  }

  const handleMarkAll = async (status: 'present' | 'absent') => {
    setSaving(true)
    const records = localRecords.map(r => ({
      student_id: r.student_id,
      status,
    }))
    await bulkRecordAttendance(session.class_id, records)
    setLocalRecords(prev => prev.map(r => ({ ...r, status })))
    setSaving(false)
  }

  const handleComplete = async () => {
    setSaving(true)
    await completeSession(session.id)
    setSaving(false)
    onComplete()
  }

  const stats = {
    present: localRecords.filter(r => r.status === 'present').length,
    absent: localRecords.filter(r => r.status === 'absent').length,
    late: localRecords.filter(r => r.status === 'late').length,
    excused: localRecords.filter(r => r.status === 'excused').length,
    total: localRecords.length,
  }

  const attendanceRate = stats.total > 0 
    ? ((stats.present + stats.late + stats.excused) / stats.total * 100).toFixed(1)
    : '0.0'

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        padding: 16,
        background: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-lg)'
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            Appel du {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {session.class_name} • {session.total_students} élèves
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            <StatBadge label="Présents" value={stats.present} color="var(--color-text-success)" />
            <StatBadge label="Absents" value={stats.absent} color="var(--color-text-danger)" />
            <StatBadge label="Retards" value={stats.late} color="var(--color-text-warning)" />
            <StatBadge label="Excusés" value={stats.excused} color="var(--color-text-info)" />
          </div>
          
          {/* Attendance Rate */}
          <div style={{
            padding: '8px 16px',
            background: 'var(--color-background-primary)',
            borderRadius: 'var(--border-radius-md)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: parseFloat(attendanceRate) >= 80 ? 'var(--color-text-success)' : 'var(--color-text-warning)' }}>
              {attendanceRate}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Taux</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => handleMarkAll('present')} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={14} /> Marquer tous présents
        </button>
        <button onClick={() => handleMarkAll('absent')} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <X size={14} /> Marquer tous absents
        </button>
      </div>

      {/* Student List */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden'
      }}>
        {/* Column Headers */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          background: 'var(--color-background-secondary)',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--color-text-secondary)'
        }}>
          <div style={{ flex: 1 }}>
            <Users size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Élève
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['present', 'absent', 'late', 'excused'] as const).map(status => {
              const Icon = STATUS_ICONS[status]
              return (
                <div key={status} style={{ width: 36, textAlign: 'center' }} title={status}>
                  <Icon size={14} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Student Rows */}
        <div style={{ position: 'relative' }}>
          {localRecords.map((record) => (
            <StudentAttendanceRow
              key={record.id || record.student_id}
              record={record}
              onStatusChange={(status, arrivalTime, notes) => 
                handleStatusChange(record.student_id, status, arrivalTime, notes)
              }
              disabled={session.status === 'completed'}
            />
          ))}
        </div>

        {localRecords.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Aucun élève dans cette classe
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {session.status === 'in_progress' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
          <button
            onClick={handleComplete}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-text-success)',
              color: 'white',
              border: 'none'
            }}
          >
            <CheckCircle size={14} /> Terminer l'appel
          </button>
        </div>
      )}

      {session.status === 'completed' && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--color-background-success)',
          borderRadius: 'var(--border-radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--color-text-success)'
        }}>
          <CheckCircle size={16} />
          <span style={{ fontWeight: 500 }}>Appel terminé</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            • Les parents des élèves absents ont été notifiés
          </span>
        </div>
      )}
    </div>
  )
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  )
}
