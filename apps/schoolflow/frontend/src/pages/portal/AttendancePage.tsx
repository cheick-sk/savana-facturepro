import { useEffect, useState, useMemo } from 'react'
import { Calendar, ChevronDown, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { useParentPortalStore } from '../../store/parentPortal'

export default function AttendancePage() {
  const { children, attendanceRecords, attendanceStats, fetchChildren, fetchAttendance, fetchAttendanceStats } = useParentPortalStore()
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  // Auto-select first child when children are loaded
  const defaultChildId = useMemo(() => children[0]?.id ?? null, [children])
  const activeChildId = selectedChildId ?? defaultChildId

  useEffect(() => {
    if (activeChildId) {
      fetchAttendance(activeChildId)
      fetchAttendanceStats(activeChildId)
    }
  }, [activeChildId, fetchAttendance, fetchAttendanceStats])

  const statusConfig: Record<string, { icon: any; bg: string; color: string; label: string }> = {
    present: { icon: CheckCircle, bg: '#ecfdf5', color: '#059669', label: 'Présent' },
    absent: { icon: XCircle, bg: '#fef2f2', color: '#dc2626', label: 'Absent' },
    late: { icon: Clock, bg: '#fffbeb', color: '#f59e0b', label: 'Retard' },
    excused: { icon: AlertCircle, bg: '#eff6ff', color: '#3b82f6', label: 'Excusé' }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>Présences</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Suivez les absences et retards
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

      {/* Stats */}
      {attendanceStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard
            icon={CheckCircle}
            label="Présent"
            value={attendanceStats.present_days}
            color="#059669"
          />
          <StatCard
            icon={XCircle}
            label="Absent"
            value={attendanceStats.absent_days}
            color="#dc2626"
          />
          <StatCard
            icon={Clock}
            label="Retard"
            value={attendanceStats.late_days}
            color="#f59e0b"
          />
          <StatCard
            icon={AlertCircle}
            label="Excusé"
            value={attendanceStats.excused_days}
            color="#3b82f6"
          />
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: attendanceStats.attendance_rate >= 90 ? '#059669' : attendanceStats.attendance_rate >= 75 ? '#f59e0b' : '#dc2626' }}>
              {attendanceStats.attendance_rate.toFixed(0)}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Taux de présence</div>
          </div>
        </div>
      )}

      {/* Attendance record */}
      {attendanceRecords.length === 0 ? (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <Calendar size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucun enregistrement de présence</p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-background-secondary)' }}>
                <th style={{ padding: 14, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date</th>
                <th style={{ padding: 14, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Classe</th>
                <th style={{ padding: 14, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Statut</th>
                <th style={{ padding: 14, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Heure d'arrivée</th>
                <th style={{ padding: 14, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record) => {
                const config = statusConfig[record.status] || statusConfig.present
                const Icon = config.icon
                return (
                  <tr key={record.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: 14 }}>
                      <div style={{ fontWeight: 500 }}>{new Date(record.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                    </td>
                    <td style={{ padding: 14, color: 'var(--color-text-secondary)' }}>{record.class_name}</td>
                    <td style={{ padding: 14, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: config.bg,
                        color: config.color
                      }}>
                        <Icon size={14} />
                        {config.label}
                      </span>
                    </td>
                    <td style={{ padding: 14, color: 'var(--color-text-secondary)' }}>{record.arrival_time || '-'}</td>
                    <td style={{ padding: 14, color: 'var(--color-text-secondary)', fontSize: 13 }}>{record.notes || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={18} style={{ color }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}
