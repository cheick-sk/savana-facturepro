import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X, Clock, Minus } from 'lucide-react'
import type { CalendarDay } from '../../store/attendance'

interface Props {
  calendar: CalendarDay[]
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
  loading?: boolean
}

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export default function AttendanceCalendar({ calendar, month, year, onMonthChange, loading }: Props) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  const goToPrevMonth = () => {
    if (month === 1) {
      onMonthChange(12, year - 1)
    } else {
      onMonthChange(month - 1, year)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      onMonthChange(1, year + 1)
    } else {
      onMonthChange(month + 1, year)
    }
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  // Create calendar grid with empty cells for days before the 1st
  const calendarGrid: (CalendarDay | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarGrid.push(null)
  }
  // Add the actual days
  for (let i = 1; i <= daysInMonth; i++) {
    const dayData = calendar.find(d => new Date(d.date).getDate() === i)
    calendarGrid.push(dayData || {
      date: `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      status: 'not_started' as const,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      total_students: 0
    })
  }

  return (
    <div>
      {/* Calendar Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <button onClick={goToPrevMonth} style={{ padding: 8 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ fontWeight: 500 }}>
          {MONTHS[month - 1]} {year}
        </div>
        <button onClick={goToNextMonth} style={{ padding: 8 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        marginBottom: 8
      }}>
        {WEEKDAYS.map(day => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            padding: '8px 0'
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4
      }}>
        {calendarGrid.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} style={{ aspectRatio: 1 }} />
          }

          const date = new Date(day.date)
          const dayNum = date.getDate()
          const isWeekend = date.getDay() === 0 // Sunday
          const isToday = new Date().toDateString() === date.toDateString()
          const isSelected = selectedDay?.date === day.date

          return (
            <div
              key={day.date}
              onClick={() => setSelectedDay(day)}
              style={{
                aspectRatio: 1,
                background: isWeekend 
                  ? 'var(--color-background-tertiary)' 
                  : isSelected 
                    ? 'var(--color-background-secondary)'
                    : 'var(--color-background-primary)',
                border: isToday 
                  ? '2px solid var(--color-text-primary)' 
                  : '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                padding: 6,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.15s'
              }}
            >
              <div style={{ 
                fontSize: 12, 
                fontWeight: isToday ? 600 : 400,
                color: isWeekend ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'
              }}>
                {dayNum}
              </div>
              
              {/* Status indicator */}
              {!isWeekend && day.total_students > 0 && (
                <div style={{ marginTop: 2 }}>
                  {day.status === 'completed' && (
                    <Check size={10} color="var(--color-text-success)" />
                  )}
                  {day.status === 'in_progress' && (
                    <Clock size={10} color="var(--color-text-warning)" />
                  )}
                  {day.status === 'not_started' && (
                    <Minus size={10} color="var(--color-text-tertiary)" />
                  )}
                </div>
              )}

              {/* Mini attendance bar */}
              {!isWeekend && day.total_students > 0 && (
                <div style={{
                  width: '80%',
                  height: 2,
                  background: 'var(--color-background-tertiary)',
                  borderRadius: 1,
                  marginTop: 4,
                  overflow: 'hidden',
                  display: 'flex'
                }}>
                  {day.present_count > 0 && (
                    <div style={{ 
                      width: `${day.present_count / day.total_students * 100}%`, 
                      background: 'var(--color-text-success)' 
                    }} />
                  )}
                  {day.late_count > 0 && (
                    <div style={{ 
                      width: `${day.late_count / day.total_students * 100}%`, 
                      background: 'var(--color-text-warning)' 
                    }} />
                  )}
                  {day.absent_count > 0 && (
                    <div style={{ 
                      width: `${day.absent_count / day.total_students * 100}%`, 
                      background: 'var(--color-text-danger)' 
                    }} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 16, 
        marginTop: 16,
        fontSize: 11,
        color: 'var(--color-text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={12} color="var(--color-text-success)" /> Terminé
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} color="var(--color-text-warning)" /> En cours
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Minus size={12} color="var(--color-text-tertiary)" /> Non commencé
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-md)'
        }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>
            {new Date(selectedDay.date).toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </div>
          
          {selectedDay.total_students > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-success)' }}>
                  {selectedDay.present_count}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Présents</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-danger)' }}>
                  {selectedDay.absent_count}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Absents</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-warning)' }}>
                  {selectedDay.late_count}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Retards</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {selectedDay.total_students}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Total</div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
              Aucune donnée de présence
            </div>
          )}
        </div>
      )}
    </div>
  )
}
