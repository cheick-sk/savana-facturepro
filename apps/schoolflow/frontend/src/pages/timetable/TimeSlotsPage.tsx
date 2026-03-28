import { Clock, Settings } from 'lucide-react'
import TimeSlotManager from '../../components/timetable/TimeSlotManager'

export default function TimeSlotsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Clock size={22} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Créneaux horaires</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Configurez les créneaux horaires pour l'emploi du temps
        </p>
      </div>

      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 20,
      }}>
        <TimeSlotManager />
      </div>
    </div>
  )
}
