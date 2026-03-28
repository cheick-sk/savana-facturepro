import { useEffect, useState } from 'react'
import { Calendar, Users, Check, X, Clock, AlertCircle, ChevronLeft, ChevronRight, Filter, type LucideIcon } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import AttendanceStats from '../../components/attendance/AttendanceStats'
import AttendanceCalendar from '../../components/attendance/AttendanceCalendar'
import { useAttendanceStore, type ClassStats, type CalendarDay } from '../../store/attendance'

interface Class {
  id: number
  name: string
  level: string
}

export default function AttendanceHistoryPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<'calendar' | 'stats'>('calendar')
  
  const { 
    classStats, 
    calendar, 
    statsLoading, 
    calendarLoading,
    fetchClassStats, 
    fetchCalendar 
  } = useAttendanceStore()

  // Load classes
  useEffect(() => {
    api.get('/school/classes').then(r => {
      setClasses(r.data || [])
      if (r.data?.length > 0) {
        setSelectedClass(r.data[0])
      }
    }).catch(() => {
      toast.error('Erreur lors du chargement des classes')
    })
  }, [])

  // Load data when class/month changes
  useEffect(() => {
    if (selectedClass) {
      fetchClassStats(selectedClass.id)
      fetchCalendar(selectedClass.id, currentMonth, currentYear)
    }
  }, [selectedClass, currentMonth, currentYear])

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month)
    setCurrentYear(year)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Historique des Présences</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            Consulter l'historique et les statistiques
          </p>
        </div>
        
        {/* View Toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-background-secondary)', padding: 4, borderRadius: 'var(--border-radius-md)' }}>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'calendar' ? 'var(--color-background-primary)' : 'transparent',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Calendar size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Calendrier
          </button>
          <button
            onClick={() => setViewMode('stats')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'stats' ? 'var(--color-background-primary)' : 'transparent',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Filter size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Statistiques
          </button>
        </div>
      </div>

      {/* Class Selection */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: selectedClass?.id === cls.id 
                ? 'var(--color-background-secondary)' 
                : 'var(--color-background-primary)',
              border: selectedClass?.id === cls.id 
                ? '2px solid var(--color-text-primary)' 
                : '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Users size={14} />
            <span style={{ fontWeight: 500 }}>{cls.name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'stats' ? '1fr 1fr' : '1fr', gap: 16 }}>
        {viewMode === 'calendar' ? (
          <div style={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)',
            padding: 16
          }}>
            <AttendanceCalendar
              calendar={calendar}
              month={currentMonth}
              year={currentYear}
              onMonthChange={handleMonthChange}
              loading={calendarLoading}
            />
          </div>
        ) : (
          <>
            {/* Stats View */}
            <div style={{
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-lg)',
              padding: 16
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px 0' }}>
                Statistiques du mois
              </h3>
              <AttendanceStats stats={classStats} loading={statsLoading} type="class" />
            </div>

            {/* Sessions List */}
            <div style={{
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-lg)',
              padding: 16,
              maxHeight: 400,
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 16px 0' }}>
                Sessions du mois
              </h3>
              
              {calendar.filter(d => d.status !== 'not_started').length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 20 }}>
                  Aucune session ce mois
                </div>
              ) : (
                <div>
                  {calendar
                    .filter(d => d.status !== 'not_started')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(day => (
                      <div
                        key={day.date}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderBottom: '0.5px solid var(--color-border-tertiary)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {day.total_students} élèves
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Badge icon={Check} value={day.present_count} color="success" />
                          <Badge icon={Clock} value={day.late_count} color="warning" />
                          <Badge icon={X} value={day.absent_count} color="danger" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface BadgeProps {
  icon: LucideIcon
  value: number
  color: 'success' | 'warning' | 'danger'
}

function Badge({ icon: Icon, value, color }: BadgeProps) {
  const colors = {
    success: 'var(--color-text-success)',
    warning: 'var(--color-text-warning)',
    danger: 'var(--color-text-danger)'
  }

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 4, 
      fontSize: 12,
      color: colors[color]
    }}>
      <Icon size={12} />
      {value}
    </div>
  )
}
