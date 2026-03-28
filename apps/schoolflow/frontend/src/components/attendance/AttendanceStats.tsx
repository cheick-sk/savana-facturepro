import { TrendingUp, TrendingDown, Users, Calendar, Clock, AlertTriangle, type LucideIcon } from 'lucide-react'
import type { ClassStats, StudentStats } from '../../store/attendance'

interface Props {
  stats: ClassStats | StudentStats | null
  loading?: boolean
  type?: 'class' | 'student'
}

export default function AttendanceStats({ stats, loading, type = 'class' }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)',
            padding: 16,
            height: 100,
            animation: 'pulse 1.5s infinite'
          }} />
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{
        background: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 32,
        textAlign: 'center',
        color: 'var(--color-text-secondary)'
      }}>
        Aucune donnée de présence disponible
      </div>
    )
  }

  const attendanceRate = stats.attendance_rate || 0
  const punctualityRate = stats.punctuality_rate || 0

  return (
    <div>
      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard
          icon={Calendar}
          label="Taux de présence"
          value={`${attendanceRate.toFixed(1)}%`}
          trend={attendanceRate >= 90 ? 'up' : attendanceRate >= 75 ? 'neutral' : 'down'}
          color={attendanceRate >= 90 ? 'success' : attendanceRate >= 75 ? 'warning' : 'danger'}
        />
        <StatCard
          icon={Clock}
          label="Taux de ponctualité"
          value={`${punctualityRate.toFixed(1)}%`}
          trend={punctualityRate >= 90 ? 'up' : 'neutral'}
          color={punctualityRate >= 90 ? 'success' : 'warning'}
        />
        <StatCard
          icon={Users}
          label="Jours présents"
          value={stats.present_days}
          subLabel={`sur ${stats.total_days} jours`}
          color="info"
        />
        <StatCard
          icon={AlertTriangle}
          label="Absences"
          value={stats.absent_days}
          subLabel={stats.late_days > 0 ? `+ ${stats.late_days} retards` : undefined}
          color="danger"
        />
      </div>

      {/* Progress Bars */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 16
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12, color: 'var(--color-text-secondary)' }}>
          Répartition des présences
        </div>
        
        <ProgressBar 
          label="Présents" 
          value={stats.present_days} 
          total={stats.total_days} 
          color="var(--color-text-success)" 
        />
        <ProgressBar 
          label="Retards" 
          value={stats.late_days} 
          total={stats.total_days} 
          color="var(--color-text-warning)" 
        />
        <ProgressBar 
          label="Excusés" 
          value={stats.excused_days} 
          total={stats.total_days} 
          color="var(--color-text-info)" 
        />
        <ProgressBar 
          label="Absents" 
          value={stats.absent_days} 
          total={stats.total_days} 
          color="var(--color-text-danger)" 
        />
      </div>

      {/* Consecutive Absences Alert (for student) */}
      {type === 'student' && 'consecutive_absences' in stats && stats.consecutive_absences > 0 && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: stats.consecutive_absences >= 3 ? 'var(--color-background-danger)' : 'var(--color-background-warning)',
          borderRadius: 'var(--border-radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: stats.consecutive_absences >= 3 ? 'var(--color-text-danger)' : 'var(--color-text-warning)'
        }}>
          <AlertTriangle size={16} />
          <span style={{ fontWeight: 500 }}>
            {stats.consecutive_absences} absence{stats.consecutive_absences > 1 ? 's' : ''} consécutive{stats.consecutive_absences > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'success' | 'warning' | 'danger' | 'info'
}

function StatCard({ icon: Icon, label, value, subLabel, trend, color = 'info' }: StatCardProps) {
  const colors = {
    success: 'var(--color-text-success)',
    warning: 'var(--color-text-warning)',
    danger: 'var(--color-text-danger)',
    info: 'var(--color-text-info)'
  }

  const bgColors = {
    success: 'var(--color-background-success)',
    warning: 'var(--color-background-warning)',
    danger: 'var(--color-background-danger)',
    info: 'var(--color-background-info)'
  }

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{
          padding: 8,
          background: bgColors[color],
          borderRadius: 8,
          color: colors[color]
        }}>
          <Icon size={16} />
        </div>
        {trend && (
          <div style={{ color: trend === 'up' ? 'var(--color-text-success)' : trend === 'down' ? 'var(--color-text-danger)' : 'var(--color-text-secondary)' }}>
            {trend === 'up' ? <TrendingUp size={14} /> : trend === 'down' ? <TrendingDown size={14} /> : null}
          </div>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: colors[color] }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
        {label}
        {subLabel && <span style={{ display: 'block', fontSize: 10, opacity: 0.7 }}>{subLabel}</span>}
      </div>
    </div>
  )
}

interface ProgressBarProps {
  label: string
  value: number
  total: number
  color: string
}

function ProgressBar({ label, value, total, color }: ProgressBarProps) {
  const percentage = total > 0 ? (value / total * 100) : 0

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 500 }}>{value} ({percentage.toFixed(0)}%)</span>
      </div>
      <div style={{
        height: 6,
        background: 'var(--color-background-tertiary)',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  )
}
