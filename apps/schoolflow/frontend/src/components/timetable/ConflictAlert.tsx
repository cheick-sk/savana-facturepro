import { useEffect, useState } from 'react'
import { AlertTriangle, X, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { useTimetableStore, TimetableConflict } from '../../store/timetable'
import toast from 'react-hot-toast'

const CONFLICT_TYPE_LABELS: Record<string, string> = {
  teacher_double_booking: 'Double réservation prof.',
  room_conflict: 'Conflit de salle',
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  error: {
    bg: 'var(--color-background-danger)',
    text: 'var(--color-text-danger)',
    border: 'var(--color-danger)',
  },
  warning: {
    bg: 'var(--color-background-warning)',
    text: 'var(--color-text-warning)',
    border: 'var(--color-warning)',
  },
}

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

interface ConflictAlertProps {
  showResolved?: boolean
}

export default function ConflictAlert({ showResolved = false }: ConflictAlertProps) {
  const { conflicts, conflictsLoading, fetchConflicts, resolveConflict, detectConflicts } = useTimetableStore()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    fetchConflicts(showResolved)
  }, [fetchConflicts, showResolved])

  const handleDetect = async () => {
    setDetecting(true)
    try {
      await detectConflicts()
      toast.success('Détection terminée')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    } finally {
      setDetecting(false)
    }
  }

  const handleResolve = async (conflictId: number, action: 'ignore' | 'swap' | 'delete_entry1' | 'delete_entry2') => {
    try {
      await resolveConflict(conflictId, action)
      toast.success('Conflit résolu')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    }
  }

  const getEntryDescription = (entry: any): string => {
    if (!entry) return '—'
    const day = DAY_NAMES[entry.day_of_week] || 'Jour'
    return `${entry.subject_name || 'Matière'} - ${entry.class_name || 'Classe'} (${day})`
  }

  if (conflicts.length === 0) {
    return (
      <div style={{
        background: 'var(--color-background-success)',
        border: '0.5px solid var(--color-success)',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <Check size={20} style={{ color: 'var(--color-success)' }} />
        <div>
          <div style={{ fontWeight: 500, color: 'var(--color-text-success)' }}>
            Aucun conflit détecté
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            L'emploi du temps est cohérent
          </div>
        </div>
        <button
          onClick={handleDetect}
          disabled={detecting}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 12,
          }}
        >
          <RefreshCw size={14} className={detecting ? 'animate-spin' : ''} />
          Vérifier
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
          Conflits détectés ({conflicts.length})
        </h3>
        <button
          onClick={handleDetect}
          disabled={detecting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 12,
          }}
        >
          <RefreshCw size={14} className={detecting ? 'animate-spin' : ''} />
          Redétecter
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conflicts.map((conflict) => {
          const colors = SEVERITY_COLORS[conflict.severity] || SEVERITY_COLORS.warning
          const isExpanded = expandedId === conflict.id

          return (
            <div
              key={conflict.id}
              style={{
                background: colors.bg,
                border: `0.5px solid ${colors.border}`,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedId(isExpanded ? null : conflict.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <AlertTriangle size={16} style={{ color: colors.text }} />
                  <div>
                    <div style={{ fontWeight: 500, color: colors.text }}>
                      {CONFLICT_TYPE_LABELS[conflict.conflict_type] || conflict.conflict_type}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {conflict.description || 'Aucune description'}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {isExpanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Entrées en conflit :</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 12, padding: '8px 12px', background: 'var(--color-background-primary)', borderRadius: 4 }}>
                        1. {getEntryDescription(conflict.entry1)}
                      </div>
                      <div style={{ fontSize: 12, padding: '8px 12px', background: 'var(--color-background-primary)', borderRadius: 4 }}>
                        2. {getEntryDescription(conflict.entry2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleResolve(conflict.id, 'ignore')}
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      Ignorer
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.id, 'swap')}
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      Échanger
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.id, 'delete_entry1')}
                      style={{ fontSize: 12, padding: '6px 12px', background: 'var(--color-danger)', color: 'white' }}
                    >
                      Supprimer 1
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.id, 'delete_entry2')}
                      style={{ fontSize: 12, padding: '6px 12px', background: 'var(--color-danger)', color: 'white' }}
                    >
                      Supprimer 2
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
